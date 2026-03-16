#!/bin/bash
set -e

GIT_HASH=$(git rev-parse --short HEAD)
echo "Deploying version: $GIT_HASH"

cd apps/api
echo "$GIT_HASH" | CLOUDFLARE_API_TOKEN="" bunx wrangler secret put API_VERSION
CLOUDFLARE_API_TOKEN="" bunx wrangler deploy
cd ../..

source apps/dashboard/.env

cd apps/dashboard
rm -rf dist
bun run build
CLOUDFLARE_API_TOKEN="" CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" bunx wrangler pages deploy dist --project-name=contracking --branch=main --commit-dirty=true
cd ../..

echo "Deployed $GIT_HASH"
