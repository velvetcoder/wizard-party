import Link from 'next/link'
export default function Games() {
  const items = [
    { href: '/games/trivia', title: 'Trivia (Player)' },
    { href: '/games/trivia/display', title: 'Trivia (Host Display)' },
    { href: '/games/horcrux', title: 'Horcrux Hunt' },
    { href: '/games/duel', title: 'Wizard Duel' },
    { href: '/games/quidditch', title: 'Quidditch Pong' },
    { href: '/games/socks', title: 'Dobby Socks?' },
  ]
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Games Hub</h1>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map(i => (
          <Link key={i.href} href={i.href} className="rounded-xl p-4 bg-white/10 hover:bg-white/20">
            {i.title}
          </Link>
        ))}
      </div>
    </div>
  )
}
