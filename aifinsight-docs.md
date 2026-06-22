# AI FinSight — System Design & Technical Documentation

**Version:** 1.0.0  
**Stack:** Next.js 14 · Node.js/Express · PostgreSQL · Redis · Claude API · Stripe  
**Author:** Project Documentation  
**Last Updated:** June 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Database Schema](#3-database-schema)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [User Flow — End-to-End](#5-user-flow--end-to-end)
6. [Admin Flow — End-to-End](#6-admin-flow--end-to-end)
7. [Backend Flow & API Design](#7-backend-flow--api-design)
8. [AI Layer Design](#8-ai-layer-design)
9. [Real-Time Architecture](#9-real-time-architecture)
10. [Security Design](#10-security-design)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Deployment & Infrastructure](#12-deployment--infrastructure)
13. [Environment Variables](#13-environment-variables)
14. [API Reference](#14-api-reference)

---

## 1. Project Overview

**AI FinSight** is a full-stack AI-powered personal finance platform that gives users intelligent control over their money. Unlike traditional fintech dashboards, AI FinSight integrates Claude AI at every layer — from automatic transaction categorisation to natural language querying of your financial data.

### What makes it different

| Feature | Traditional Fintech | AI FinSight |
|---|---|---|
| Transactions | Manual categories | AI auto-categorises with confidence score |
| Insights | Static charts | Natural language: "Why did I overspend in May?" |
| Alerts | Rule-based thresholds | Anomaly detection + AI-explained alerts |
| Reports | PDF export | Conversational summary generation |
| Search | Filter by date/amount | "Show me all food delivery over ₹500" |

### Core Capabilities

- **Wallet system** — add money, P2P transfers, balance tracking
- **Stripe card payments** — charge cards, refunds, webhook reconciliation
- **AI transaction categorisation** — Claude API + pgvector embeddings
- **Spend forecasting** — trend analysis + anomaly detection
- **AI chat assistant** — streaming responses, RAG over your own transaction data
- **Real-time dashboard** — live balance, live transaction feed via WebSocket
- **Admin panel** — user management, fraud flags, platform analytics

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│   Next.js 14 (App Router)  ·  TypeScript  ·  Tailwind CSS   │
│   shadcn/ui  ·  Framer Motion  ·  Recharts  ·  Zustand      │
└────────────────────┬─────────────────────────────────────────┘
                     │ HTTPS / WebSocket
┌────────────────────▼─────────────────────────────────────────┐
│                     BACKEND LAYER                            │
│   Node.js / Express  ·  Prisma ORM  ·  JWT Auth             │
│   express-rate-limit  ·  Zod validation  ·  Nodemailer       │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐   │
│  │  Auth    │  │ Wallet   │  │  Stripe  │  │  AI       │   │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes   │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐   │
│  │  Admin   │  │ Transfer │  │  Notif.  │  │  Reports  │   │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes   │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘   │
└────────┬──────────────────────────────────────┬─────────────┘
         │                                      │
┌────────▼────────┐                   ┌─────────▼──────────┐
│   AI LAYER      │                   │   REAL-TIME LAYER  │
│  Claude API     │                   │   Socket.io        │
│  LangChain      │                   │   Redis Pub/Sub    │
│  pgvector RAG   │                   │   BullMQ Jobs      │
│  Embeddings     │                   └────────────────────┘
└────────┬────────┘
         │
┌────────▼──────────────────────────────────────────────────┐
│                     DATA LAYER                            │
│  PostgreSQL (Prisma)  ·  Redis (Cache/Sessions/Queue)     │
│  pgvector (Embeddings store)                              │
└───────────────────────────────────────────────────────────┘
```

### Request lifecycle

```
User action
  → Next.js page / Server Component
  → API call (Axios / fetch)
  → Express middleware (rate limit → JWT verify → Zod validate)
  → Route handler
  → Service layer (business logic)
  → Prisma (DB) / Redis (cache)
  → Response (JSON)
  → Zustand state update
  → UI re-render
```

---

## 3. Database Schema

### Core tables

```sql
-- Users
users
  id            UUID PRIMARY KEY
  email         VARCHAR UNIQUE NOT NULL
  password_hash VARCHAR NOT NULL
  full_name     VARCHAR NOT NULL
  role          ENUM('USER', 'ADMIN')  DEFAULT 'USER'
  is_verified   BOOLEAN  DEFAULT false
  is_blocked    BOOLEAN  DEFAULT false
  kyc_status    ENUM('PENDING', 'VERIFIED', 'REJECTED')
  created_at    TIMESTAMP
  updated_at    TIMESTAMP

-- Wallets (1:1 with users)
wallets
  id            UUID PRIMARY KEY
  user_id       UUID FK → users.id
  balance       DECIMAL(12,2) DEFAULT 0.00
  currency      VARCHAR DEFAULT 'INR'
  is_frozen     BOOLEAN DEFAULT false
  created_at    TIMESTAMP

-- Transactions (unified ledger)
transactions
  id            UUID PRIMARY KEY
  user_id       UUID FK → users.id
  wallet_id     UUID FK → wallets.id
  type          ENUM('CREDIT', 'DEBIT', 'TRANSFER_IN', 'TRANSFER_OUT', 'STRIPE_CHARGE', 'REFUND')
  amount        DECIMAL(12,2) NOT NULL
  balance_after DECIMAL(12,2) NOT NULL
  description   VARCHAR
  reference_id  VARCHAR UNIQUE   -- idempotency key
  status        ENUM('PENDING', 'COMPLETED', 'FAILED', 'REVERSED')
  -- AI fields
  ai_category        VARCHAR          -- AI-assigned category
  ai_category_conf   FLOAT            -- confidence score 0-1
  ai_tags            TEXT[]           -- e.g. ['food', 'delivery', 'swiggy']
  embedding          vector(1536)     -- pgvector embedding
  created_at         TIMESTAMP

-- P2P Transfers
transfers
  id            UUID PRIMARY KEY
  sender_id     UUID FK → users.id
  receiver_id   UUID FK → users.id
  amount        DECIMAL(12,2) NOT NULL
  note          VARCHAR
  status        ENUM('PENDING', 'COMPLETED', 'FAILED')
  sender_tx_id  UUID FK → transactions.id
  receiver_tx_id UUID FK → transactions.id
  created_at    TIMESTAMP

-- Stripe payments
stripe_payments
  id                UUID PRIMARY KEY
  user_id           UUID FK → users.id
  stripe_payment_id VARCHAR UNIQUE
  stripe_customer_id VARCHAR
  amount            DECIMAL(12,2)
  currency          VARCHAR
  status            ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')
  metadata          JSONB
  created_at        TIMESTAMP

-- AI chat sessions
ai_sessions
  id            UUID PRIMARY KEY
  user_id       UUID FK → users.id
  title         VARCHAR
  messages      JSONB[]   -- { role, content, timestamp }
  created_at    TIMESTAMP
  updated_at    TIMESTAMP

-- Notifications
notifications
  id            UUID PRIMARY KEY
  user_id       UUID FK → users.id
  type          ENUM('TRANSFER', 'ALERT', 'SYSTEM', 'AI_INSIGHT')
  title         VARCHAR
  body          TEXT
  is_read       BOOLEAN DEFAULT false
  metadata      JSONB
  created_at    TIMESTAMP

-- Audit logs (admin)
audit_logs
  id            UUID PRIMARY KEY
  actor_id      UUID FK → users.id
  action        VARCHAR     -- e.g. 'BLOCK_USER', 'FREEZE_WALLET'
  target_type   VARCHAR
  target_id     UUID
  before_state  JSONB
  after_state   JSONB
  ip_address    VARCHAR
  created_at    TIMESTAMP
```

---

## 4. User Roles & Permissions

### Role matrix

| Action | Guest | User | Admin |
|---|---|---|---|
| Register / Login | ✅ | — | — |
| View own dashboard | — | ✅ | ✅ |
| Add money to wallet | — | ✅ | — |
| P2P transfer | — | ✅ | — |
| Stripe card payment | — | ✅ | — |
| Use AI assistant | — | ✅ | ✅ |
| View own transactions | — | ✅ | ✅ |
| View all users | — | ❌ | ✅ |
| Block/unblock user | — | ❌ | ✅ |
| Freeze wallet | — | ❌ | ✅ |
| View platform analytics | — | ❌ | ✅ |
| Manage AI categories | — | ❌ | ✅ |
| Trigger refunds | — | ❌ | ✅ |
| View audit logs | — | ❌ | ✅ |

---

## 5. User Flow — End-to-End

### 5.1 Registration & Onboarding

```
[Landing Page]
  → Click "Get Started"
  → /register

[Register Form]
  Fields: Full name, email, password, confirm password
  → POST /api/auth/register
  → Server: hash password (bcrypt), create user + wallet
  → Send verification email (Nodemailer)
  → Redirect to /verify-email

[Email Verification]
  → User clicks link in email
  → GET /api/auth/verify-email?token=<jwt>
  → Server sets is_verified = true
  → Redirect to /login

[Login]
  → POST /api/auth/login
  → Server returns: { accessToken, refreshToken }
  → Store tokens: accessToken in memory, refreshToken in httpOnly cookie
  → Redirect to /dashboard
```

### 5.2 Dashboard Experience

```
[Dashboard - /dashboard]

  Real-time data loads via:
  ├── REST: GET /api/wallet/balance      → current balance
  ├── REST: GET /api/transactions?limit=10 → recent transactions
  ├── REST: GET /api/analytics/summary   → AI-powered spend summary
  └── WebSocket: connect to /socket      → live updates

  Panels visible:
  ├── Balance card (live, updates on any transaction)
  ├── Quick actions: Add Money | Send | Pay
  ├── AI Insight card: "You spent 23% more on food this week"
  ├── Transaction feed (real-time, AI-categorised)
  └── Spend chart (weekly/monthly, filterable)
```

### 5.3 Add Money to Wallet

```
[Add Money Flow]
  → Click "Add Money" → /wallet/add
  → Enter amount → choose method (Stripe card / UPI mock)
  → POST /api/payments/create-intent  { amount, currency }
  ← { clientSecret }
  → Stripe Elements render payment form
  → User enters card → Stripe.confirmPayment()
  ← Stripe calls webhook: POST /api/webhooks/stripe
  → Server: verify signature → update transaction → credit wallet
  → WebSocket emits: { event: 'BALANCE_UPDATE', balance }
  → Dashboard balance updates live
  → Notification created: "₹500 added to your wallet"
```

### 5.4 P2P Transfer

```
[Send Money Flow]
  → Click "Send" → /transfer
  → Enter: recipient email OR phone, amount, note
  → POST /api/transfers/initiate
    Server validates:
    ├── Sender wallet has sufficient balance
    ├── Recipient exists and wallet is not frozen
    ├── Amount > 0 and ≤ daily limit (₹50,000)
    └── Not self-transfer
  → If valid: DB transaction begins (atomic)
    ├── Debit sender wallet
    ├── Create TRANSFER_OUT transaction for sender
    ├── Credit receiver wallet
    ├── Create TRANSFER_IN transaction for receiver
    └── DB transaction commits
  → WebSocket: notify both sender and receiver
  → Email: send receipt to both parties
  → AI job queued: categorise both transactions
```

### 5.5 AI Chat Assistant

```
[AI Chat — /ai-chat]
  → User types: "How much did I spend on food last month?"
  → POST /api/ai/chat  { sessionId, message }

  Server pipeline:
  ├── 1. Embed user query → vector (Claude embeddings API)
  ├── 2. pgvector similarity search → top 20 relevant transactions
  ├── 3. Build context prompt:
  │     System: "You are a personal finance AI. User data: [transactions]"
  │     User: "How much did I spend on food last month?"
  ├── 4. Stream response from Claude API (SSE)
  └── 5. Save message pair to ai_sessions table

  Frontend:
  ├── EventSource connects to /api/ai/chat/stream
  ├── Tokens stream in real-time (typewriter effect)
  └── Response includes: answer + referenced transactions
```

### 5.6 Transaction Feed & AI Categorisation

```
[Every new transaction triggers this background job:]

  BullMQ job: CATEGORISE_TRANSACTION
  ├── Fetch transaction description + amount + merchant
  ├── Call Claude API:
  │     Prompt: "Categorise this transaction. Return JSON:
  │              { category, subcategory, tags, confidence }"
  ├── Parse response
  ├── Generate embedding (vector) for transaction
  ├── Update transaction: ai_category, ai_tags, embedding
  └── Emit WebSocket: transaction feed updates with category badge

  Categories used:
  Food & Dining, Travel, Shopping, Entertainment,
  Healthcare, Utilities, Education, Transfers, Other
```

### 5.7 Notifications

```
Notification triggers:
  ├── Transfer received         → in-app + email
  ├── Transfer sent             → in-app + email
  ├── Payment successful        → in-app
  ├── Low balance alert         → in-app + email
  ├── Anomaly detected by AI    → in-app + email
  └── Weekly AI spend summary   → email (BullMQ cron job)

  Delivery:
  GET /api/notifications        → paginated list
  PATCH /api/notifications/:id  → mark as read
  WebSocket event: 'NEW_NOTIFICATION'
```

---

## 6. Admin Flow — End-to-End

### 6.1 Admin Authentication

```
[Admin Login]
  → POST /api/auth/login  { email, password }
  ← { accessToken }  where user.role === 'ADMIN'
  → Middleware checks role on every /api/admin/* route
  → Redirect to /admin/dashboard
```

### 6.2 Admin Dashboard

```
[Admin Dashboard — /admin/dashboard]

  Metrics (REST on load):
  ├── GET /api/admin/analytics/overview
  │     → total users, active today, new this week
  ├── GET /api/admin/analytics/transactions
  │     → total volume, avg transaction, failed count
  ├── GET /api/admin/analytics/ai
  │     → categorisation accuracy, AI chat sessions count
  └── GET /api/admin/alerts
        → fraud flags, anomalies detected

  Charts:
  ├── Daily transaction volume (last 30 days)
  ├── User growth curve
  ├── Category distribution (AI-generated)
  └── Failed transaction heatmap
```

### 6.3 User Management

```
[Users List — /admin/users]
  → GET /api/admin/users?page=1&limit=20&search=&status=
  ← { users[], total, page }

  Per user, admin can:
  ├── View profile + full transaction history
  │     GET /api/admin/users/:id
  │     GET /api/admin/users/:id/transactions
  ├── Block user (prevents login)
  │     PATCH /api/admin/users/:id  { is_blocked: true }
  │     → Logs to audit_logs
  │     → Sends email notification to user
  ├── Unblock user
  │     PATCH /api/admin/users/:id  { is_blocked: false }
  ├── Freeze wallet (prevents all transactions)
  │     PATCH /api/admin/wallets/:id  { is_frozen: true }
  ├── Approve/reject KYC
  │     PATCH /api/admin/users/:id/kyc  { status: 'VERIFIED' }
  └── Trigger refund for a transaction
        POST /api/admin/transactions/:id/refund
```

### 6.4 Transaction Monitoring

```
[Transaction Monitor — /admin/transactions]
  → GET /api/admin/transactions?from=&to=&type=&status=&userId=

  Filters: date range, type, status, user, amount range

  Bulk actions:
  ├── Export CSV (BullMQ job → download link)
  └── Flag as suspicious

  Transaction detail:
  ├── Full audit trail
  ├── AI category + confidence
  ├── Stripe payment status
  └── Manual override AI category
```

### 6.5 Audit Logs

```
[Audit Logs — /admin/audit]
  → GET /api/admin/audit?actor=&action=&from=&to=

  Every admin action writes to audit_logs:
  {
    actor_id:     admin user ID
    action:       'BLOCK_USER' | 'FREEZE_WALLET' | 'TRIGGER_REFUND' | ...
    target_type:  'USER' | 'WALLET' | 'TRANSACTION'
    target_id:    affected resource ID
    before_state: snapshot before change
    after_state:  snapshot after change
    ip_address:   admin's IP
    created_at:   timestamp
  }
```

---

## 7. Backend Flow & API Design

### 7.1 Middleware stack (every request)

```
Request
  → cors()
  → helmet()           -- security headers
  → express.json()
  → rateLimiter()      -- per IP: 100 req/15min (stricter on /auth)
  → requestLogger()    -- log method, path, IP, duration
  → authenticateJWT()  -- verify Bearer token (except public routes)
  → roleGuard()        -- check role if route needs ADMIN
  → zodValidate()      -- validate body/query against schema
  → routeHandler()
  → errorHandler()     -- centralised error formatting
```

### 7.2 Auth routes

```
POST   /api/auth/register          Public
POST   /api/auth/login             Public
GET    /api/auth/verify-email      Public
POST   /api/auth/refresh-token     Public (httpOnly cookie)
POST   /api/auth/logout            Authenticated
POST   /api/auth/forgot-password   Public
POST   /api/auth/reset-password    Public
GET    /api/auth/me                Authenticated
```

### 7.3 Wallet & Transfer routes

```
GET    /api/wallet/balance         Authenticated
GET    /api/wallet/statement       Authenticated
POST   /api/transfers/initiate     Authenticated
GET    /api/transfers/:id          Authenticated
GET    /api/transfers              Authenticated
```

### 7.4 Payment routes (Stripe)

```
POST   /api/payments/create-intent    Authenticated
POST   /api/payments/confirm          Authenticated
GET    /api/payments/:id              Authenticated
POST   /api/webhooks/stripe           Public (Stripe signature verified)
```

### 7.5 AI routes

```
POST   /api/ai/chat               Authenticated   -- non-streaming
GET    /api/ai/chat/stream        Authenticated   -- SSE streaming
GET    /api/ai/sessions           Authenticated
GET    /api/ai/sessions/:id       Authenticated
DELETE /api/ai/sessions/:id       Authenticated
GET    /api/ai/insights           Authenticated   -- weekly AI analysis
POST   /api/ai/categorise/:txId   Admin only      -- manual re-categorise
```

### 7.6 Admin routes

```
GET    /api/admin/analytics/overview        Admin
GET    /api/admin/analytics/transactions    Admin
GET    /api/admin/users                     Admin
GET    /api/admin/users/:id                 Admin
PATCH  /api/admin/users/:id                 Admin
GET    /api/admin/users/:id/transactions    Admin
PATCH  /api/admin/wallets/:id              Admin
POST   /api/admin/transactions/:id/refund   Admin
GET    /api/admin/transactions              Admin
GET    /api/admin/audit                     Admin
GET    /api/admin/alerts                    Admin
```

### 7.7 Service layer pattern

```javascript
// Route → Controller → Service → Prisma

// Example: transfer flow
router.post('/initiate', authenticate, validate(transferSchema), TransferController.initiate)

class TransferController {
  static async initiate(req, res, next) {
    try {
      const result = await TransferService.initiate(req.user.id, req.body)
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  }
}

class TransferService {
  static async initiate(senderId, { recipientEmail, amount, note }) {
    // 1. Validate business rules
    // 2. Open Prisma $transaction
    // 3. Debit + credit atomically
    // 4. Queue BullMQ jobs
    // 5. Emit WebSocket events
    // 6. Return result
  }
}
```

### 7.8 Error handling

```javascript
// Centralised error types
class AppError extends Error {
  constructor(message, statusCode, code) { ... }
}

// Examples
throw new AppError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE')
throw new AppError('User not found', 404, 'USER_NOT_FOUND')
throw new AppError('Wallet is frozen', 403, 'WALLET_FROZEN')

// Response shape (always)
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Your wallet balance is too low for this transfer"
  }
}
```

---

## 8. AI Layer Design

### 8.1 Transaction Categorisation Pipeline

```
New transaction created
  ↓
BullMQ: queue CATEGORISE job
  ↓
Worker picks up job
  ↓
Build prompt:
  "Categorise this transaction for personal finance tracking.
   Description: '{description}'
   Amount: {amount}
   Merchant: '{merchant}'
   Return JSON only:
   { category, subcategory, tags[], confidence, reasoning }"
  ↓
Call Claude claude-sonnet-4-6 (claude-sonnet-4-6)
  ↓
Parse JSON response
  ↓
Generate embedding: claude-haiku (fast + cheap)
  ↓
UPDATE transactions SET ai_category, ai_tags, embedding, ai_category_conf
  ↓
Emit WebSocket: category applied to feed
```

### 8.2 AI Chat (RAG Pipeline)

```
User query: "How much did I spend eating out in April?"
  ↓
1. EMBED QUERY
   → POST to embeddings endpoint
   ← 1536-dim vector

2. VECTOR SEARCH (pgvector)
   SELECT * FROM transactions
   WHERE user_id = $userId
   ORDER BY embedding <=> $queryVector
   LIMIT 20

3. BUILD CONTEXT
   System prompt:
   "You are a personal finance assistant for {user.name}.
    Today is {date}. User's currency is INR.
    Relevant transactions from their history:
    {serialised top-20 transactions}"

4. STREAM RESPONSE
   Claude API with stream: true
   → Server-Sent Events to frontend
   → Frontend renders tokens as they arrive

5. PERSIST
   → Save user message + AI response to ai_sessions
```

### 8.3 AI Insights (Weekly Cron)

```
BullMQ cron: every Sunday midnight

For each active user:
  1. Fetch last 30 days transactions
  2. Group by AI category
  3. Compare to previous 30 days
  4. Build prompt: "Generate a 3-sentence friendly financial insight..."
  5. Call Claude API
  6. Store as notification type: AI_INSIGHT
  7. Send email digest
```

### 8.4 Anomaly Detection

```
On each new transaction:
  1. Fetch user's last 90-day average for that AI category
  2. If current amount > 3× average:
     → Flag as anomaly
     → Queue: AI_EXPLAIN_ANOMALY job
  3. AI explains: "This ₹4,500 food purchase is 4× your typical food spend"
  4. Create notification + alert in admin dashboard
```

---

## 9. Real-Time Architecture

### 9.1 WebSocket events

```
Client connects → Socket.io handshake with JWT
Server authenticates socket → joins room: user:{userId}

Events server → client:
  BALANCE_UPDATE        { balance, walletId }
  NEW_TRANSACTION       { transaction }
  TRANSFER_RECEIVED     { from, amount, note }
  NOTIFICATION          { notification }
  AI_CATEGORY_APPLIED   { transactionId, category, tags }
  ANOMALY_ALERT         { transactionId, message }

Events client → server:
  MARK_NOTIFICATION_READ  { notificationId }
  JOIN_AI_STREAM          { sessionId }
  LEAVE_AI_STREAM         { sessionId }
```

### 9.2 Redis Pub/Sub pattern

```
// Backend service (e.g. TransferService) publishes:
redis.publish('user:abc123', JSON.stringify({
  event: 'BALANCE_UPDATE',
  balance: 15000.00
}))

// Socket.io worker subscribes:
redis.subscribe('user:abc123', (message) => {
  const payload = JSON.parse(message)
  io.to('user:abc123').emit(payload.event, payload)
})
```

### 9.3 BullMQ queues

```
Queue: ai-categorisation
  Worker: categoriseTransaction.worker.ts
  Concurrency: 5
  Retry: 3x with exponential backoff

Queue: notifications
  Worker: notificationDispatch.worker.ts
  Concurrency: 10

Queue: reports
  Worker: reportGeneration.worker.ts
  Concurrency: 2

Queue: scheduled (cron)
  - weekly-insights:  0 0 * * 0   (Sunday midnight)
  - daily-summary:    0 8 * * *   (8am daily)
```

---

## 10. Security Design

### 10.1 Authentication

- **Access token:** JWT, expires in 15 minutes, stored in memory
- **Refresh token:** JWT, expires in 7 days, stored in httpOnly cookie (not accessible to JS)
- **Token rotation:** new refresh token issued on every refresh
- **Password hashing:** bcrypt with 12 salt rounds
- **Email verification:** required before wallet access

### 10.2 Rate limiting

```
Global:          100 requests / 15 minutes per IP
Auth routes:     10 requests / 15 minutes per IP
Transfer routes: 20 requests / 1 hour per user
AI chat:         50 messages / 1 hour per user
```

### 10.3 Stripe webhook security

```javascript
const sig = req.headers['stripe-signature']
const event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
// Throws if signature invalid → reject request
```

### 10.4 Input validation (Zod)

Every route has a schema. Example:

```javascript
const transferSchema = z.object({
  recipientEmail: z.string().email(),
  amount: z.number().positive().max(50000),
  note: z.string().max(200).optional(),
})
```

### 10.5 Database security

- All queries via Prisma (no raw SQL with user input)
- DB user has minimal permissions (no DROP, no CREATE)
- Connection pooling via PgBouncer
- Secrets in environment variables (never in code)

---

## 11. Frontend Architecture

### 11.1 Folder structure

```
/app
  /(auth)
    /login
    /register
    /verify-email
  /(dashboard)
    /dashboard          → main dashboard
    /transactions       → transaction history + AI filters
    /wallet             → balance + add money
    /transfer           → send money
    /analytics          → charts + AI insights
    /ai-chat            → AI assistant
    /notifications      → notification centre
    /settings           → profile, security, preferences
  /(admin)
    /admin/dashboard
    /admin/users
    /admin/transactions
    /admin/audit
    /admin/analytics

/components
  /ui                   → shadcn/ui base components
  /dashboard            → Dashboard-specific
  /transactions         → Transaction feed, cards
  /ai                   → Chat interface, streaming
  /charts               → Recharts wrappers
  /admin                → Admin-specific

/store
  authStore.ts          → user, tokens, login/logout
  walletStore.ts        → balance, transactions
  uiStore.ts            → loading, modals, toasts

/lib
  api.ts                → Axios instance, interceptors
  socket.ts             → Socket.io client singleton
  utils.ts
  validators.ts

/hooks
  useSocket.ts          → WebSocket event subscriptions
  useAIStream.ts        → SSE streaming handler
  useTransactions.ts    → paginated transaction fetching
```

### 11.2 State management (Zustand)

```typescript
// walletStore.ts
interface WalletStore {
  balance: number
  transactions: Transaction[]
  setBalance: (balance: number) => void
  addTransaction: (tx: Transaction) => void
  fetchTransactions: (page: number) => Promise<void>
}
```

### 11.3 AI streaming (SSE)

```typescript
// useAIStream.ts
const streamResponse = async (message: string, sessionId: string) => {
  const source = new EventSource(`/api/ai/chat/stream?sessionId=${sessionId}`)

  source.onmessage = (e) => {
    const token = JSON.parse(e.data)
    setMessages(prev => appendToken(prev, token))
  }

  source.onerror = () => source.close()

  await fetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, sessionId }),
    headers: { Authorization: `Bearer ${token}` }
  })
}
```

---

## 12. Deployment & Infrastructure

### 12.1 Services

| Service | Platform | Notes |
|---|---|---|
| Next.js frontend | Vercel | Auto-deploy from main branch |
| Node.js backend | Railway | Docker container |
| PostgreSQL | Railway | Managed Postgres |
| Redis | Railway | Managed Redis |
| Background workers | Railway | Separate service for BullMQ |
| Domain | Namecheap / Cloudflare | SSL via Let's Encrypt |

### 12.2 Docker (backend)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

### 12.3 CI/CD (GitHub Actions)

```yaml
on: push to main

jobs:
  test:      → npm test
  lint:      → eslint + tsc --noEmit
  deploy-fe: → vercel deploy --prod
  deploy-be: → docker build → push to Railway
```

---

## 13. Environment Variables

### Backend (.env)

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=sk-ant-...
SMTP_HOST=smtp.gmail.com
SMTP_USER=
SMTP_PASS=
CLIENT_URL=https://aifinsight.vercel.app
PORT=5000
NODE_ENV=production
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=https://api.aifinsight.com
NEXT_PUBLIC_SOCKET_URL=wss://api.aifinsight.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

---

## 14. API Reference

### Standard response envelopes

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 120 }
}

// Error
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Human-readable message"
  }
}
```

### Key request/response examples

#### POST /api/transfers/initiate

Request:
```json
{
  "recipientEmail": "priya@example.com",
  "amount": 1500,
  "note": "Dinner split"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "transferId": "tr_abc123",
    "amount": 1500,
    "recipient": { "name": "Priya Sharma", "email": "priya@example.com" },
    "senderBalance": 8500,
    "status": "COMPLETED",
    "completedAt": "2026-06-17T14:32:01Z"
  }
}
```

#### POST /api/ai/chat

Request:
```json
{
  "sessionId": "sess_xyz",
  "message": "What did I spend the most on this month?"
}
```

Response (streaming SSE):
```
data: {"token": "Based"}
data: {"token": " on"}
data: {"token": " your"}
...
data: {"done": true, "references": ["tx_001", "tx_008"]}
```

---

*End of documentation — AI FinSight v1.0*
