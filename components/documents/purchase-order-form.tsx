"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase/provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Trash, Plus } from "lucide-react"
import { CustomerSelector } from "./customer-selector"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface PurchaseOrderItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  tax: number
  amount: number
}

// Define the form validation schema
const purchaseOrderFormSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  vendorEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  vendorAddress: z.string().optional(),
  poNumber: z.string().min(1, "PO number is required"),
  poDate: z.string().min(1, "PO date is required"),
  expectedDeliveryDate: z.string(),
  shippingAddress: z.string().optional(),
  paymentTerms: z.string(),
  currency: z.string().min(1, "Currency is required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
})

export function PurchaseOrderForm() {
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  
  const form = useForm<z.infer<typeof purchaseOrderFormSchema>>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      vendorName: "",
      vendorEmail: "",
      vendorAddress: "",
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
      poDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      shippingAddress: "",
      paymentTerms: "Net 30",
      currency: "UGX",
      notes: "",
      terms: "Standard terms and conditions apply.",
    },
  })
  
  const [shippingCost, setShippingCost] = useState(0)
  const [items, setItems] = useState<PurchaseOrderItem[]>([
    {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      tax: 0,
      amount: 0,
    },
  ])
  
  // Add a form watcher for values we need to access directly in the JSX
  const values = form.watch();

  // Handle vendor selection
  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer)
    if (customer) {
      form.setValue("vendorName", customer.name || "")
      form.setValue("vendorEmail", customer.email || "")
      form.setValue("vendorAddress", customer.address || "")
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

  const updateItem = (id: string, field: keyof PurchaseOrderItem, value: any) => {
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
    return calculateSubtotal() + calculateTaxTotal() + shippingCost
  }

  const handleSubmit = async (status: "draft" | "final") => {
    // First validate the form
    try {
      await form.trigger()
      if (!form.formState.isValid) {
        console.log("Form errors:", form.formState.errors)
        toast({
          title: "Validation Error",
          description: "Please check the form for errors.",
          variant: "destructive",
        })
        return
      }
      
      const values = form.getValues()
      
      if (!values.vendorName) {
        toast({
          title: "Vendor name required",
          description: "Please enter a vendor name",
          variant: "destructive",
        })
        return
      }

      if (items.length === 0 || items.some((item) => !item.description)) {
        toast({
          title: "Items required",
          description: "Please add at least one item with a description",
          variant: "destructive",
        })
        return
      }

      setLoading(true)

      try {
        const { data, error } = await supabase
          .from("documents")
          .insert({
            user_id: user!.id,
            type: "purchase_order",
            status,
            document_number: values.poNumber,
            customer_name: values.vendorName, // Using customer_name field for vendor
            total_amount: calculateTotal() - shippingCost, // Store without shipping in total_amount
            currency: values.currency,
            due_date: values.expectedDeliveryDate,
            data: {
              customer_email: values.vendorEmail, // Using customer_email field for vendor
              customer_address: values.vendorAddress, // Using customer_address field for vendor
              po_date: values.poDate,
              shipping_address: values.shippingAddress,
              payment_terms: values.paymentTerms,
              shipping_cost: shippingCost,
              notes: values.notes,
              terms: values.terms,
              items,
              subtotal: calculateSubtotal(),
              tax_total: calculateTaxTotal(),
            },
          })
          .select()

        if (error) {
          throw error
        }

        toast({
          title: "Purchase Order created",
          description: `Purchase Order ${values.poNumber} has been ${status === "draft" ? "saved as draft" : "finalized"}`,
        })

        router.push(`/documents/${data[0].id}`)
      } catch (error: any) {
        toast({
          title: "Error creating purchase order",
          description: error.message || "Something went wrong",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: "Error",
        description: "Failed to create purchase order. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Vendor Information</h3>
            
            <FormField
              control={form.control}
              name="vendorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
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
              name="vendorEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="vendor@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="vendorAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Address</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter vendor address" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="poNumber">PO Number</Label>
              <Input
                id="poNumber"
                value={values.poNumber}
                onChange={(e) => form.setValue("poNumber", e.target.value)}
                placeholder="PO-000001"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poDate">PO Date</Label>
                <Input id="poDate" type="date" value={values.poDate} onChange={(e) => form.setValue("poDate", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                <Input
                  id="expectedDeliveryDate"
                  type="date"
                  value={values.expectedDeliveryDate}
                  onChange={(e) => form.setValue("expectedDeliveryDate", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={values.currency} onValueChange={(value) => form.setValue("currency", value)}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UGX">Uganda Shillings (UGX)</SelectItem>
                    <SelectItem value="KES">Kenya Shillings (KES)</SelectItem>
                    <SelectItem value="USD">US Dollar (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Select value={values.paymentTerms} onValueChange={(value) => form.setValue("paymentTerms", value)}>
                  <SelectTrigger id="paymentTerms">
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 45">Net 45</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                    <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                    <SelectItem value="50% Advance">50% Advance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shippingCost">Shipping Cost</Label>
              <Input
                id="shippingCost"
                type="number"
                min="0"
                step="0.01"
                value={shippingCost}
                onChange={(e) => setShippingCost(Number.parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Purchase Order Items</h3>
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
                    {new Intl.NumberFormat(getCurrencyLocale(values.currency), {
                      style: "currency",
                      currency: values.currency,
                    }).format(calculateSubtotal())}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right font-medium">
                    Tax:
                  </td>
                  <td className="px-4 py-2 text-right">
                    {new Intl.NumberFormat(getCurrencyLocale(values.currency), {
                      style: "currency",
                      currency: values.currency,
                    }).format(calculateTaxTotal())}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right font-medium">
                    Shipping:
                  </td>
                  <td className="px-4 py-2 text-right">
                    {new Intl.NumberFormat(getCurrencyLocale(values.currency), {
                      style: "currency",
                      currency: values.currency,
                    }).format(shippingCost)}
                  </td>
                  <td></td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={4} className="px-4 py-2 text-right">
                    Total:
                  </td>
                  <td className="px-4 py-2 text-right">
                    {new Intl.NumberFormat(getCurrencyLocale(values.currency), {
                      style: "currency",
                      currency: values.currency,
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
            value={values.notes}
            onChange={(e) => form.setValue("notes", e.target.value)}
            placeholder="Enter any additional notes"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="terms">Terms and Conditions</Label>
          <Textarea
            id="terms"
            value={values.terms}
            onChange={(e) => form.setValue("terms", e.target.value)}
            placeholder="Enter terms and conditions"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shippingAddress">Shipping Address</Label>
          <Textarea
            id="shippingAddress"
            value={values.shippingAddress}
            onChange={(e) => form.setValue("shippingAddress", e.target.value)}
            placeholder="Enter shipping address"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={() => handleSubmit("draft")} variant="outline" disabled={loading}>
            Save as Draft
          </Button>
          <Button type="button" onClick={() => handleSubmit("final")} disabled={loading}>
            {loading ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </form>
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

