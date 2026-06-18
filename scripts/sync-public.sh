#!/usr/bin/env sh
# Sync site assets into backend/public for Docker/Render (backend-root deploys).
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/backend/public"
rm -rf "$DEST"
mkdir -p "$DEST"
cp "$ROOT"/index.html "$ROOT"/plans.html "$ROOT"/pay.html "$ROOT"/orders.html \
   "$ROOT"/transactions.html "$ROOT"/admin-payment.html "$ROOT"/payment-success.html \
   "$ROOT"/payment-failed.html "$ROOT"/pricing.html "$ROOT"/giftcards.html \
   "$ROOT"/favicon.svg "$ROOT"/style.css "$DEST"/
cp -R "$ROOT"/js "$ROOT"/css "$ROOT"/image "$DEST"/
echo "Synced frontend to backend/public"
