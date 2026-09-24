# Bhabi Thulla

Production-oriented Expo (React Native) card game — offline, AI, and online multiplayer.

**No gambling. No betting. No real-money currency, deposits, withdrawals, or cash prizes.**

## Stack

- Expo SDK 57 + Expo Router + TypeScript (strict)
- Zustand + AsyncStorage
- React Native Reanimated + Expo Haptics + Expo Audio
- Supabase Auth / Postgres / Realtime / Edge Functions (server-authoritative online play)

## Quick start

```bash
npm install
cp .env.example .env   # fill Supabase keys for online mode
npm start
```

### Tests (game engine)

```bash
npm test
```

### Typecheck

```bash
npm run typecheck
```

## Project layout

```text
app/                 Expo Router screens
src/game/            Pure game engine (offline + online share this)
src/store/           Zustand stores
src/services/        Supabase, audio, haptics, online API
supabase/migrations  Schema + RLS
supabase/functions   play-card, start-game, get-game-state
__tests__/game       Engine unit tests
```

## Online setup

1. Create a Supabase project.
2. Enable **Anonymous** sign-in (Auth → Providers).
3. Apply `supabase/migrations/20260323000000_init.sql`.
4. Deploy Edge Functions: `play-card`, `start-game`, `get-game-state`.
5. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`.

Never put the **service role** key in the app. It belongs only in Edge Function secrets.

Clients receive **sanitized** game state (other players’ hands are hidden). Moves are validated only on the server via `play-card`.

## Game rules (summary)

1. 52-card deck, Ace high, 2–4 players.
2. Ace of Spades holder starts and must lead ♠A.
3. Follow suit when able; otherwise off-suit play is a **Thulla** and ends the trick.
4. Highest lead-suit card’s player takes the Thulla pile into hand.
5. Empty hand → escaped. Last player with cards → **Bhabhi**.

## EAS / production

```bash
npx eas-cli@latest build --platform all
```

Configure `extra.eas.projectId` in `app.json` first.

## Ads

Not implemented in v1. See `src/services/ads.ts` for placement hooks that refuse to interrupt an active turn.
