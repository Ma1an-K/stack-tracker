# Stack Tracker

PWA for tracking home poker games: buy-ins, cash-outs, settlements, leaderboards and player stats. React + TypeScript + Vite + Tailwind + shadcn/ui, Supabase (Postgres, Auth, Realtime, Edge Functions), deployed on Vercel.

## Checks

- `npm run typecheck`: TypeScript, app and node configs
- `npm run lint`: ESLint
- `npm test`: Vitest unit and component tests
- `npm run test:db`: Supabase database tests (needs the local Supabase stack)

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues on `Ma1an-K/stack-tracker`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels, unchanged (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the repo root, decisions in `docs/adr/`. See `docs/agents/domain.md`.
