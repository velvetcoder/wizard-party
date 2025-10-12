import './globals.css'
import Link from 'next/link'
import { MedievalSharp, IM_Fell_English, Lora } from 'next/font/google'
import { Toaster } from 'sonner' 

// Big spooky hero font
const medieval = MedievalSharp({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-medieval',
})

// Sub-headings (old book vibe)
const imfell = IM_Fell_English({
  subsets: ['latin'],
  weight: '400',
  style: 'normal',
  variable: '--font-imfell',
})

// Body text (readable serif)
const lora = Lora({
  subsets: ['latin'],
  weight: ['400','700'], // normal + bold
  variable: '--font-lora',
})

export const metadata = {
  title: "Wizard Party",
  description: "Harry Potter Birthday & Anniversary Halloween Party",
  icons: {
    icon: '/hphalloweenfavicon.png', 
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body className={`${medieval.variable} ${imfell.variable} ${lora.variable} min-h-screen bg-neutral-950 text-neutral-100`}>
        <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-black/30">
          <nav className="mx-auto max-w-5xl flex items-center gap-6 p-4 text-sm">
            <Link href="/" className="font-semibold">Wizard Party</Link>
            <div className="flex gap-4 flex-wrap">
              <Link href="/enter">Enter</Link>
              <Link href="/sorting">Sorting</Link>
              <Link href="/menu">Menu</Link>
              <Link href="/games">Games</Link>
              <Link href="/house">Houses</Link>
              <Link href="/schedule">Schedule</Link>
              <Link href="/photos">Photos</Link>
              <Link href="/admin" className="ml-2 opacity-70 hover:opacity-100">Admin</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl p-6">{children}</main>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}
