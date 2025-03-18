"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase/provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Trash, Plus, Save, Send, AlertCircle, Calendar, Loader2, CheckCircle } from "lucide-react"
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

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  tax: number
  amount: number
}

interface QuoteFormProps {
  isEditing?: boolean
  existingDocument?: any
  existingItems?: any[]
}

// Define the form validation schema
const quoteFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  quoteNumber: z.string().min(1, "Quote number is required"),
  quoteDate: z.date({
    required_error: "Quote date is required",
  }),
  validUntil: z.date({
    required_error: "Valid until date is required",
  }),
  currency: z.string().min(1, "Currency is required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
})

export function QuoteForm({ isEditing = false, existingDocument, existingItems }: QuoteFormProps) {
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

  const form = useForm<z.infer<typeof quoteFormSchema>>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      customerName: isEditing && existingDocument ? existingDocument.customer_name : "",
      customerEmail: isEditing && existingDocument?.data?.customer_email ? existingDocument.data.customer_email : "",
      customerAddress: isEditing && existingDocument?.data?.customer_address ? existingDocument.data.customer_address : "",
      quoteNumber: isEditing && existingDocument ? existingDocument.document_number : `QT-${Date.now().toString().slice(-6)}`,
      quoteDate: isEditing && existingDocument ? new Date(existingDocument.issue_date) : new Date(),
      validUntil: isEditing && existingDocument?.due_date ? new Date(existingDocument.due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: isEditing && existingDocument ? existingDocument.currency : "UGX",
      notes: isEditing && existingDocument?.notes ? existingDocument.notes : "",
      terms: isEditing && existingDocument?.terms ? existingDocument.terms : "This quote is valid for 30 days from the date of issue.",
    },
  })

  // Watch the currency field for formatting
  const currency = form.watch("currency");
  
  const [items, setItems] = useState<QuoteItem[]>([
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

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
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

  const handleSubmit = async (values: z.infer<typeof quoteFormSchema>, status: "draft" | "final") => {
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
        type: "quote",
        status: status,
        document_number: values.quoteNumber,
        customer_name: values.customerName,
        total_amount: calculateTotal(),
        tax_amount: calculateTaxTotal(),
        currency: values.currency as "UGX" | "KES" | "USD",
        issue_date: values.quoteDate.toISOString(),
        due_date: values.validUntil.toISOString(),
        notes: values.notes || null,
        terms: values.terms || null,
        data: {
          customer_email: values.customerEmail || null,
          customer_address: values.customerAddress || null,
          quote_date: values.quoteDate.toISOString(),
          valid_until: values.validUntil.toISOString(),
          notes: values.notes || null,
          terms: values.terms || null,
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
          throw result.error || new Error("Failed to update quote");
        }

        documentId = existingDocument.id;
        
        toast({
          title: "Quote updated",
          description: `Quote ${values.quoteNumber} has been updated successfully`,
        });
        
        // Set success state
        setSubmissionState({
          isSubmitting: false,
          isSuccess: true,
          documentId: existingDocument.id,
          documentNumber: values.quoteNumber,
          redirectCountdown: 3
        });
      } else {
        // Create new document
        const { createDocumentWithItemsAdmin } = await import('@/lib/supabase/admin');
        const result = await createDocumentWithItemsAdmin(documentData, processedItems);
        
        if (!result.success) {
          throw result.error || new Error("Failed to create quote");
        }
        
        if (!result.data || !result.data.documentId) {
          throw new Error("No document ID returned from creation");
        }
        
        documentId = result.data.documentId;
        
        toast({
          title: "Quote created",
          description: `Quote ${values.quoteNumber} has been ${status === "draft" ? "saved as draft" : "finalized"}`,
        });
      
        // Set success state
      setSubmissionState({
        isSubmitting: false,
        isSuccess: true,
          documentId: result.data.documentId,
        documentNumber: values.quoteNumber,
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
      console.error("Error creating/updating quote:", error);
      toast({
        title: "Error with quote",
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
              name="quoteNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quote Number</FormLabel>
                  <FormControl>
            <Input
              placeholder="QT-000001"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
          <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="quoteDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Quote Date</FormLabel>
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
                name="validUntil"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Valid Until</FormLabel>
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
            </div>
            
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
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Quote Items</h3>
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
                  Total:
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

        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Terms and Conditions</FormLabel>
              <FormControl>
        <Textarea
          placeholder="Enter terms and conditions"
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
              Create Quote
            </>
          )}
        </Button>
      </div>
      </form>
      
      {/* Success Modal */}
      <SuccessModal
        isOpen={submissionState.isSuccess}
        onClose={handleSuccessModalClose}
        title={isEditing ? "Quote Updated!" : "Quote Created!"}
        message={`${isEditing ? "Your quote has been updated" : "Your quote has been created"} successfully.`}
        redirectCountdown={submissionState.redirectCountdown}
        redirectMessage="Redirecting to quote in"
        actionLabel="View Quote"
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

