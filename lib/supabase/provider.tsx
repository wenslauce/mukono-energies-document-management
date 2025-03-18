"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/types/supabase"
import { createUserProfileAdmin, createUserSettingsAdmin } from "./admin"
import { getDatabaseErrorDetails } from "@/lib/utils"

// Supabase credentials
const supabaseUrl = "https://grftgdsjwrxpuoekesub.supabase.co"
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZnRnZHNqd3J4cHVvZWtlc3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMjI3MTcsImV4cCI6MjA1Nzc5ODcxN30.SbZ01mDtNCSecHjpjuGhs5cf-A9rEBaLqH7vwZZjhMg"

type SupabaseContext = {
  supabase: SupabaseClient<Database>
  user: User | null
  loading: boolean
  initializeUserProfile: (user: User) => Promise<boolean>
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() =>
    createClientComponentClient<Database>({
      supabaseUrl,
      supabaseKey,
    })
  )
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Function to initialize a user's profile using admin client
  const initializeUserProfile = async (user: User): Promise<boolean> => {
    try {
      // First check if profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      if (profileError && profileError.code === "PGRST116") {
        // Profile doesn't exist, create it using admin client
        console.log("Creating profile for user:", user.id)
        const { success, error } = await createUserProfileAdmin(
          user.id, 
          user.email || "", 
          user.user_metadata?.full_name || "User"
        )

        if (!success) {
          console.error("Failed to create profile through admin API:", getDatabaseErrorDetails(error))
          toast({
            title: "Profile setup failed",
            description: "There was an issue setting up your profile. Please contact support.",
            variant: "destructive",
          })
          return false
        }

        // Create default settings using admin client
        const settingsResult = await createUserSettingsAdmin(user.id)
        if (!settingsResult.success) {
          console.error("Failed to create settings:", getDatabaseErrorDetails(settingsResult.error))
          // Non-critical, continue anyway
        }

        toast({
          title: "Profile created",
          description: "Your account has been set up successfully.",
        })
        
        return true
      } else if (profileError) {
        console.error("Error checking profile:", getDatabaseErrorDetails(profileError))
        return false
      }

      // Profile exists
      return true
    } catch (error) {
      console.error("Profile initialization error:", getDatabaseErrorDetails(error))
      return false
    }
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user)
        // Check if profile exists when user logs in
        if (event === 'SIGNED_IN') {
          await initializeUserProfile(session.user)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error("Error getting session:", getDatabaseErrorDetails(error))
          return
        }
        
        if (data.session) {
          setUser(data.session.user)
          // Initialize profile for existing session
          await initializeUserProfile(data.session.user)
        }
      } catch (err) {
        console.error("Failed to get initial session:", getDatabaseErrorDetails(err))
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <Context.Provider value={{ supabase, user, loading, initializeUserProfile }}>
      {children}
    </Context.Provider>
  )
}

export function useSupabase() {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider")
  }
  return context
}

