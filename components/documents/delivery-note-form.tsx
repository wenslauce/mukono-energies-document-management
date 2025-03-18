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

interface DeliveryNoteItem {
  id: string
  description: string
  quantity: number
  unit: string
  remarks: string
}

// Define the form validation schema
const deliveryNoteFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  deliveryNoteNumber: z.string().min(1, "Delivery note number is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  deliveryAddress: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  orderReference: z.string().optional(),
  invoiceReference: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  showPrices: z.boolean(),
})

export function DeliveryNoteForm() {
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState(`DN-${Date.now().toString().slice(-6)}`)
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10))
  const [orderReference, setOrderReference] = useState("")
  const [invoiceReference, setInvoiceReference] = useState("")
  const [currency, setCurrency] = useState("UGX")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<DeliveryNoteItem[]>([
    {
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unit: "Pcs",
      remarks: "",
    },
  ])

  const form = useForm<z.infer<typeof deliveryNoteFormSchema>>({
    resolver: zodResolver(deliveryNoteFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerAddress: "",
      deliveryNoteNumber: `DN-${Date.now().toString().slice(-6)}`,
      deliveryDate: new Date().toISOString().slice(0, 10),
      deliveryAddress: "",
      reference: "",
      notes: "",
      orderReference: "",
      invoiceReference: "",
      currency: "UGX",
      showPrices: false,
    },
  })

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit: "Pcs",
        remarks: "",
      },
    ])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof DeliveryNoteItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value }
        }
        return item
      }),
    )
  }

  // Handle customer selection
  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer)
    if (customer) {
      form.setValue("customerName", customer.name || "")
      form.setValue("customerEmail", customer.email || "")
      form.setValue("customerAddress", customer.address || "")
    }
  }

  const handleSubmit = async (status: "draft" | "final") => {
    // First validate the form
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        console.log("Form errors:", form.formState.errors);
        toast({
          title: "Validation Error",
          description: "Please check the form for errors.",
          variant: "destructive",
        });
        return;
      }
      
      const values = form.getValues();
      
      if (!values.customerName) {
        toast({
          title: "Customer name required",
          description: "Please enter a customer name",
          variant: "destructive",
        });
        return;
      }

      if (items.length === 0 || items.some((item) => !item.description)) {
        toast({
          title: "Items required",
          description: "Please add at least one item with a description",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("documents")
          .insert({
            user_id: user!.id,
            type: "delivery_note",
            status,
            document_number: values.deliveryNoteNumber,
            customer_name: values.customerName,
            total_amount: 0, // Delivery notes don't have monetary values
            currency: values.currency,
            data: {
              customer_phone: customerPhone,
              customer_email: values.customerEmail,
              customer_address: values.customerAddress,
              delivery_address: values.deliveryAddress,
              delivery_date: values.deliveryDate,
              order_reference: values.orderReference,
              invoice_reference: values.invoiceReference,
              notes: values.notes,
              items,
            },
          })
          .select();

        if (error) {
          throw error;
        }

        toast({
          title: "Delivery Note created",
          description: `Delivery Note ${values.deliveryNoteNumber} has been ${status === "draft" ? "saved as draft" : "finalized"}`,
        });

        router.push(`/documents/${data[0].id}`);
      } catch (error: any) {
        toast({
          title: "Error creating delivery note",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to create delivery note. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit(() => handleSubmit("final"))();
        }} className="space-y-6">
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
              
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Customer Phone</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter customer phone"
                />
              </div>
              
              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter delivery address"
                        rows={3}
                        required
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
                name="deliveryNoteNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Note Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="DN-000001"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="orderReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Reference</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter order reference"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="invoiceReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Reference</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter invoice reference"
                        {...field}
                      />
                    </FormControl>
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
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Delivery Items</h3>
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
                    <th className="px-4 py-2 text-left font-medium">Unit</th>
                    <th className="px-4 py-2 text-left font-medium">Remarks</th>
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
                        <Select value={item.unit} onValueChange={(value) => updateItem(item.id, "unit", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pcs">Pieces</SelectItem>
                            <SelectItem value="Box">Box</SelectItem>
                            <SelectItem value="Kg">Kilograms</SelectItem>
                            <SelectItem value="L">Liters</SelectItem>
                            <SelectItem value="m">Meters</SelectItem>
                            <SelectItem value="Set">Set</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={item.remarks}
                          onChange={(e) => updateItem(item.id, "remarks", e.target.value)}
                          placeholder="Any remarks"
                        />
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
            <Button type="button" onClick={() => handleSubmit("draft")} variant="outline" disabled={loading}>
              Save as Draft
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Delivery Note"}
            </Button>
          </div>
        </form>
      </Form>
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

