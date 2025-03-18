import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Supabase credentials
const supabaseUrl = "https://grftgdsjwrxpuoekesub.supabase.co"
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZnRnZHNqd3J4cHVvZWtlc3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMjI3MTcsImV4cCI6MjA1Nzc5ODcxN30.SbZ01mDtNCSecHjpjuGhs5cf-A9rEBaLqH7vwZZjhMg"
const serviceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZnRnZHNqd3J4cHVvZWtlc3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjIyMjcxNywiZXhwIjoyMDU3Nzk4NzE3fQ.-FilG7hk398WVdNIzClKm-SuO7ctaFwNrzMQnqkHkXQ"

// Create a Supabase client with the service role key to bypass RLS
const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey)

// Function to create storage buckets if they don't exist
export async function setupStorageBuckets() {
  try {
    // Create documents bucket
    const { data: documentsBucket, error: documentsError } = await supabaseAdmin.storage.getBucket("documents")

    if (!documentsBucket) {
      const { error } = await supabaseAdmin.storage.createBucket("documents", {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ["application/pdf"],
      })

      if (error) throw error
      console.log("Created documents bucket")
    }

    // Create logos bucket
    const { data: logosBucket, error: logosError } = await supabaseAdmin.storage.getBucket("logos")

    if (!logosBucket) {
      const { error } = await supabaseAdmin.storage.createBucket("logos", {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ["image/jpeg", "image/png", "image/svg+xml"],
      })

      if (error) throw error
      console.log("Created logos bucket")
    }

    // Create signatures bucket
    const { data: signaturesBucket, error: signaturesError } = await supabaseAdmin.storage.getBucket("signatures")

    if (!signaturesBucket) {
      const { error } = await supabaseAdmin.storage.createBucket("signatures", {
        public: false,
        fileSizeLimit: 2097152, // 2MB
        allowedMimeTypes: ["image/jpeg", "image/png", "image/svg+xml"],
      })

      if (error) throw error
      console.log("Created signatures bucket")
    }

    // Set up bucket policies
    await setupBucketPolicies()

    return { success: true }
  } catch (error) {
    console.error("Error setting up storage buckets:", error)
    return { success: false, error }
  }
}

// Function to set up bucket policies
async function setupBucketPolicies() {
  try {
    // Documents bucket policy - only owner can access their documents
    const { error: docPolicyError } = await supabaseAdmin.storage
      .from("documents")
      .createPolicy("Documents Access Policy", {
        name: "Documents Access Policy",
        definition: {
          statements: [
            {
              effect: "allow",
              actions: ["select", "insert", "update", "delete"],
              expression: "auth.uid() = owner",
            },
          ],
        },
      })

    if (docPolicyError) throw docPolicyError

    // Logos bucket policy - public read, owner write
    const { error: logoPolicyError } = await supabaseAdmin.storage.from("logos").createPolicy("Logos Access Policy", {
      name: "Logos Access Policy",
      definition: {
        statements: [
          {
            effect: "allow",
            actions: ["select"],
            expression: "true",
          },
          {
            effect: "allow",
            actions: ["insert", "update", "delete"],
            expression: "auth.uid() = owner",
          },
        ],
      },
    })

    if (logoPolicyError) throw logoPolicyError

    // Signatures bucket policy - only owner can access their signatures
    const { error: sigPolicyError } = await supabaseAdmin.storage
      .from("signatures")
      .createPolicy("Signatures Access Policy", {
        name: "Signatures Access Policy",
        definition: {
          statements: [
            {
              effect: "allow",
              actions: ["select", "insert", "update", "delete"],
              expression: "auth.uid() = owner",
            },
          ],
        },
      })

    if (sigPolicyError) throw sigPolicyError

    return { success: true }
  } catch (error) {
    console.error("Error setting up bucket policies:", error)
    return { success: false, error }
  }
}

// Function to upload a file to a bucket with the service role (bypassing RLS)
export async function uploadFileAdmin(bucket: string, path: string, file: File) {
  try {
    const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    })

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error(`Error uploading file to ${bucket}:`, error)
    return { success: false, error }
  }
}

// Function to get a public URL for a file
export async function getPublicUrl(bucket: string, path: string) {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Function to delete a file with the service role (bypassing RLS)
export async function deleteFileAdmin(bucket: string, path: string) {
  try {
    const { error } = await supabaseAdmin.storage.from(bucket).remove([path])

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error(`Error deleting file from ${bucket}:`, error)
    return { success: false, error }
  }
}

