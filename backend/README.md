# InstaHelp Backend

Production-ready Node.js backend for InstaHelp with **PhonePe Payment Gateway** (official `@phonepe-pg/pg-sdk-node`), PostgreSQL, JWT auth, and admin APIs.

## Architecture

```
Frontend (HTML/CSS/JS)
        ↓
  Express API (/api/*)
        ↓
  PhonePe SDK (server-side only)
        ↓
  PostgreSQL (Prisma)
```

PhonePe credentials (Client ID, Client Secret, Salt Key) are **encrypted at rest** and never sent to the browser.

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or Docker)
- PhonePe Business account (Sandbox credentials for testing)

### 2. Install & Configure

```bash
cd backend
cp .env.example .env
# Edit .env - set DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY
npm install
```

Generate a 32-byte encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database

**With Docker:**

```bash
docker compose up -d postgres
```

**Run migrations:**

```bash
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Start Server

```bash
npm run dev
```

API: `http://localhost:4000`  
Health: `http://localhost:4000/health`  
Frontend (static): served from project root when using the backend server.

### 5. Configure PhonePe (Admin)

1. Get **Client ID**, **Client Secret**, **Client Version** from [PhonePe Business Dashboard](https://business.phonepe.com) (Test Mode ON for sandbox).
2. Login as admin via OTP (`ADMIN_PHONE` in `.env`).
3. Update payment settings:

```bash
# Send OTP
curl -X POST http://localhost:4000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999999999"}'

# Verify OTP (check server logs for OTP in dev mode)
curl -X POST http://localhost:4000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999999999","otp":"123456"}'

# Save PhonePe credentials (use token from verify-otp)
curl -X PUT http://localhost:4000/api/admin/payment-settings \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "InstaHelp",
    "environment": "sandbox",
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "clientVersion": 1,
    "webhookUsername": "your_webhook_user",
    "webhookPassword": "your_webhook_pass",
    "successUrl": "/payment-success.html",
    "failureUrl": "/payment-failed.html"
  }'
```

### 6. Enable Frontend API Mode

Open `admin-payment.html`:

- Set **Integration Mode** → `PG API (Backend + PhonePe SDK)`
- Set **Backend API URL** → `http://localhost:4000`
- Save settings

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/send-otp` | - | Send OTP |
| POST | `/api/auth/verify-otp` | - | Verify OTP, get JWT |
| GET | `/api/auth/profile` | JWT | User profile |
| POST | `/api/orders` | Optional | Create order |
| GET | `/api/orders/:id` | Optional | Get order |
| GET | `/api/orders/user` | JWT | User orders |
| POST | `/api/payments/create` | Optional | Create payment + PhonePe redirect |
| POST | `/api/payments/verify` | - | Verify payment status |
| GET | `/api/payments/status/:id` | - | Payment status |
| GET | `/api/payments/callback` | - | PhonePe redirect callback |
| POST | `/api/payments/webhook` | Signature | PhonePe S2S webhook |
| POST | `/api/payments/refund` | Admin | Initiate refund |
| GET | `/api/transactions` | JWT | List transactions |
| GET | `/api/vendors` | - | List vendors |
| POST | `/api/vendors/register` | - | Register vendor |
| GET | `/api/admin/dashboard` | Admin | Dashboard stats |
| PUT | `/api/admin/payment-settings` | Admin | Configure PhonePe |

## Multi-Vendor Payments

`PaymentAccount` supports `ownerType: ADMIN | VENDOR` with separate encrypted credentials per vendor. Pass `ownerType: VENDOR` and `vendorId` when creating payments.

## Security

- Helmet, CORS, rate limiting
- JWT authentication
- Zod request validation
- Input sanitization
- AES-256-GCM encryption for secrets
- Webhook signature validation via PhonePe SDK
- Idempotency keys for payments
- Duplicate webhook protection
- Audit logging for all payment events

## Docker (Full Stack)

```bash
cd backend
cp .env.example .env
docker compose up --build
```

## Production Deployment

See **[DEPLOY.md](../DEPLOY.md)** in the project root for full steps (Render, Docker VPS, env vars, PhonePe webhooks).

Quick summary:

1. Set `NODE_ENV=production`, `OTP_DEV_MODE=false`
2. Use strong `JWT_SECRET` and stable `ENCRYPTION_KEY`
3. Set `PHONEPE_ENVIRONMENT=production` with live credentials
4. Set `API_BASE_URL`, `FRONTEND_URL`, `CORS_ORIGINS` to your HTTPS domain
5. Deploy with root **`Dockerfile`** (API + frontend in one container)
6. Register webhook: `https://yourdomain.com/api/payments/webhook`

```bash
# From project root
docker build -t instahelp .
docker run -p 4000:4000 --env-file backend/.env instahelp
```

## Project Structure

```
backend/
├── prisma/schema.prisma
├── src/
│   ├── config/
│   ├── controllers/
│   ├── services/
│   │   ├── phonepe.service.ts
│   │   └── payment.service.ts
│   ├── routes/
│   ├── middleware/
│   └── validators/
├── Dockerfile
└── docker-compose.yml
```
