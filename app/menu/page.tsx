export default function Menu() {
  const foods = [
    { name: 'Fawkes’ Fiery Feast', desc: 'Fried chicken', allergens: 'Gluten' },
    { name: 'Dragon Ribs of Gringotts', desc: 'Smoked ribs & riblets', allergens: '—' },
    { name: 'Forbidden Forest Fajita Strips', desc: 'Fajita beef', allergens: '—' },
    { name: 'Acromantula Nest with Eggs', desc: 'Meatballs & spaghetti', allergens: 'Gluten, Egg' },
    { name: 'Bertie Bott’s Every Flavor Beans', desc: 'Beans (served in a cauldron)', allergens: '—' },
    { name: 'Golden Snitch Macaroni', desc: 'Mac & cheese', allergens: 'Dairy, Gluten' },
    { name: 'Horcrux Eggs', desc: 'Deviled eggs', allergens: 'Egg' },
    { name: 'Mermaid’s Catch', desc: 'Smoked salmon', allergens: 'Fish' },
  ]

  const drinks = [
    { name: 'Butterbeer', desc: 'Cream soda + butterscotch (mock/cocktail)' },
    { name: 'Polyjuice Potion', desc: 'Lime sherbet + lemon-lime soda + pineapple' },
    { name: 'Felix Felicis', desc: 'Golden sparkling cider (non-alcoholic or spiked)' },
    { name: 'Firewhisky', desc: 'Cinnamon whiskey cocktail (adult only)' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Great Hall Menu</h1>

      {/* Food Section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Food Table of Magical Delights</h2>
        <ul className="grid grid-cols-2 gap-2">
          {foods.map(f => (
            <li key={f.name} className="rounded-lg p-2 bg-white/10">
              <div className="font-medium text-xs sm:text-sm break-words">{f.name}</div>
              <div className="opacity-80 text-xs">{f.desc}</div>
              <div className="opacity-60 text-[10px] mt-1">Allergens: {f.allergens}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* Drinks Section */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Potions & Elixirs</h2>
        <ul className="grid grid-cols-2 gap-2">
          {drinks.map(d => (
            <li key={d.name} className="rounded-lg p-2 bg-white/10">
              <div className="font-medium text-xs sm:text-sm break-words">{d.name}</div>
              <div className="opacity-80 text-xs">{d.desc}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
