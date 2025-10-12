export default function Admin() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <p className="opacity-80">Control games, points, and announcements here. (Stub)</p>
      <ul className="list-disc pl-6 opacity-80">
        <li><a className="underline" href="/admin/trivia">Trivia Control</a></li>
        <li><a className="underline" href="/admin/horcrux">Horcrux Manager</a></li>
        <li><a className="underline" href="/admin/duel">Wizard Duel Manager</a></li>
        <li><a className="underline" href="/admin/quidditch">Quidditch Pong Results</a></li>
        <li><a className="underline" href="/admin/socks">Dobby Socks Results</a></li>
        <li><a className="underline" href="/admin/checkins">Arrivals Dashboard</a></li>
        <li><a className="underline" href="/admin/award-points">Award Points</a></li>
      </ul>
    </div>
  )
}
