# DukaanPro v2

Multi-tenant shop management SaaS for Indian kirana/retail store owners. Self-hosted, Postgres + Row-Level Security, JWT auth, Node/Express API, React (Vite) frontend, Docker on Hetzner VPS.

## Structure

- `frontend/` — React + Vite SPA (dashboard, inventory, scanner, orders, billing, khata, analytics)
- `api/` — Node/Express REST API, tenant-scoped routes, RLS-aware DB access
- `database/` — SQL schema, migrations, seeds
- `docs/` — API reference, deployment guide, architecture notes

## Quick start (dev)

```bash
cp .env.example .env
docker compose up -d db
cd api && npm install && npm run migrate && npm run dev
cd ../frontend && npm install && npm run dev
```

## Build status

This repo is being built section by section, in the order defined in the project tree (root config → frontend scaffold → frontend src → api → database → docs). See `docs/Architecture.md` for the current progress checkpoint — it is updated every time a build session stops, with the exact next file to resume from.
