"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Error boundary caught error:", error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="max-w-md overflow-hidden border-destructive/20 bg-background/60 backdrop-blur-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-background/10 opacity-50" />
          <CardHeader className="relative">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <CardTitle>Something went wrong</CardTitle>
            </div>
            <CardDescription>An error occurred while trying to load this page or component.</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="rounded-md bg-muted/80 p-4">
              <p className="text-sm font-medium text-muted-foreground">Error details:</p>
              <p className="mt-2 text-sm font-mono">{error.message || "Unknown error"}</p>
              {error.digest && <p className="mt-2 text-xs text-muted-foreground">Error ID: {error.digest}</p>}
            </div>
          </CardContent>
          <CardFooter className="relative flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

