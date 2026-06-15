# Scalpel Craft Companion — API

Backend for the [Craft Companion plugin](https://github.com/cccarv82/scalpel-craft-companion) for [Scalpel](https://github.com/scalpelpoe/scalpel).

PoE2-first crafting helper. Hosts community-contributed recipes, mirrors RePoE-fork mod tier data, ranks recipes by votes + completions.

## Stack

- Next.js 15 (App Router) on Vercel
- Drizzle ORM + Neon Postgres
- Discord OAuth (device-code flow)

## Schema highlights

- `recipes` — title, slot, goal, base reqs, steps JSON, status, votes
- `recipe_votes` / `recipe_comments` / `recipe_reports` / `recipe_completions`
- `mod_dataset` — RePoE-fork mirror (refreshed by cron)
- `users` / `sessions` / `device_codes` / `events`

## Dev

```bash
cp .env.example .env.local
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

## License

AGPL-3.0-only.
