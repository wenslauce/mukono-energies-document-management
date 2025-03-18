import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { User } from "@supabase/supabase-js"
import { Mail, Phone, Briefcase, Building } from "lucide-react"

interface UserProfileProps {
  user: User
  profile: any
}

export function UserProfile({ user, profile }: UserProfileProps) {
  return (
    <Card className="overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-primary to-primary/60" />
      <CardContent className="p-6 pt-0">
        <div className="-mt-12 flex flex-col items-center">
          <Avatar className="h-24 w-24 border-4 border-background">
            <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || user?.email} />
            <AvatarFallback className="text-2xl">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <h2 className="mt-4 text-xl font-bold">{profile?.full_name || "User"}</h2>
          <p className="text-sm text-muted-foreground">{profile?.job_title || "No job title"}</p>

          <div className="mt-6 w-full space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{user?.email}</span>
            </div>
            {profile?.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile?.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{profile.company}</span>
              </div>
            )}
            {profile?.job_title && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{profile.job_title}</span>
              </div>
            )}
          </div>

          {profile?.bio && (
            <div className="mt-6 w-full">
              <h3 className="text-sm font-medium">Bio</h3>
              <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

