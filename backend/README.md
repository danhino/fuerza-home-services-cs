# Backend (Fastify + Prisma)

## What’s included (MVP)
- OTP auth (dev-only delivery, real SMS/email provider in Phase 2)
- RBAC: customer vs technician vs admin
- Nearby technicians query (trade + radius)
- Job request -> accept -> lifecycle statuses
- Estimate change proposal + customer approval/decline (logged)
- Chat messages per job
- Payments hook (Stripe PaymentIntent creation; iOS confirms)
- Realtime events via Socket.IO
- Push notifications scaffold (APNs token auth)

## Run
See root `README.md`.

## Supabase
This backend can run on Supabase Postgres by setting `DATABASE_URL` to your Supabase connection string.
Optional: add Supabase Storage for job photos and use service role keys for secure uploads.


