# REST API & Payment Integration

Comprehensive Node.js + TypeScript REST API with Prisma (Postgres) and Stripe Checkout integration.
This project implements modular features for authentication, products, orders, and payments with production-ready concerns (webhooks, migrations, idempotency and deploy scripts).

[Live](https://rest-api-with-payment-integration-backend.onrender.com)  

Note: all API endpoints are prefixed with `/api/v1/`. When calling the API use `{{baseUrl}}/api/v1/<route>`.

## Table of Contents

- [Quick Start (development)](#quick-start-development)
- [Full Project Overview](#full-project-overview)
- [Payment Flow](#payment-flow)
- [Middlewares](#middlewares)
 - [CORS](#cors-cross-origin-resource-sharing)
- [API: selected endpoints & examples](#api-selected-endpoints--examples)
- [How Authentication Works (for Postman)](#how-authentication-works-for-postman)
- [Database & Migrations](#database--migrations)
- [Postman collection (export)](#postman-collection-export)
- [Scripts & Dev tooling](#scripts--dev-tooling)
- [Troubleshooting & common issues](#troubleshooting--common-issues)



---

## Quick Start (development)

Prerequisites
- Node 18+ and npm
- PostgreSQL / NeonDB
- Stripe account (test keys)

Steps
1. Clone and install

    npm install

2. Create `.env`

    Copy `.env.example` and set the required values:
    - `DATABASE_URL`
    - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
    - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
    - `FRONTEND_URL`, `EXPRESS_SESSION_SECRET`

3. Run migrations and generate Prisma client (development)

    npx prisma migrate dev --name init
    npx prisma generate

4. Build and run

    npm run build
    npm start

Start the server (examples)

In development (watch mode):

```bash
npm run dev
```

Build and run (local / production):

```bash
npm run build
npm start
```

Run migrations then start (Render / deploy):

```bash
npm run start:prod
```

Set the `PORT` environment variable to change the listening port; access the API at `http://localhost:PORT/api/v1/` (default `PORT` if configured in `.env`).

For production (Render): set the start command to

```
npm run start:prod
```

`start:prod` executes `render-start.sh` which runs `npx prisma migrate deploy`, `npx prisma generate`, then starts the app.

---

## Full Project Overview

This project is organized as modular Express features. Each feature follows a `route -> controller -> service -> validation` pattern.

- `src/app/modules/auth` — authentication endpoints and token/cookie handling.
- `src/app/modules/user` — user profile operations.
- `src/app/modules/product` — product listing and management.
- `src/app/modules/order` — order creation (pay now / pay later), item snapshotting and stock decrement.
- `src/app/modules/payment` — Stripe webhook handler, payment status checks.
- `src/app/middlewares` — middleware, including `checkAuth` which accepts `Authorization: Bearer <token>` or cookies.
- `src/shared` — helpers (Stripe client wrapper, JWT utils, common helpers).
- `prisma/schema` — Prisma schema files and migrations.

Key design decisions
- Synchronous Checkout creation: `createOrder` returns a `paymentUrl` immediately when possible (creates a PaymentIntent first and links it to the payment row).
- Pay-later: creating a pay-later order sets `expiresAt` (30 minutes). After expiry, attempts to pay are blocked and stock is restored.
- Webhook-first reconciliation: webhooks (`payment_intent.succeeded`, `checkout.session.*`) update the `payments` and `orders` tables to the final state.

---

## Payment Flow

This service implements a resilient Checkout-based payment flow that covers immediate payment, a pay-later option, webhook reconciliation, idempotency and metadata linking.

- Pay Now 
   - Server creates an internal `payment` DB row and then attempts to create a Stripe `PaymentIntent` first. The created `paymentIntent` id is stored on the DB `payment` record.
   - A Checkout session is created referencing that `PaymentIntent`  or, if the PaymentIntent creation fails, the code falls back to creating the Checkout session first and reads the linked `payment_intent` afterwards.
   - The API returns `paymentUrl` (Checkout) immediately so the client can redirect the buyer.
   - On success Stripe will emit `checkout.session.completed` or `payment_intent.succeeded`; webhook handlers use `metadata.paymentId` or the `payment_intent` id to find the DB row and mark the payment `PAID` and update the `order` accordingly.

- Pay Later
   - Creating a pay-later order creates a `payment` with `status = PENDING` and `expiresAt = now + 30 minutes`.
   - The user has 30 minutes to call the pay endpoint (`POST /:orderId/pay`) which will create the Checkout session.
   - If the `expiresAt` has passed the server cancels the attempt, marks the payment `CANCELLED` and restores stock snapshotted when the order was created.

- Webhooks & Reconciliation
   - Webhooks are the source of truth for Stripe events. Webhook` endpoint verifies `STRIPE_WEBHOOK_SECRET` and handles:
      - `checkout.session.completed`
      - `checkout.session.async_payment_succeeded`
      - `payment_intent.succeeded`
      - `payment_intent.payment_failed`
      - `checkout.session.expired`
   - Handlers use `metadata.paymentId` (when available) or the `payment_intent` id to robustly look up the DB `payment` row. If the payment row cannot be found immediately the handlers will log and optionally schedule reconciliation retries.

- Idempotency & metadata
   - The server writes `metadata.paymentId` into the Checkout session and PaymentIntent so webhook events can be correlated with the DB record.
   - Webhook handlers are idempotent: they check the current DB `payment.status` and only transition state when needed (e.g., `PENDING -> PAID`).

- Error handling & fallbacks
   - If PaymentIntent creation fails, the service falls back to session-first Checkout and re-syncs the PaymentIntent afterwards.
---

## CORS (Cross-Origin Resource Sharing)

This server handles CORS server-side. Set `FRONTEND_URL` in `.env` to your frontend origin (e.g. `http://localhost:3000`).

Notes: `credentials: true` enables cookies; when set you must use an explicit `origin` (not `*`).

---

## Middlewares

This project centralizes request-level concerns in `src/app/middlewares`. Each middleware is described below:

- `src/app/middlewares/checkAuth.ts`: verifies JWT from `Authorization: Bearer <token>` or cookies (`accessToken` / `access_token`), loads the user, enforces roles and attaches `req.user`.
- `src/app/middlewares/globalErrorHandler.ts`: top-level Express error handler. Normalizes Zod and Prisma errors and returns consistent JSON error responses.
- `src/app/middlewares/notFound.ts`: 404 handler that returns a standardized `API NOT FOUND!` JSON response for unknown routes.
- `src/app/middlewares/validateRequest.ts`: Zod-based request body validator; parses `req.body.data` when present and replaces `req.body` with the parsed payload.
- `src/app/middlewares/index.ts`: middleware barrel exporting commonly used middleware for easy imports.

Usage notes:
- Apply `validateRequest` per-route where request payloads must be validated.
- Protect routes with `checkAuth(...)` (pass roles as needed).
- Mount `notFound` after routes and `globalErrorHandler` as the last middleware on the app.


## API: selected endpoints & examples

- Note: all API endpoints are prefixed with `/api/v1/`. When calling the API use `{{baseUrl}}/api/v1/<route>`.

Auth
- POST /api/v1/auth/login
   - Body: { "email": "user@example.com", "password": "secret" }
   - Response: { accessToken, refreshToken, user }
   - Also sets HttpOnly cookies: `accessToken`, `refreshToken`.

Products
- GET /api/v1/product — list
- GET /api/v1/product/:id — single

Orders
- POST /api/v1/order — create & pay now
   - Body: { items: [{ productId, quantity }] }
   - Response: { paymentUrl, orderId, paymentId }
- POST /api/v1/order/pay-later — create without immediate payment
   - Response: { orderId, paymentId, payLater: true }

Payments
- GET /api/v1/payment/:paymentId/status — read payment status


---

## How Authentication Works (for Postman)

- Server sets HttpOnly cookies on login; the request also returns `accessToken` in JSON.
- `src/app/middlewares/checkAuth.ts` accepts either:
   - `Authorization: Bearer <token>` header (Postman collection-level Bearer token), or
   - Cookie `accessToken` (browser flow / Postman cookie jar).
- Postman usage: run `POST {{baseUrl}}/auth/login` first; Postman will store cookies. The exported collection uses `{{accessToken}}` as a bearer token placeholder.

---

## Database & Migrations

- Migrations are under `prisma/migrations`. Workflow:
   - Dev: `npx prisma migrate dev --name <desc>`
   - Prod: `npx prisma migrate deploy`
- If you add fields to Prisma models, always create and commit a migration and run `prisma migrate deploy` on the target DB.

---

## Postman collection (export)

- File included: `rest-api-with-payment-integration.postman_collection.json`.
- Observations from the exported file:
   - Collection-level Authorization is set to **Bearer** with token value `{{accessToken}}` (so requests use that token if set).
   - Requests use variable `{{baseUrl}}` for the API base URL.
   - The collection contains saved example responses and request bodies for many endpoints.
   - The exported collection DOES NOT include your environment values or cookie jar — share a redacted environment or instruct reviewers to run the login request.

If you want, I can generate a redacted Postman environment JSON (placeholders for `baseUrl` and `accessToken`) and add a small `docs/POSTMAN_README.md` describing how to import and use the collection.

---

## Scripts & Dev tooling

- `npm run dev` — dev server (watch)
- `npm run build` — TypeScript build
- `npm start` — start compiled server
- `npm run start:prod` — runs migrations then starts (for Render)
- `npm run db:generate` — `prisma generate`

---

## CORS (Cross-Origin Resource Sharing)

This server handles CORS server-side. The API expects requests from your frontend origin; set `FRONTEND_URL` in `.env` to the frontend origin (for example `http://localhost:3000` or your deployed frontend URL).
- Server-side CORS configuration (example):

```ts
import cors from 'cors';

app.use(
   cors({
      origin: process.env.FRONTEND_URL,
      credentials: true, // allow cookies to be sent
   })
);
```

- Important notes:
   - Use `credentials: true` so HttpOnly cookies (access/refresh tokens) are sent by browsers.
   - When `credentials: true` you must set an explicit `origin` (cannot use `*`).
   - For local testing include `http://localhost:3000` (or your frontend dev port) in `FRONTEND_URL`.
   - Postman does not enforce CORS — browser requests are subject to CORS restrictions.
   - Ensure cookie options (`secure`, `sameSite`) match your deployment (e.g., `secure: true` in production).


Maintainer: Md Abu Hujaifa — update the Live URL before sharing.
