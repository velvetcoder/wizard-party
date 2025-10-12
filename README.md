# Wizard Party Web App (Starter)

Next.js (App Router) + Tailwind + shadcn-style stubs + Supabase for a Harry Potter party hub.

## Quick Start
1. Install deps
   ```bash
   npm install
   ```
2. Env vars
   - Copy `.env.local.example` → `.env.local` and fill in Supabase values.
3. DB schema
   - Run `schema.sql` in Supabase SQL editor.
4. Dev
   ```bash
   npm run dev
   ```

## Realtime Setup
Enable **Realtime** on: `house_points`, `trivia_sessions`, `trivia_buzzes`, `horcrux_progress`, `checkins`.

## On-site Check-In (No RSVP)
- Guests use **/enter** on arrival to record their presence and house.
- Admins monitor arrivals at **/admin/checkins** with per-house counts.

## Games
- Trivia: `/games/trivia` (players), `/games/trivia/display` (host). Control at `/admin/trivia`.
- Horcrux Hunt: `/games/horcrux`, dynamic step at `/games/horcrux/[code]`. Manage at `/admin/horcrux`.
