# Fuerza Home Services (MVP)

One iPhone app (Customer + Technician roles) + backend APIs + basic admin view.

## Repo layout
- `backend/`: Fastify + Prisma (Postgres) + Socket.IO realtime + APNs + Stripe hooks
- `admin/`: minimal Next.js admin UI (users/jobs/deactivate)

## Quick start (Windows 11)

### Prereqs
- Node.js 20+ (you have Node 22)
- Docker Desktop (recommended for Postgres)

### 1) Backend

Copy env:

```powershell
Copy-Item backend\env.example backend\.env -Force
```

Start Postgres (Docker Desktop must be running):

```powershell
docker compose up -d
```

If Docker isn’t available, install Postgres locally and point `DATABASE_URL` in `backend\.env`.

Install deps:

```powershell
npm install
```

Run Prisma migrate + seed:

```powershell
cd backend
npx prisma migrate dev --name init
npx tsx prisma\seed.ts
```

Run backend:

```powershell
cd ..\
npm run -w backend dev
```

API docs at `http://localhost:3001/docs`.

### 2) Admin

```powershell
npm run -w admin dev
```

Open `http://localhost:3002`.

Admin login uses Supabase Auth (email/password). Configure `admin/env.example`.

## Test accounts (seed)
- Admin: `admin@fuerza.local`
- Customer: `customer@fuerza.local`
- Technician (plumber): `plumber@fuerza.local`
- Technician (electrician): `electric@fuerza.local`

## iOS app
The SwiftUI iOS app lives in `ios/` (generated project + sources).

### TestFlight (Codemagic)
See `docs/codemagic-testflight.md` for Codemagic + TestFlight setup.

## Supabase backend
If you want Supabase as your backend, see `docs/supabase.md`.


