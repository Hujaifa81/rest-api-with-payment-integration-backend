#!/usr/bin/env bash
# Safe start script for Render: run migrations then start the app
set -euo pipefail

echo "Running Prisma migrations..."
# Use migrate deploy for production-safe migration apply
npx prisma migrate deploy

echo "Generating Prisma client..."
npx prisma generate

echo "Starting application..."
node ./dist/src/index.js
