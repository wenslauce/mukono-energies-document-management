"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase/provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Trash, Plus, Save, Send, Calendar, Loader2, CheckCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn, getDatabaseErrorDetails } from "@/lib/utils"
import { createDocumentWithItemsAdmin, updateDocumentWithItemsAdmin } from "@/lib/supabase/admin"
import { SuccessModal } from "@/components/ui/success-modal"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { Database } from "@/types/supabase"
import { CustomerSelector } from "./customer-selector"

interface CreditNoteItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  tax: number
  amount: number
}

interface CreditNoteFormProps {
  isEditing?: boolean
  existingDocument?: any
  existingItems?: any[]
}

// Define the form validation schema
const creditNoteFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  creditNoteNumber: z.string().min(1, "Credit note number is required"),
  creditNoteDate: z.date({
    required_error: "Credit note date is required",
  }),
  originalInvoiceNumber: z.string().optional(),
  originalInvoiceDate: z.date().optional(),
  currency: z.string().min(1, "Currency is required"),
  notes: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
})

export function CreditNoteForm({ isEditing = false, existingDocument, existingItems }: CreditNoteFormProps) {
  const router = useRouter()
  const { supabase, user, initializeUserProfile } = useSupabase()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  
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

  const form = useForm<z.infer<typeof creditNoteFormSchema>>({
    resolver: zodResolver(creditNoteFormSchema),
    defaultValues: {
      customerName: isEditing && existingDocument ? existingDocument.customer_name : "",
      customerEmail: isEditing && existingDocument?.data?.customer_email ? existingDocument.data.customer_email : "",
      customerAddress: isEditing && existingDocument?.data?.customer_address ? existingDocument.data.customer_address : "",
      creditNoteNumber: isEditing && existingDocument ? existingDocument.document_number : `CN-${Date.now().toString().slice(-6)}`,
      creditNoteDate: isEditing && existingDocument ? new Date(existingDocument.issue_date) : new Date(),
      originalInvoiceNumber: isEditing && existingDocument?.data?.original_invoice_number ? existingDocument.data.original_invoice_number : "",
      originalInvoiceDate: isEditing && existingDocument?.data?.original_invoice_date ? new Date(existingDocument.data.original_invoice_date) : new Date(),
      currency: isEditing && existingDocument ? existingDocument.currency : "UGX",
      notes: isEditing && existingDocument?.notes ? existingDocument.notes : "",
      reason: isEditing && existingDocument?.data?.reason ? existingDocument.data.reason : "Returned Goods",
    },
  })

  // Watch the currency field for formatting
  const currency = form.watch("currency");
  
  const [items, setItems] = useState<CreditNoteItem[]>([
    {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      tax: 0,
      amount: 0,
    },
  ])

  useEffect(() => {
    if (isEditing && existingItems && existingItems.length > 0) {
      setItems(existingItems);
    }
  }, [isEditing, existingItems]);

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

  const updateItem = (id: string, field: keyof CreditNoteItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }

          // Recalculate amount
          if (field === "quantity" || field === "unitPrice" || field === "tax") {
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

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }

  const calculateTaxTotal = () => {
    return items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice
      return sum + subtotal * (item.tax / 100)
    }, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxTotal()
  }

  // Add function to test database connection
  const testDatabaseConnection = async () => {
    try {
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please log in to continue",
          variant: "destructive",
        })
        return false
      }

      // Use admin client to test profile existence
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("id", user.id)
        .single()

      if (profileError) {
        console.error("Profile access error:", getDatabaseErrorDetails(profileError))
        
        // Check if this might be a missing profile issue
        if (profileError.code === "PGRST116") {
          // Profile doesn't exist - we'll create it
          return true 
        } else {
          // Other profile access errors
          toast({
            title: "Database access error",
            description: `Cannot access your profile: ${getDatabaseErrorDetails(profileError)}`,
            variant: "destructive",
          })
          return false
        }
      }

      return true
    } catch (error) {
      console.error("Database connection test error:", getDatabaseErrorDetails(error))
      toast({
        title: "Database connection error",
        description: `Failed to connect to the database: ${getDatabaseErrorDetails(error)}`,
        variant: "destructive",
      })
      return false
    }
  }

  // Add validation function for items
  const validateItems = () => {
    if (items.length === 0) {
      toast({
        title: "Items required",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return false;
    }

    if (items.some((item) => !item.description)) {
      toast({
        title: "Item description required",
        description: "Please provide a description for all items",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (values: z.infer<typeof creditNoteFormSchema>, status: "draft" | "final") => {
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

      // Check database connection
      const profileInitialized = await testDatabaseConnection();
      if (!profileInitialized) {
        const initialized = await initializeUserProfile(user);
        if (!initialized) {
          throw new Error("Failed to initialize your profile");
        }
      }

      // Process items
      const processedItems = items.map(item => {
        const subtotal = item.quantity * item.unitPrice;
        const taxAmount = subtotal * (item.tax / 100);
        return {
          id: item.id.includes('new-') ? undefined : item.id,
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

      // Type for document data
      type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
      
      // Create document data with proper typing
      const documentData: DocumentInsert = {
        user_id: user.id,
        type: "credit_note",
        status: status,
        document_number: values.creditNoteNumber,
        customer_name: values.customerName,
        total_amount: calculateTotal(),
        tax_amount: calculateTaxTotal(),
        currency: values.currency as "UGX" | "KES" | "USD",
        issue_date: values.creditNoteDate.toISOString(),
        due_date: null,
        notes: values.notes || null,
        terms: null,
        data: {
          customer_email: values.customerEmail || null,
          customer_address: values.customerAddress || null,
          credit_note_date: values.creditNoteDate.toISOString(),
          original_invoice_number: values.originalInvoiceNumber || null,
          original_invoice_date: values.originalInvoiceDate ? values.originalInvoiceDate.toISOString() : null,
          reason: values.reason,
          notes: values.notes || null,
          items: processedItems,
          subtotal: calculateSubtotal(),
          tax_total: calculateTaxTotal(),
        },
        is_deleted: false
      };

      // Determine if we're updating or creating
      let documentId: string;
      
      if (isEditing && existingDocument) {
        // Update existing document
        const { updateDocumentWithItemsAdmin } = await import('@/lib/supabase/admin');
        const result = await updateDocumentWithItemsAdmin(existingDocument.id, documentData, processedItems);
        
        if (!result.success) {
          throw result.error || new Error("Failed to update credit note");
        }

        documentId = existingDocument.id;
        
        toast({
          title: "Credit Note updated",
          description: `Credit Note ${values.creditNoteNumber} has been updated successfully`,
        });
        
        // Set success state
        setSubmissionState({
          isSubmitting: false,
          isSuccess: true,
          documentId: existingDocument.id,
          documentNumber: values.creditNoteNumber,
          redirectCountdown: 3
        });
      } else {
        // Create new document
        const { createDocumentWithItemsAdmin } = await import('@/lib/supabase/admin');
        const result = await createDocumentWithItemsAdmin(documentData, processedItems);
        
        if (!result.success) {
          throw result.error || new Error("Failed to create credit note");
        }
        
        if (!result.data || !result.data.documentId) {
          throw new Error("No document ID returned from creation");
        }
        
        documentId = result.data.documentId;
        
        toast({
          title: "Credit Note created",
          description: `Credit Note ${values.creditNoteNumber} has been ${status === "draft" ? "saved as draft" : "finalized"}`,
        });
      
        // Set success state
      setSubmissionState({
        isSubmitting: false,
        isSuccess: true,
          documentId: result.data.documentId,
        documentNumber: values.creditNoteNumber,
        redirectCountdown: 3
      });
      }
      
      // Set up redirect countdown
      let countdown = 3;
      const countdownInterval = setInterval(() => {
        countdown -= 1;
        setSubmissionState(prev => ({
          ...prev,
          redirectCountdown: countdown
        }));
        
        if (countdown <= 0) {
          clearInterval(countdownInterval);
          router.push(`/documents/${documentId}`);
        }
      }, 1000);
      
    } catch (error: any) {
      console.error("Error creating/updating credit note:", error);
      toast({
        title: "Error with credit note",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      
      setSubmissionState({
        isSubmitting: false,
        isSuccess: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Add function to handle modal closure
  const handleSuccessModalClose = () => {
    setSubmissionState(prev => ({
      ...prev,
      isSuccess: false
    }));
  };

  // Add function to handle modal action
  const handleSuccessModalAction = () => {
    if (submissionState.documentId) {
      router.push(`/documents/${submissionState.documentId}`);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer)
    if (customer) {
      form.setValue("customerName", customer.name || "")
      form.setValue("customerEmail", customer.email || "")
      form.setValue("customerAddress", customer.address || "")
      
      // If customer has a tax ID, set it too
      if (customer.tax_id) {
        form.setValue("customerTaxId", customer.tax_id)
      }
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit((values) => handleSubmit(values, "final"))}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
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
            <Input
              type="email"
              placeholder="customer@example.com"
                      {...field}
            />
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
            <Textarea
              placeholder="Enter customer address"
              rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
        <div className="space-y-4">
            <FormField
              control={form.control}
              name="creditNoteNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Note Number</FormLabel>
                  <FormControl>
            <Input
              placeholder="CN-000001"
                      {...field}
            />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="creditNoteDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Credit Note Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
            />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="originalInvoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Original Invoice Number</FormLabel>
                  <FormControl>
            <Input
              placeholder="Enter original invoice number"
                      {...field}
            />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="originalInvoiceDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Original Invoice Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
            />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
                    </FormControl>
              <SelectContent>
                <SelectItem value="UGX">Uganda Shillings (UGX)</SelectItem>
                <SelectItem value="KES">Kenya Shillings (KES)</SelectItem>
                <SelectItem value="USD">US Dollar (USD)</SelectItem>
              </SelectContent>
            </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Credit Note</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
                    </FormControl>
              <SelectContent>
                <SelectItem value="Returned Goods">Returned Goods</SelectItem>
                <SelectItem value="Pricing Error">Pricing Error</SelectItem>
                <SelectItem value="Damaged Goods">Damaged Goods</SelectItem>
                <SelectItem value="Cancelled Order">Cancelled Order</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Credit Note Items</h3>
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
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", Number.parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, "unitPrice", Number.parseFloat(e.target.value) || 0)}
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
                    <Input type="number" value={item.amount} readOnly className="text-right" />
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
                  {new Intl.NumberFormat(getCurrencyLocale(currency), {
                    style: "currency",
                    currency: currency,
                  }).format(calculateSubtotal())}
                </td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right font-medium">
                  Tax:
                </td>
                <td className="px-4 py-2 text-right">
                  {new Intl.NumberFormat(getCurrencyLocale(currency), {
                    style: "currency",
                    currency: currency,
                  }).format(calculateTaxTotal())}
                </td>
                <td></td>
              </tr>
              <tr className="font-bold">
                <td colSpan={4} className="px-4 py-2 text-right">
                  Total Credit:
                </td>
                <td className="px-4 py-2 text-right">
                  {new Intl.NumberFormat(getCurrencyLocale(currency), {
                    style: "currency",
                    currency: currency,
                  }).format(calculateTotal())}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
        <Textarea
          placeholder="Enter any additional notes"
          rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

      <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            onClick={() => form.handleSubmit((values) => handleSubmit(values, "draft"))()}
            variant="outline" 
            disabled={loading || submissionState.isSubmitting || submissionState.isSuccess}
          >
            {submissionState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
          Save as Draft
              </>
            )}
        </Button>
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
                Created! Redirecting in {submissionState.redirectCountdown}s
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Create Credit Note
              </>
            )}
        </Button>
      </div>
      </form>
      
      {/* Success Modal */}
      <SuccessModal
        isOpen={submissionState.isSuccess}
        onClose={handleSuccessModalClose}
        title={isEditing ? "Credit Note Updated!" : "Credit Note Created!"}
        message={`${isEditing ? "Your credit note has been updated" : "Your credit note has been created"} successfully.`}
        redirectCountdown={submissionState.redirectCountdown}
        redirectMessage="Redirecting to credit note in"
        actionLabel="View Credit Note"
        onAction={handleSuccessModalAction}
      />
    </Form>
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

