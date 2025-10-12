export default function Schedule() {
  const items = [
    { time: '6:00 PM', title: 'Arrival & Sorting' },
    { time: '6:30 PM', title: 'Feast in the Great Hall' },
    { time: '7:15 PM', title: 'Games Round 1' },
    { time: '8:15 PM', title: 'Cake & Toast' },
    { time: '8:45 PM', title: 'Games Round 2' },
    { time: '9:30 PM', title: 'Awards & Farewell' },
  ]
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Schedule</h1>
      <ul className="space-y-2">
        {items.map(i => (
          <li key={i.time} className="rounded-xl p-4 bg-white/10 flex items-center justify-between">
            <span className="opacity-80">{i.time}</span>
            <span className="font-medium">{i.title}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
