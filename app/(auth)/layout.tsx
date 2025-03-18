import type React from "react"
import Image from "next/image"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center border-b px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mukono-xHmH8KbJ3uBEnVXyJTE1f1FdozXcsj.png"
            alt="Mukono Energies Logo"
            width={40}
            height={40}
            className="h-10 w-auto"
          />
          <span className="text-lg font-semibold">Mukono Energies</span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}

