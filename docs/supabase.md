# Supabase backend setup

You can use Supabase as the managed backend (Postgres + Storage + Auth) while keeping this API layer.

## 1) Create a Supabase project
Get:
- Project URL (SUPABASE_URL)
- `service_role` key (SUPABASE_SERVICE_ROLE_KEY)
- `anon` key (SUPABASE_ANON_KEY)

## 2) Database connection string
Supabase → Project Settings → Database → Connection string.

Set `DATABASE_URL` in `backend/.env` to that connection string.

## 3) Run migrations
From your local machine:

```powershell
cd backend
npx prisma migrate deploy
```

## 4) Optional: Storage bucket for job photos
Create a bucket named `job-photos` and set it to private.
In Phase 2, the backend can issue signed upload URLs so the iOS app can upload photos securely.

## 5) Optional: Supabase Auth
If you want to switch from OTP auth in this API to Supabase Auth:
- Use Supabase Auth in the iOS app and admin UI
- Backend validates Supabase JWTs on every request
- Set user role in Supabase `user_metadata` or `app_metadata`

### Admin role
Create an admin user in Supabase and set:
```
app_metadata.role = "admin"
```


