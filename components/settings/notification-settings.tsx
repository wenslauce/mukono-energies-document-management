"use client"

import { useState } from "react"
import { useSupabase } from "@/lib/supabase/provider"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { User } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

interface NotificationSettingsProps {
  user: User
}

export function NotificationSettings({ user }: NotificationSettingsProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // In a real app, these would be fetched from the database
  const [settings, setSettings] = useState({
    emailNotifications: {
      newInvoice: true,
      paymentReceived: true,
      documentShared: true,
      accountUpdates: true,
      marketingEmails: false,
    },
    pushNotifications: {
      newInvoice: false,
      paymentReceived: true,
      documentShared: true,
      accountUpdates: false,
    },
  })

  const updateEmailSetting = (key: keyof typeof settings.emailNotifications, value: boolean) => {
    setSettings({
      ...settings,
      emailNotifications: {
        ...settings.emailNotifications,
        [key]: value,
      },
    })
  }

  const updatePushSetting = (key: keyof typeof settings.pushNotifications, value: boolean) => {
    setSettings({
      ...settings,
      pushNotifications: {
        ...settings.pushNotifications,
        [key]: value,
      },
    })
  }

  const saveSettings = async () => {
    setIsLoading(true)

    try {
      // In a real app, you would save these settings to the database
      // For now, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Choose which email notifications you'd like to receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">New Invoice</h3>
                <p className="text-sm text-muted-foreground">Receive an email when a new invoice is created.</p>
              </div>
              <Switch
                checked={settings.emailNotifications.newInvoice}
                onCheckedChange={(checked) => updateEmailSetting("newInvoice", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Payment Received</h3>
                <p className="text-sm text-muted-foreground">Receive an email when a payment is received.</p>
              </div>
              <Switch
                checked={settings.emailNotifications.paymentReceived}
                onCheckedChange={(checked) => updateEmailSetting("paymentReceived", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Document Shared</h3>
                <p className="text-sm text-muted-foreground">Receive an email when a document is shared with you.</p>
              </div>
              <Switch
                checked={settings.emailNotifications.documentShared}
                onCheckedChange={(checked) => updateEmailSetting("documentShared", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Account Updates</h3>
                <p className="text-sm text-muted-foreground">
                  Receive emails about your account activity and security.
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications.accountUpdates}
                onCheckedChange={(checked) => updateEmailSetting("accountUpdates", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Marketing Emails</h3>
                <p className="text-sm text-muted-foreground">
                  Receive emails about new features, tips, and promotions.
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications.marketingEmails}
                onCheckedChange={(checked) => updateEmailSetting("marketingEmails", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>Choose which push notifications you'd like to receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">New Invoice</h3>
                <p className="text-sm text-muted-foreground">
                  Receive a push notification when a new invoice is created.
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications.newInvoice}
                onCheckedChange={(checked) => updatePushSetting("newInvoice", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Payment Received</h3>
                <p className="text-sm text-muted-foreground">Receive a push notification when a payment is received.</p>
              </div>
              <Switch
                checked={settings.pushNotifications.paymentReceived}
                onCheckedChange={(checked) => updatePushSetting("paymentReceived", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Document Shared</h3>
                <p className="text-sm text-muted-foreground">
                  Receive a push notification when a document is shared with you.
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications.documentShared}
                onCheckedChange={(checked) => updatePushSetting("documentShared", checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-medium">Account Updates</h3>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications about your account activity and security.
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications.accountUpdates}
                onCheckedChange={(checked) => updatePushSetting("accountUpdates", checked)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={saveSettings} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

