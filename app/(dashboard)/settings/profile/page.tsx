import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm } from "@/components/settings/profile-form"
import { SecuritySettings } from "@/components/settings/security-settings"
import { NotificationSettings } from "@/components/settings/notification-settings"
import { Separator } from "@/components/ui/separator"
import { UserProfile } from "@/components/settings/user-profile"

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch user profile data
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        <div className="hidden md:block">
          <UserProfile user={session.user} profile={profile} />
        </div>

        <div className="space-y-6">
          <div className="md:hidden">
            <UserProfile user={session.user} profile={profile} />
            <Separator className="my-6" />
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="mt-6 space-y-6">
              <ProfileForm user={session.user} profile={profile} />
            </TabsContent>
            <TabsContent value="security" className="mt-6 space-y-6">
              <SecuritySettings user={session.user} />
            </TabsContent>
            <TabsContent value="notifications" className="mt-6 space-y-6">
              <NotificationSettings user={session.user} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

