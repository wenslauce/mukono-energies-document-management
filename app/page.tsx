import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function HomePage() {
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
        <nav className="ml-auto flex gap-4">
          <Button asChild variant="ghost">
            <Link href="/login">Login</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  Mukono Energies Document Management
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Efficiently manage your business documents, invoices, and receipts in one place.
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild size="lg">
                  <Link href="/login">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex h-16 items-center border-t px-4 md:px-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Mukono Energies. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

