# Deploy InstaHelp to Production

This guide deploys the **backend API + frontend** as one service (Express serves static HTML and `/api/*`).

You already use **Supabase PostgreSQL** - keep that `DATABASE_URL`; you only need a Node host (Render, Railway, Fly.io, or any VPS with Docker).

---

## Before you deploy

### 1. Production environment variables

Copy values from `backend/.env` into your host’s secret env panel. Required:

| Variable | Production value |
|----------|------------------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` (or host-assigned `PORT`) |
| `DATABASE_URL` | Supabase connection string (Session pooler recommended) |
| `JWT_SECRET` | Long random string (32+ chars) |
| `ENCRYPTION_KEY` | 64-char hex (same as local - **do not change** after encrypting credentials) |
| `API_BASE_URL` | `https://your-domain.com` |
| `FRONTEND_URL` | `https://your-domain.com` |
| `CORS_ORIGINS` | `https://your-domain.com` |
| `OTP_DEV_MODE` | `false` |
| `PHONEPE_ENVIRONMENT` | `production` |
| `PHONEPE_CLIENT_ID` | Live Client ID |
| `PHONEPE_CLIENT_SECRET` | Live Client Secret |
| `PHONEPE_WEBHOOK_USERNAME` | Webhook basic-auth user |
| `PHONEPE_WEBHOOK_PASSWORD` | Webhook basic-auth password |
| `RAZORPAY_KEY_ID` | Live key |
| `RAZORPAY_KEY_SECRET` | Live secret |
| `ADMIN_PHONE` | Your admin phone for OTP login |

Generate encryption key (only if you don’t have one yet):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. PhonePe & Razorpay dashboards

After deploy, register these URLs (replace domain):

| Provider | URL |
|----------|-----|
| PhonePe redirect | `https://your-domain.com/api/payments/callback` |
| PhonePe webhook | `https://your-domain.com/api/payments/webhook` |
| Razorpay | Uses client-side checkout; verify via `/api/payments/razorpay/verify` |

### 3. Run migrations on Supabase (once)

From your machine (with production `DATABASE_URL`):

```bash
cd backend
DATABASE_URL="your-supabase-url" npx prisma migrate deploy
```

The Docker start command also runs `prisma migrate deploy` automatically.

---

## Option A - Render (recommended)

1. Push this project to GitHub (private repo is fine).
2. Go to [render.com](https://render.com) → **New** → **Blueprint** → connect repo.
3. Render reads `render.yaml` and creates the web service.
4. In the service **Environment** tab, set all `sync: false` secrets from the table above.
5. Set `API_BASE_URL` and `FRONTEND_URL` to your Render URL, e.g. `https://instahelp.onrender.com`.
6. Deploy. Wait for **Health** → `/health` returns `{"status":"ok"}`.
7. Open `https://your-domain.com/plans` and test a payment.

**Custom domain:** Render dashboard → Settings → Custom Domains → add `instahelp.in` (or your domain), then update `API_BASE_URL`, `FRONTEND_URL`, and `CORS_ORIGINS`.

---

## Option B - Docker on a VPS

```bash
# On the server
git clone <your-repo> instahelp && cd instahelp

# Create env file (never commit this)
cp backend/.env.example backend/.env
nano backend/.env   # paste production values

docker build -t instahelp .
docker run -d \
  --name instahelp \
  --restart unless-stopped \
  -p 4000:4000 \
  --env-file backend/.env \
  instahelp
```

Put **Nginx/Caddy** in front for HTTPS on port 443.

---

## Option C - Railway / Fly.io

- **Railway:** New project → Deploy from GitHub → set root `Dockerfile`, add env vars, expose port `4000`.
- **Fly.io:** `fly launch` in repo root, set secrets with `fly secrets set`, deploy.

---

## After deploy checklist

- [ ] `GET https://your-domain.com/health` → `status: ok`
- [ ] `GET https://your-domain.com/plans` loads pricing page
- [ ] `GET https://your-domain.com/api/payments/gateways` returns enabled gateways
- [ ] PhonePe webhook URL saved in PhonePe Business dashboard
- [ ] Test ₹1 payment on Pro plan (PhonePe + Razorpay)
- [ ] `OTP_DEV_MODE=false` in production
- [ ] Rotate any credentials that were ever pasted in chat or committed

---

## Frontend API URL

When the site is served from the same domain as the API, `js/api.js` automatically uses `window.location.origin`. No manual `apiBaseUrl` in localStorage is needed in production.

For a **split** setup (frontend on CDN, API elsewhere), set Backend API URL in `admin-payment.html` or:

```js
localStorage.setItem('instahelp_api_base', 'https://api.your-domain.com');
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Invalid environment variables` on boot | Check Zod-required vars in `backend/src/config/env.ts` |
| DB connection failed | Use Supabase **Session mode** pooler URL; allow host IP if using direct connection |
| PhonePe 401 | `PHONEPE_ENVIRONMENT=production` with **live** credentials |
| CORS errors | Add your exact origin to `CORS_ORIGINS` (no trailing slash) |
| Prisma binary error in Docker | Rebuild image after `binaryTargets` update in schema |
