"use client"

import { useState, useEffect, useRef } from "react"
import { useSupabase } from "@/lib/supabase/provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Loader2, Plus, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  tax_id: string | null
}

interface CustomerSelectorProps {
  value: string
  onChange: (value: string) => void
  onCustomerSelect?: (customer: Customer | null) => void
}

export function CustomerSelector({ value, onChange, onCustomerSelect }: CustomerSelectorProps) {
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  })
  const [creating, setCreating] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  // Fetch customers when the component mounts and when the popover opens
  useEffect(() => {
    if (user) {
      fetchCustomers()
    }
  }, [user])

  useEffect(() => {
    if (open) {
      fetchCustomers()
    }
  }, [open])

  // Set the selected customer ID when value changes
  useEffect(() => {
    if (value && customers.length > 0) {
      const customer = customers.find(c => c.name === value);
      if (customer) {
        setSelectedCustomerId(customer.id);
      }
    } else {
      setSelectedCustomerId(null);
    }
  }, [value, customers]);

  const fetchCustomers = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Fetch customers with all relevant fields
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, phone, address, city, country, tax_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name")

      if (error) {
        console.error("Error fetching customers with standard client:", error)
        
        // Try fetching with API endpoint as fallback (would use service role)
        try {
          const response = await fetch("/api/admin/list-customers", {
            method: "GET",
            headers: {
              "Content-Type": "application/json"
            }
          })
          
          if (!response.ok) {
            throw new Error("Failed to fetch customers with admin API")
          }
          
          const result = await response.json()
          if (result.success && result.data) {
            setCustomers(result.data)
          } else {
            throw new Error(result.error || "No customers data returned")
          }
        } catch (apiError) {
          console.error("Error fetching customers with admin API:", apiError)
          throw apiError
        }
      } else {
        setCustomers(data || [])
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
      toast({
        title: "Error loading customers",
        description: "Failed to load customer list. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Find the selected customer in the customers array
  const getSelectedCustomer = () => {
    return customers.find(customer => customer.name === value) || null
  }

  // Handle selecting a customer from the dropdown
  const handleSelectCustomer = (customerName: string) => {
    onChange(customerName)
    setOpen(false)
    
    const selectedCustomer = customers.find(cust => cust.name === customerName) || null
    if (onCustomerSelect) {
      onCustomerSelect(selectedCustomer)
    }
    
    // Set the selected customer ID for animation
    if (selectedCustomer) {
      setSelectedCustomerId(selectedCustomer.id)
    }
  }

  // Handle adding a new customer
  const handleAddNewCustomer = async () => {
    if (!user) return
    if (!newCustomer.name.trim()) {
      toast({
        title: "Customer name required",
        description: "Please enter a name for the customer",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      // Create customer through the API endpoint using service role
      const response = await fetch("/api/admin/create-customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          name: newCustomer.name.trim(),
          email: newCustomer.email.trim() || null,
          phone: newCustomer.phone.trim() || null,
          address: newCustomer.address.trim() || null,
          is_active: true,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create customer")
      }

      toast({
        title: "Customer created",
        description: `${newCustomer.name} has been added successfully`,
      })

      // Reset form
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
        address: "",
      })
      
      // Close dialog
      setNewCustomerDialogOpen(false)
      
      // Refresh customers and select the new one
      await fetchCustomers()
      
      if (result.data && result.data[0]) {
        onChange(result.data[0].name)
        if (onCustomerSelect) {
          onCustomerSelect(result.data[0])
        }
      }
    } catch (error: any) {
      console.error("Error creating customer:", error)
      toast({
        title: "Error creating customer",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  // Filter customers based on search query
  const filteredCustomers = searchQuery.trim() === "" 
    ? customers 
    : customers.filter(customer => 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchQuery.toLowerCase()))
      )

  // Animation variants
  const popoverAnimationVariants = {
    hidden: { opacity: 0, y: -5, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      y: -5, 
      scale: 0.95,
      transition: { duration: 0.15, ease: "easeIn" }
    }
  };

  const customerItemVariants = {
    initial: { opacity: 0.7, x: 0 },
    hover: { opacity: 1, backgroundColor: "rgba(238, 240, 255, 0.8)" },
    selected: { 
      opacity: 1, 
      backgroundColor: "rgba(224, 229, 251, 0.8)", 
      color: "rgb(37, 99, 235)",
      fontWeight: 500,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {value ? (
                <motion.span
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {value}
                </motion.span>
              ) : "Select customer..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <AnimatePresence>
            {open && (
              <PopoverContent className="w-[350px] p-0" asChild forceMount>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={popoverAnimationVariants}
                >
                  <Command>
                    <CommandInput 
                      placeholder="Search customers..." 
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandEmpty>
                      {loading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="ml-2">Loading...</span>
                        </div>
                      ) : (
                        <p className="p-2 text-center text-sm">No customers found.</p>
                      )}
                    </CommandEmpty>
                    <CommandGroup heading="Customers">
                      <ScrollArea className="max-h-[200px]">
                        {filteredCustomers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={() => handleSelectCustomer(customer.name)}
                            className="flex items-center gap-2 px-4 py-2"
                            asChild
                          >
                            <motion.div
                              initial="initial"
                              whileHover="hover"
                              animate={selectedCustomerId === customer.id ? "selected" : "initial"}
                              variants={customerItemVariants}
                              transition={{ duration: 0.15 }}
                              className="flex items-center justify-between w-full cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {customer.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-medium">{customer.name}</span>
                                  {customer.email && (
                                    <span className="text-xs text-muted-foreground">{customer.email}</span>
                                  )}
                                </div>
                              </div>
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </motion.div>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                    <div className="border-t p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          setNewCustomerDialogOpen(true)
                          setOpen(false)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add new customer
                      </Button>
                    </div>
                  </Command>
                </motion.div>
              </PopoverContent>
            )}
          </AnimatePresence>
        </Popover>
      </div>

      <Dialog open={newCustomerDialogOpen} onOpenChange={setNewCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter customer details to create a new customer in your database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Customer name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="Phone number"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Customer address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCustomerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewCustomer} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create Customer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 