import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Supabase credentials
const supabaseUrl = "https://grftgdsjwrxpuoekesub.supabase.co"
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZnRnZHNqd3J4cHVvZWtlc3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMjI3MTcsImV4cCI6MjA1Nzc5ODcxN30.SbZ01mDtNCSecHjpjuGhs5cf-A9rEBaLqH7vwZZjhMg"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({
    req,
    res,
    supabaseUrl,
    supabaseKey,
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is not signed in and the current path is not /login or /,
  // redirect the user to /login
  if (!session && !req.nextUrl.pathname.startsWith("/login") && req.nextUrl.pathname !== "/") {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    return NextResponse.redirect(redirectUrl)
  }

  // If user is signed in and the current path is /login,
  // redirect the user to /dashboard
  if (session && req.nextUrl.pathname === "/login") {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}

