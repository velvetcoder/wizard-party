import Link from 'next/link'
export default function Page() {
  return (
    <section className="space-y-6">
      <h1 className="font-medieval text-4xl text-center">Welcome to Rachael and Maurice's <br />Harry Potter Birthday & Anniversary Halloween Party</h1>
      <p className="font-imfell text-2xl text-center flicker">Check in when you arrive, get sorted, and earn house points.</p>
      <div className="font-lora flex flex-wrap gap-3">
        <Link href="/enter" className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20">Enter</Link>
        <Link href="/sorting" className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20">Sorting Hat</Link>
        <Link href="/menu" className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20">Great Hall Menu</Link>
        <Link href="/games" className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20">Games Hub</Link>
        <Link href="/photos" className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20">Party Photos</Link>
      </div>
    </section>
  )
}


