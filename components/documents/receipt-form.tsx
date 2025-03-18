"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase/provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Trash, Plus, Save, Send, Loader2, CheckCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn, getDatabaseErrorDetails } from "@/lib/utils"
import { SuccessModal } from "@/components/ui/success-modal"
import { CustomerSelector } from "./customer-selector"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface ReceiptItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  tax: number
  amount: number
}

interface ReceiptFormProps {
  isEditing?: boolean
  existingDocument?: any
  existingItems?: ReceiptItem[]
}

// Define the form validation schema
const receiptFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  receiptNumber: z.string().min(1, "Receipt number is required"),
  receiptDate: z.date({
    required_error: "Receipt date is required",
  }),
  paymentMethod: z.string().min(1, "Payment method is required"),
  currency: z.string().min(1, "Currency is required"),
  notes: z.string().optional(),
  reference: z.string().optional(),
})

export function ReceiptForm({ isEditing = false, existingDocument, existingItems }: ReceiptFormProps) {
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [items, setItems] = useState<ReceiptItem[]>([
    {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      tax: 0,
      amount: 0,
    },
  ])

  // Add submission state tracking
  const [submissionState, setSubmissionState] = useState<{
    isSubmitting: boolean;
    isSuccess: boolean;
    documentId?: string;
    documentNumber?: string;
    redirectCountdown?: number;
  }>({
    isSubmitting: false,
    isSuccess: false
  });

  // Initialize the form with default values or existing document values
  const form = useForm<z.infer<typeof receiptFormSchema>>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: {
      customerName: isEditing && existingDocument ? existingDocument.customer_name : "",
      customerEmail: isEditing && existingDocument?.data?.customer_email ? existingDocument.data.customer_email : "",
      customerAddress: isEditing && existingDocument?.data?.customer_address ? existingDocument.data.customer_address : "",
      receiptNumber: isEditing && existingDocument ? existingDocument.document_number : `RCT-${Date.now().toString().slice(-6)}`,
      receiptDate: isEditing && existingDocument ? new Date(existingDocument.issue_date) : new Date(),
      currency: isEditing && existingDocument ? existingDocument.currency : "UGX",
      notes: isEditing && existingDocument?.notes ? existingDocument.notes : "",
      paymentMethod: isEditing && existingDocument?.data?.payment_method ? existingDocument.data.payment_method : "Cash",
      reference: isEditing && existingDocument?.data?.reference ? existingDocument.data.reference : "",
    },
  })

  // Load existing items if editing
  useEffect(() => {
    if (isEditing && existingItems && existingItems.length > 0) {
      setItems(existingItems);
    }
  }, [isEditing, existingItems]);

  // Handle customer selection
  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer)
    if (customer) {
      form.setValue("customerName", customer.name || "")
      form.setValue("customerEmail", customer.email || "")
      form.setValue("customerAddress", customer.address || "")
    }
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        tax: 0,
        amount: 0,
      },
    ])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof ReceiptItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }

          // Recalculate amount if it's not being directly set
          if (field !== "amount" && (field === "quantity" || field === "unitPrice" || field === "tax")) {
            const quantity = field === "quantity" ? value : item.quantity
            const unitPrice = field === "unitPrice" ? value : item.unitPrice
            const tax = field === "tax" ? value : item.tax

            const subtotal = quantity * unitPrice
            const taxAmount = subtotal * (tax / 100)
            updatedItem.amount = subtotal + taxAmount
          }

          return updatedItem
        }
        return item
      }),
    )
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0)
  }

  const calculateTaxTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.tax / 100)), 0)
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  }

  const validateItems = () => {
    if (items.length === 0 || items.some((item) => !item.description)) {
      toast({
        title: "Items required",
        description: "Please add at least one item with a description",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const handleSubmit = async (values: z.infer<typeof receiptFormSchema>) => {
    // Prevent multiple submissions
    if (submissionState.isSubmitting) {
      return;
    }
    
    // Validate items first
    if (!validateItems()) return;
    
    // Set loading states
    setSubmissionState({
      isSubmitting: true,
      isSuccess: false
    });
    setLoading(true);

    try {
      // Check authentication
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Process items for database
      const processedItems = items.map(item => {
        const subtotal = item.quantity * item.unitPrice;
        const taxAmount = subtotal * (item.tax / 100);
        return {
          id: item.id.includes('new-') ? undefined : item.id, // Keep existing IDs, remove temporary ones
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.tax,
          tax_amount: taxAmount,
          discount_rate: 0,
          discount_amount: 0,
          amount: subtotal + taxAmount
        };
      });

      // Make sure we have a valid date object
      const receiptDate = values.receiptDate instanceof Date 
        ? values.receiptDate 
        : new Date(values.receiptDate);

      // Prepare document data
      const documentData = {
        user_id: user.id,
        type: "receipt",
        status: "final",
        document_number: values.receiptNumber,
        customer_name: values.customerName,
        total_amount: calculateTotal(),
        tax_amount: calculateTaxTotal(),
        currency: values.currency as "UGX" | "KES" | "USD",
        issue_date: receiptDate.toISOString(),
        due_date: null,
        notes: values.notes || null,
        terms: null,
        data: {
          customer_email: values.customerEmail || null,
          customer_address: values.customerAddress || null,
          receipt_date: receiptDate.toISOString(),
          payment_method: values.paymentMethod,
          reference: values.reference || null,
          notes: values.notes || null,
          items: processedItems,
          subtotal: calculateSubtotal(),
          tax_total: calculateTaxTotal(),
        },
        is_deleted: false
      };

      // Determine if we're updating or creating
      if (isEditing && existingDocument) {
        // Update existing document
        const { updateDocumentWithItemsAdmin } = await import('@/lib/supabase/admin');
        const result = await updateDocumentWithItemsAdmin(existingDocument.id, documentData, processedItems);
        
        if (!result.success) {
          throw result.error || new Error("Failed to update receipt");
        }
        
        // Show success message
        toast({
          title: "Receipt updated",
          description: `Receipt ${values.receiptNumber} has been updated successfully`,
        });
        
        // Set success state
        setSubmissionState({
          isSubmitting: false,
          isSuccess: true,
          documentId: existingDocument.id,
          documentNumber: values.receiptNumber,
          redirectCountdown: 3
        });
      } else {
        // Create new document
        const { createDocumentWithItemsAdmin } = await import('@/lib/supabase/admin');
        const result = await createDocumentWithItemsAdmin(documentData, processedItems);
        
        if (!result.success) {
          throw result.error || new Error("Failed to create receipt");
        }
        
        if (!result.data || !result.data.documentId) {
          throw new Error("No document ID returned from creation");
        }
        
        // Show success message
        toast({
          title: "Receipt created",
          description: `Receipt ${values.receiptNumber} has been created successfully`,
        });
        
        // Set success state
        setSubmissionState({
          isSubmitting: false,
          isSuccess: true,
          documentId: result.data.documentId,
          documentNumber: values.receiptNumber,
          redirectCountdown: 3
        });
      }
    } catch (error: any) {
      console.error("Error with receipt operation:", error);
      
      // Show error message
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} receipt`,
        description: getDatabaseErrorDetails(error) || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      
      // Reset submission state
      setSubmissionState({
        isSubmitting: false,
        isSuccess: false
      });
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  // Handle redirect after successful submission
  const handleSuccessModalClose = () => {
    setSubmissionState(prev => ({
      ...prev,
      isSuccess: false
    }));
  };

  const handleSuccessModalAction = () => {
    if (submissionState.documentId) {
      router.push(`/documents/${submissionState.documentId}`);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Customer Information</h3>

                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <FormControl>
                        <CustomerSelector 
                          value={field.value} 
                          onChange={field.onChange}
                          onCustomerSelect={handleCustomerSelect}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="customer@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Enter customer address" rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptNumber">Receipt Number</Label>
                <Input
                  id="receiptNumber"
                  {...form.register("receiptNumber")}
                  placeholder="RCT-000001"
                  required
                />
                {form.formState.errors.receiptNumber && (
                  <p className="text-sm text-destructive">{form.formState.errors.receiptNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptDate">Receipt Date</Label>
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.getValues("receiptDate") && "text-muted-foreground"
                        )}
                      >
                        {form.getValues("receiptDate") ? (
                          format(form.getValues("receiptDate"), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={form.getValues("receiptDate")}
                        onSelect={(date) => form.setValue("receiptDate", date as Date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {form.formState.errors.receiptDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.receiptDate.message}</p>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={form.getValues("currency")} 
                    onValueChange={(value) => form.setValue("currency", value)}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UGX">Uganda Shillings (UGX)</SelectItem>
                      <SelectItem value="KES">Kenya Shillings (KES)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.currency && (
                    <p className="text-sm text-destructive">{form.formState.errors.currency.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select 
                    value={form.getValues("paymentMethod")} 
                    onValueChange={(value) => form.setValue("paymentMethod", value)}
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      <SelectItem value="Check">Check</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.paymentMethod && (
                    <p className="text-sm text-destructive">{form.formState.errors.paymentMethod.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  {...form.register("reference")}
                  placeholder="Transaction reference or check number"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Receipt Items</h3>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Description</th>
                    <th className="px-4 py-2 text-right font-medium">Quantity</th>
                    <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-2 text-right font-medium">Tax %</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                    <th className="px-4 py-2 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-2">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          placeholder="Item description"
                          className={cn(!item.description && "border-destructive")}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, "quantity", Number.parseFloat(e.target.value) || 0)
                          }
                          className="text-right"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(item.id, "unitPrice", Number.parseFloat(e.target.value) || 0)
                          }
                          className="text-right"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.tax}
                          onChange={(e) => updateItem(item.id, "tax", Number.parseFloat(e.target.value) || 0)}
                          className="text-right"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" value={item.amount} readOnly className="text-right bg-muted/50" />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          variant="ghost"
                          size="icon"
                          disabled={items.length === 1}
                        >
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Remove item</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td colSpan={4} className="px-4 py-2 text-right font-medium">
                      Subtotal:
                    </td>
                    <td className="px-4 py-2 text-right">
                      {new Intl.NumberFormat(getCurrencyLocale(form.getValues("currency")), {
                        style: "currency",
                        currency: form.getValues("currency"),
                      }).format(calculateSubtotal())}
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right font-medium">
                      Tax:
                    </td>
                    <td className="px-4 py-2 text-right">
                      {new Intl.NumberFormat(getCurrencyLocale(form.getValues("currency")), {
                        style: "currency",
                        currency: form.getValues("currency"),
                      }).format(calculateTaxTotal())}
                    </td>
                    <td></td>
                  </tr>
                  <tr className="font-bold">
                    <td colSpan={4} className="px-4 py-2 text-right">
                      Total:
                    </td>
                    <td className="px-4 py-2 text-right">
                      {new Intl.NumberFormat(getCurrencyLocale(form.getValues("currency")), {
                        style: "currency",
                        currency: form.getValues("currency"),
                      }).format(calculateTotal())}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              placeholder="Enter any additional notes"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="submit"
              disabled={loading || submissionState.isSubmitting || submissionState.isSuccess}
            >
              {submissionState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : submissionState.isSuccess ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Created!
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Create Receipt
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Success Modal */}
      <SuccessModal
        isOpen={submissionState.isSuccess}
        onClose={handleSuccessModalClose}
        title={isEditing ? "Receipt Updated!" : "Receipt Created!"}
        message={`${isEditing ? "Your receipt has been updated" : "Your receipt has been created"} successfully.`}
        redirectCountdown={submissionState.redirectCountdown}
        redirectMessage="Redirecting to receipt in"
        actionLabel="View Receipt"
        onAction={handleSuccessModalAction}
      />
    </div>
  )
}

function getCurrencyLocale(currency: string) {
  switch (currency) {
    case "KES":
      return "en-KE"
    case "UGX":
      return "en-UG"
    case "USD":
      return "en-US"
    default:
      return "en-US"
  }
}

