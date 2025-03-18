"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase/provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Trash, Plus, Save, Send, AlertCircle, Calendar, Loader2, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { cn, createDocumentWithItems, getDatabaseErrorDetails } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { createDocumentWithItemsAdmin, updateDocumentWithItemsAdmin } from "@/lib/supabase/admin"
import { supabaseAdmin, diagnoseDatabaseIssues } from "@/lib/supabase/admin"
import { SuccessModal } from "@/components/ui/success-modal"
import { CustomerSelector } from "./customer-selector"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  tax: number
  amount: number
}

interface InvoiceFormProps {
  isEditing?: boolean
  existingDocument?: any
  existingItems?: InvoiceItem[]
}

// Define the form validation schema
const invoiceFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.date({
    required_error: "Invoice date is required",
  }),
  dueDate: z.date({
    required_error: "Due date is required",
  }),
  currency: z.string().min(1, "Currency is required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
})

export function InvoiceForm({ isEditing = false, existingDocument, existingItems }: InvoiceFormProps) {
  const router = useRouter()
  const { supabase, user, initializeUserProfile } = useSupabase()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      tax: 0,
      amount: 0,
    },
  ])
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

  // Initialize the form with default values or existing document values
  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customerName: isEditing && existingDocument ? existingDocument.customer_name : "",
      customerEmail: isEditing && existingDocument?.data?.customer_email ? existingDocument.data.customer_email : "",
      customerAddress: isEditing && existingDocument?.data?.customer_address ? existingDocument.data.customer_address : "",
      invoiceNumber: isEditing && existingDocument ? existingDocument.document_number : `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: isEditing && existingDocument ? new Date(existingDocument.issue_date) : new Date(),
      dueDate: isEditing && existingDocument?.due_date ? new Date(existingDocument.due_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: isEditing && existingDocument ? existingDocument.currency : "UGX",
      notes: isEditing && existingDocument?.notes ? existingDocument.notes : "",
      terms: isEditing && existingDocument?.terms ? existingDocument.terms : "Payment is due within 30 days of invoice date.",
    },
  })

  // Load existing items if editing
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

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
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

  const validateItems = () => {
    if (items.length === 0) {
      toast({
        title: "Items required",
        description: "Please add at least one item",
        variant: "destructive",
      })
      return false
    }

    if (items.some((item) => !item.description)) {
      toast({
        title: "Item description required",
        description: "Please provide a description for all items",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  // Update the test database connection function
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
          // Profile doesn't exist - we'll use the initializeUserProfile function
          // that uses the admin client to create it
          console.log("Profile does not exist, will create with admin API")
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

      // Test direct access to documents with admin client
      try {
        // Test documents table access with a simple query
        const { error: documentsError } = await supabaseAdmin
          .from("documents")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)

        if (documentsError) {
          console.error("Documents access error:", getDatabaseErrorDetails(documentsError))
          toast({
            title: "Database access error",
            description: `Cannot access documents: ${getDatabaseErrorDetails(documentsError)}`,
            variant: "destructive",
          })
          return false
        }
      } catch (docError) {
        console.error("Document access error:", getDatabaseErrorDetails(docError))
        toast({
          title: "Database access error",
          description: "Cannot access documents table. Please contact support.",
          variant: "destructive",
        })
        return false
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

  // Add diagnostic function
  const runDiagnostics = async () => {
    toast({
      title: "Running diagnostics...",
      description: "Checking database connections and permissions",
    })

    try {
      const diagnosticResult = await diagnoseDatabaseIssues(user?.id)
      
      if (diagnosticResult.success) {
        toast({
          title: "Diagnostics passed",
          description: diagnosticResult.message,
        })
      } else {
        console.error("Diagnostic issues:", diagnosticResult.issues)
        toast({
          title: "Diagnostics failed",
          description: `Issues found: ${diagnosticResult.issues.join("; ")}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error running diagnostics:", error)
      toast({
        title: "Diagnostic error",
        description: "Failed to run diagnostics",
        variant: "destructive",
      })
    }
  }

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer)
    if (customer) {
      form.setValue("customerEmail", customer.email || "")
      form.setValue("customerAddress", customer.address || "")
    }
  }

  const handleSubmit = async (values: z.infer<typeof invoiceFormSchema>, status: "draft" | "final") => {
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

      const itemsData = items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.tax,
        amount: item.amount,
      }))

      const documentData = {
        user_id: user!.id,
        customer_id: selectedCustomer?.id || null,
        type: "invoice" as const,
        status,
        document_number: values.invoiceNumber,
        customer_name: values.customerName,
        issue_date: values.invoiceDate.toISOString().split("T")[0],
        due_date: values.dueDate.toISOString().split("T")[0],
        total_amount: calculateTotal(),
        tax_amount: calculateTaxTotal(),
        currency: values.currency,
        notes: values.notes || null,
        terms: values.terms || null,
        data: {
          customer_email: values.customerEmail || null,
          customer_address: values.customerAddress || null,
        },
      }

      // Determine if we're updating or creating
      if (isEditing && existingDocument) {
        // Update existing document
        const { updateDocumentWithItemsAdmin } = await import('@/lib/supabase/admin');
        const result = await updateDocumentWithItemsAdmin(existingDocument.id, documentData, itemsData);
        
        if (!result.success) {
          throw result.error || new Error("Failed to update invoice");
        }
        
        // Show success message
        toast({
          title: "Invoice updated",
          description: `Invoice ${values.invoiceNumber} has been updated successfully`,
        });
        
        // Set success state
        setSubmissionState({
          isSubmitting: false,
          isSuccess: true,
          documentId: existingDocument.id,
          documentNumber: values.invoiceNumber,
          redirectCountdown: 3
        });
      } else {
        // Create new document
        const { createDocumentWithItemsAdmin } = await import('@/lib/supabase/admin');
        const result = await createDocumentWithItemsAdmin(documentData, itemsData);
        
        if (!result.success) {
          throw result.error || new Error("Failed to create invoice");
        }
        
        if (!result.data || !result.data.documentId) {
          throw new Error("No document ID returned from creation");
        }
        
        // Show success message
        toast({
          title: "Invoice created",
          description: `Invoice ${values.invoiceNumber} has been ${status === "draft" ? "saved as draft" : "finalized"}`,
        });
        
        // Set success state
        setSubmissionState({
          isSubmitting: false,
          isSuccess: true,
          documentId: result.data.documentId,
          documentNumber: values.invoiceNumber,
          redirectCountdown: 3
        });
      }
    } catch (error: any) {
      console.error("Error with invoice operation:", error);
      
      // Show error message
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} invoice`,
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

  // Check if there are any items with empty descriptions
  const hasEmptyItems = items.some((item) => !item.description)

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Customer & Invoice Details</TabsTrigger>
              <TabsTrigger value="items">
                Items & Totals
                {hasEmptyItems && <AlertCircle className="ml-2 h-4 w-4 text-destructive" />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-6 md:grid-cols-2">
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

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Invoice Details</h3>

                      <FormField
                        control={form.control}
                        name="invoiceNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invoice Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="INV-000001" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="invoiceDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Invoice Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground",
                                      )}
                                    >
                                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Due Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground",
                                      )}
                                    >
                                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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
                            <Select value={field.value} onValueChange={field.onChange}>
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
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Additional Information</h3>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Enter any additional notes or payment instructions"
                              rows={3}
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
                            <Textarea {...field} placeholder="Enter terms and conditions" rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="button" onClick={() => setActiveTab("items")} className="w-full sm:w-auto">
                  Continue to Items
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="items" className="mt-4 space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Invoice Items</h3>
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
                </CardContent>
              </Card>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
                <Button
                  type="button"
                  onClick={() => setActiveTab("details")}
                  variant="outline"
                  className="mt-2 sm:mt-0"
                >
                  Back to Details
                </Button>

                <div className="flex flex-col sm:flex-row gap-2">
                  {process.env.NODE_ENV === "development" && (
                    <>
                      <Button
                        type="button"
                        onClick={testDatabaseConnection}
                        variant="outline"
                        className="flex-1"
                        disabled={submissionState.isSubmitting || submissionState.isSuccess}
                      >
                        Test DB Connection
                      </Button>
                      <Button
                        type="button"
                        onClick={runDiagnostics}
                        variant="outline"
                        className="flex-1"
                        disabled={submissionState.isSubmitting || submissionState.isSuccess}
                      >
                        Run Diagnostics
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    onClick={() => form.handleSubmit((values) => handleSubmit(values, "draft"))()}
                    variant="outline"
                    disabled={loading || submissionState.isSubmitting || submissionState.isSuccess}
                    className="flex-1"
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
                    type="button"
                    onClick={() => form.handleSubmit((values) => handleSubmit(values, "final"))()}
                    disabled={loading || submissionState.isSubmitting || submissionState.isSuccess}
                    className="flex-1"
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
                        Create Invoice
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>

      {/* Success Modal */}
      <SuccessModal
        isOpen={submissionState.isSuccess}
        onClose={handleSuccessModalClose}
        title={isEditing ? "Invoice Updated!" : "Invoice Created!"}
        message={`${isEditing ? "Your invoice has been updated" : "Your invoice has been created"} successfully.`}
        redirectCountdown={submissionState.redirectCountdown}
        redirectMessage="Redirecting to invoice in"
        actionLabel="View Invoice"
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

