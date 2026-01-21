#!/usr/bin/env bash
set -o errexit

# Install dependencies including devDependencies so TypeScript types are available
npm ci --include=dev


# Generate Prisma client before build
npm run db:generate

# Build project (TS compile + copy templates)
npm run build