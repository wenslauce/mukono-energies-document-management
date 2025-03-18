"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase/provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { User, Settings, LogOut, Bell, FileText, Receipt, FileSpreadsheet } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"

export function DashboardHeader() {
  const { supabase, user } = useSupabase()
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState<{ id: string; title: string; read: boolean }[]>([
    { id: "1", title: "New invoice payment received", read: false },
    { id: "2", title: "Document shared with you", read: false },
    { id: "3", title: "Reminder: Invoice #INV-001 due tomorrow", read: true },
  ])
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "ME"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <span className="text-lg font-bold text-primary-foreground">ME</span>
            </div>
            <span className="text-lg font-bold">Mukono Energies</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              3
            </span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name || "User"} />
                  <AvatarFallback>{getInitials(user?.user_metadata?.full_name || "")}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem
              onSelect={() => {
                router.push("/dashboard")
                setSearchOpen(false)
              }}
            >
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/documents")
                setSearchOpen(false)
              }}
            >
              <span>All Documents</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/documents/create?type=invoice")
                setSearchOpen(false)
              }}
            >
              <span>Create Invoice</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Documents">
            <CommandItem
              onSelect={() => {
                router.push("/documents/invoices")
                setSearchOpen(false)
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>Invoices</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/documents/receipts")
                setSearchOpen(false)
              }}
            >
              <Receipt className="mr-2 h-4 w-4" />
              <span>Receipts</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                router.push("/documents/quotes")
                setSearchOpen(false)
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              <span>Quotes</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

