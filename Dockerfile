# Production image: InstaHelp API + static frontend (single service)
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src/
RUN npm run build && npx prisma generate

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl wget

WORKDIR /app/backend

ENV NODE_ENV=production

COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/backend/node_modules/@prisma ./node_modules/@prisma
COPY backend/prisma ./prisma/

# Frontend static assets (served from /app via path.join(__dirname, '../../'))
WORKDIR /app
COPY index.html plans.html pay.html orders.html transactions.html admin-payment.html ./
COPY payment-success.html payment-failed.html pricing.html favicon.svg style.css ./
COPY js ./js
COPY css ./css
COPY image ./image

WORKDIR /app/backend
RUN mkdir -p logs uploads

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-4000}/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
