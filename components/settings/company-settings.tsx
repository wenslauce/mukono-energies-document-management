"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase/provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

export function CompanySettings() {
  const { supabase, user } = useSupabase()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyEmail, setCompanyEmail] = useState("")
  const [companyWebsite, setCompanyWebsite] = useState("")
  const [defaultCurrency, setDefaultCurrency] = useState("UGX")

  useEffect(() => {
    async function loadProfile() {
      if (!user) return

      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (error) throw error

        if (data) {
          setCompanyName(data.company_name || "")
          setCompanyAddress(data.company_address || "")
          setCompanyPhone(data.company_phone || "")
          setCompanyEmail(data.company_email || "")
          setCompanyWebsite(data.company_website || "")
          setDefaultCurrency(data.default_currency || "UGX")
        }
      } catch (error) {
        console.error("Error loading profile:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [supabase, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: companyName,
          company_address: companyAddress,
          company_phone: companyPhone,
          company_email: companyEmail,
          company_website: companyWebsite,
          default_currency: defaultCurrency,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      toast({
        title: "Company settings updated",
        description: "Your company settings have been updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error updating company settings",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Loading company settings...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyAddress">Company Address</Label>
          <Textarea
            id="companyAddress"
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            placeholder="Enter company address"
            rows={3}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyPhone">Phone Number</Label>
            <Input
              id="companyPhone"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyEmail">Email</Label>
            <Input
              id="companyEmail"
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              placeholder="Enter company email"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyWebsite">Website</Label>
            <Input
              id="companyWebsite"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              placeholder="Enter company website"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">Default Currency</Label>
            <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
              <SelectTrigger id="defaultCurrency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UGX">Uganda Shillings (UGX)</SelectItem>
                <SelectItem value="KES">Kenya Shillings (KES)</SelectItem>
                <SelectItem value="USD">US Dollar (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  )
}

