export default function DuelHub() {
  const items = [
    { href: '/games/duel/audience', title: 'Audience (Buzz Here)' },
    { href: '/games/duel/actor',     title: 'Actor (Performer)' },
    { href: '/games/duel/display',   title: 'Big Screen Display' },
    { href: '/admin/duel',           title: 'Admin Monitor' },
  ]
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Wizard Duel</h1>
      <p className="opacity-80 text-sm">Choose your station:</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map(i => (
          <a key={i.href} href={i.href} className="rounded-xl p-4 bg-white/10 hover:bg-white/20">
            {i.title}
          </a>
        ))}
      </div>
    </div>
  )
}
