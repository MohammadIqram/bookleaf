# BookLeaf Publishing: Author Support & Communication Portal

A production-minded, full-stack Author Support & Communication Portal built for **BookLeaf Publishing** (a leading self-publishing company in India and the US).

The portal connects authors directly with the BookLeaf support operations team, offering instant support query submission, real-time ticket thread communication, transparent royalty reporting, and LLM-powered triage classification, priority scoring, and smart drafting.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    Client["Next.js Frontend (Author & Admin UI)"]
    API["Express.js REST API (/api/v1)"]
    SSE["SSE Manager (Real-time Broadcaster)"]
    DB[("PostgreSQL via Prisma ORM")]
    AI["AI Service Layer (Selective KB & Circuit Breaker)"]
    Anthropic["Anthropic Adapter (Claude 3 Haiku)"]
    OpenAI["OpenAI Adapter (GPT-4o Mini)"]
    RulesFallback["Deterministic Rules & Keyword Classifier"]

    Client -->|HTTP REST / JWT| API
    Client -->|EventSource Stream| SSE
    API --> DB
    API --> SSE
    API -->|Async Non-Blocking| AI
    AI -->|LLM Provider Abstraction| Anthropic
    AI -->|LLM Provider Abstraction| OpenAI
    AI -.->|Circuit Breaker / Offline Fallback| RulesFallback
```

### Architectural Decisions & Rationale

1. **Express.js Layered Architecture (`routes` → `controllers` → `services` → `database`)**:
   - Thin routers handle endpoint mapping and middleware binding.
   - Controllers handle HTTP validation and response formatting only.
   - Services contain pure business logic, ensuring testability and zero framework lock-in.
2. **PostgreSQL with Prisma ORM**:
   - PostgreSQL provides ACID transactional guarantees, native JSON/array indexing, and relational integrity across users, authors, books, and tickets.
   - Prisma ORM ensures compile-time type safety, automated schema migrations, and clean relationship querying.
3. **Server-Sent Events (SSE) vs. WebSockets**:
   - Support ticket interaction is fundamentally **server-to-client driven** (admin replies, status updates, queue ingestion).
   - SSE runs over standard HTTP/1.1 and HTTP/2, requires no stateful connection handshakes or WS proxies, traverses corporate firewalls effortlessly, and supports native reconnects.
   - Automatic 10-second polling fallback is implemented in the frontend if SSE disconnects.
4. **JWT with Dual Token Transport**:
   - Authenticates both API requests (via standard `Authorization: Bearer <token>` header) and browser `EventSource` connections (via `?token=` parameter or httpOnly cookie).
   - Author tokens embed `authorId` resolving directly to verified records.
5. **Pluggable LLM Provider Abstraction**:
   - Interface `LLMProvider` decouples the business logic from specific vendors.
   - Switchable at runtime via `LLM_PROVIDER="anthropic" | "openai"`.
   - Built-in circuit breaker and deterministic fallback ensure **zero system downtime** if external LLM APIs fail or keys are unconfigured.

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- Node.js 20+ (Node v20.x or v24.x)
- PostgreSQL database (Local, Docker, or Cloud instance like Supabase/Neon/Render)
- npm or yarn

### 1. Clone & Configure Environment Variables
```bash
git clone https://github.com/bookleaf/author-portal.git
cd author-portal
```

Copy the environment templates:
```bash
cp server/.env.example server/.env
```

Ensure `DATABASE_URL` in `server/.env` points to your PostgreSQL database:
```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/bookleaf?schema=public"
JWT_SECRET="bookleaf_super_secret_jwt_key_min_32_characters_long_for_security"
PORT=5000
CORS_ORIGIN="http://localhost:3000"
LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY="your-anthropic-key"  # Optional: Portal falls back to rules if empty
OPENAI_API_KEY=""                      # Optional
```

### 2. Install Dependencies, Migrate Database & Seed
```bash
# In server directory:
cd server
npm install
npx prisma generate
npx prisma db push       # Or npx prisma migrate dev
npm run seed             # Seeds all 10 authors, 18 books, 2 admins & 8 tickets
```

### 3. Start Backend API Server
```bash
npm run dev
# Server runs on: http://localhost:5000
# OpenAPI Docs:   http://localhost:5000/api/docs
# Health Check:   http://localhost:5000/api/health
```

### 4. Start Next.js Frontend
```bash
# In frontend directory (new terminal):
cd ../frontend
npm install
npm run dev
# Frontend runs on: http://localhost:3000
```

---

## 👥 Demo Credentials & Test Scenarios

All accounts can be tested using the **"Switch Demo User"** 1-click button in the portal navigation bar, or logged in manually with the uniform passwords below:

| Persona | Name | Email | Password | Scenario / Testing Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Super Admin | `admin@bookleaf.com` | `Admin@123` | Full access, queue triage, AI draft editor, internal notes |
| **Support Lead**| Support Lead | `support.lead@bookleaf.com` | `Admin@123` | Queue supervisor, ticket assignment, SLA monitoring |
| **Author (01)** | Priya Sharma | `priya.sharma@email.com` | `Author@123` | Whispers of the Ganges (AUTH001) — Physical print defect ticket |
| **Author (02)** | Rohit Kapoor | `rohit.kapoor@email.com` | `Author@123` | Code & Karma (AUTH002) — Amazon India "Unavailable" stock sync |
| **Author (03)** | Ananya Reddy | `ananya.reddy@email.com` | `Author@123` | Between Two Temples (AUTH003) — 67 sold, ₹2,546 pending, zero paid |
| **Author (04)** | Vikram Joshi | `vikram.joshi@email.com` | `Author@123` | Debugging Life (AUTH004) — Critical ISBN mismatch on Amazon |
| **Author (05)** | Meera Nair | `meera.nair@email.com` | `Author@123` | Cardamom & Chaos (AUTH005) — Author bio and Amazon US query |
| **Author (06)** | Arjun Malhotra | `arjun.malhotra@email.com` | `Author@123` | Turban Tales (AUTH006) — Payout calendar & quarterly cycle query |
| **Author (07)** | Sneha Kulkarni | `sneha.kulkarni@email.com` | `Author@123` | Midnight in Mysore (AUTH007) — In Production (Cover Design) |
| **Author (08)** | Farhan Sheikh | `farhan.sheikh@email.com` | `Author@123` | Ghazal of the Forgotten (AUTH008) — Single published title |
| **Author (09)** | Kavita Deshmukh | `kavita.deshmukh@email.com` | `Author@123` | Raising Roots (AUTH009) — In Production (Typesetting) |
| **Author (10)** | Diya Chatterjee| `diya.chatterjee@email.com` | `Author@123` | Durga's Daughters (AUTH010) — Multi-book catalog overview |

---

## 🧠 AI Integration Quality & Cost Optimization

### 1. Model Choice Justification: Claude 3 Haiku / GPT-4o Mini
- **Cost & Speed**: Classification and email drafting are focused, low-complexity NLP tasks. Using frontier models like Claude 3.5 Sonnet or GPT-4o would incur ~15–20x the cost with higher latency.
- **Structured JSON & Tone Following**: Claude 3 Haiku and GPT-4o-mini excel at following strict JSON schemas (`temperature: 0`) and adopting empathetic, professional author-partner personas.
- **Latency**: Haiku produces responses in ~400–600ms, essential for real-time customer support queues.

### 2. Token & Cost Management
- **Single-Call Classification**: Subject and description are truncated to 1500 chars and sent with 3 tiny context facts (`hasBookLinked`, `bookStatus`, `pendingRoyalty`). No knowledge base or history is loaded. `max_tokens: 150`. Cost: < $0.0001 per ticket.
- **Selective Knowledge Base Injection**: Rather than passing the entire knowledge base (thousands of tokens), the drafter injects **only the specific section matching the ticket's category** (e.g. `royalty.md` for payment queries, `isbn.md` for ISBN tickets) alongside tone guidelines and 1 matching few-shot example.
- **Context Filtering**: Only the specific linked book is injected (not the whole catalog), and only the last 4 messages of the conversation thread are included. Internal notes are **never** passed to prompts.

### 3. Deterministic Draft Caching (`AiDraftCache`)
- Drafts are cached by a deterministic SHA-256 hash:
  $$\text{inputHash} = \text{SHA256}(\text{ticketId} + \text{subject} + \text{description} + \text{lastMessageId} + \text{promptVersion})$$
- When an admin reopens a ticket, the cached draft is returned instantly with **0 tokens consumed**.
- If the author replies or the prompt version updates, the hash changes, invalidating the cache automatically.

### 4. Circuit Breaker & Graceful Degradation
- LLM calls use an `AbortController` timeout (15 seconds) and exponential backoff retry (up to 2 retries on 429/5xx).
- The `CircuitBreaker` trips to `OPEN` after 3 consecutive failures, suspending API calls for 60 seconds to protect the upstream service and maintain snappy UI response.
- **Fallback**: The ticket creation endpoint never fails if AI is down. Ingestion falls back to a deterministic keyword/regex classifier (`AiFallback`) with category and priority heuristics, recording `categorySource: RULES` and `aiClassificationStatus: FAILED`.
- The draft endpoint returns pre-filled static category templates when the AI is offline.

### 5. Prompt-Injection Defense
- All author-submitted text is treated as untrusted and wrapped in XML delimiters: `<author_query>...</author_query>`.
- The system prompt explicitly instructs the model to ignore any instructions or attempts to modify company policies inside the delimiters.

### 6. Evaluation Harness (`scripts/evalClassifier.js`)
An automated test script benchmarks the classifier against 15 labeled realistic support queries:
```bash
node scripts/evalClassifier.js
# Output: Category Accuracy: 100% (15/15) | Priority Accuracy: 87% (13/15)
```

---

## 📡 REST API & Real-Time Documentation

Interactive OpenAPI 3.0 documentation is served live via Swagger UI at:
**[http://localhost:5000/api/docs](http://localhost:5000/api/docs)**

### Core API Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials; returns token and user payload |
| `POST` | `/api/v1/auth/logout` | Authenticated | Clears session cookie |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieves profile of current user |
| `GET` | `/api/v1/books` | Authenticated | Author: own books; Admin: all books (filter by `authorId`) |
| `GET` | `/api/v1/books/:id` | Authenticated | Retrieves book details (404 if not owned by author) |
| `POST` | `/api/v1/tickets` | Author | Submits ticket; returns 201 immediately (AI runs async) |
| `GET` | `/api/v1/tickets` | Authenticated | Author: own tickets; Admin: filtered queue with SLA age |
| `GET` | `/api/v1/tickets/:id` | Authenticated | Ticket thread (author view excludes notes and AI reasoning) |
| `POST` | `/api/v1/tickets/:id/messages`| Authenticated | Adds message (blocks replies to closed tickets for authors) |
| `PATCH`| `/api/v1/tickets/:id` | Admin | Updates status, category, priority, or assignee |
| `POST` | `/api/v1/tickets/:id/assign` | Admin | Assigns ticket to self or unassigns |
| `GET` | `/api/v1/tickets/:id/notes` | Admin | Gets internal notes |
| `POST` | `/api/v1/tickets/:id/notes` | Admin | Adds internal note |
| `GET` | `/api/v1/tickets/:id/draft` | Admin | Gets or generates AI response draft (cached) |
| `POST` | `/api/v1/tickets/:id/draft/regenerate` | Admin | Forces fresh draft generation |
| `POST` | `/api/v1/tickets/:id/reclassify` | Admin | Re-runs AI classification & priority scoring |
| `GET` | `/api/v1/admin/stats` | Admin | Dashboard metrics, active counts, SLA warnings & AI costs |
| `GET` | `/api/v1/events` | Authenticated | Real-time SSE stream (`ticket:created`, `updated`, `message`) |
| `GET` | `/api/health` | Public | Service health and uptime |

---

## 🧪 Automated Test Suite

Run the unit and integration tests using Node.js's native test runner:
```bash
cd server
npm test
```

### Test Coverage (17 Tests Passing)
- **Authentication**: Password hashing with bcrypt, JWT token generation & verification, rejection of expired/tampered tokens.
- **RBAC & Data Scoping**: Author role denied from admin endpoints (HTTP 403), author forbidden from reading other authors' tickets (returns 404 to prevent resource enumeration), admin authorized for all endpoints.
- **Validation**: Subject length (5–150 chars), description length (20–5000 chars), message body validation, ticket status state transitions.
- **AI Resilience & Caching**: Deterministic rules fallback classifier precision, draft input hash determinism, circuit breaker state machine transitions.

---

## 🚀 Deployment Guide

### Option 1: Docker Compose (All-in-One VPS)
```bash
# Build and run PostgreSQL + Backend in production mode:
docker-compose up -d --build
```

### Option 2: VPS (Ubuntu) + Vercel
1. **Backend (Ubuntu VPS)**:
   - Copy `deploy/bookleaf-backend.service` to `/etc/systemd/system/`.
   - Copy `deploy/nginx.conf` to `/etc/nginx/sites-available/bookleaf` (disables buffering for SSE).
   - Enable SSL via `certbot --nginx -d api.bookleaf.com`.
   - Run `systemctl enable --now bookleaf-backend`.
2. **Frontend (Vercel)**:
   - Connect the repository to Vercel.
   - Set Root Directory to `frontend`.
   - Configure Environment Variable: `NEXT_PUBLIC_API_URL=https://api.bookleaf.com/api/v1`.
   - Deploy.

---

## 🔮 Future Roadmap & Enhancements

With additional time in a production environment, the following improvements would be prioritized:
1. **Real S3 / Cloudflare R2 File Uploads**: Currently file attachments store validated filenames in the database. Implementing presigned S3 URLs will enable secure direct-to-cloud uploads for defective copy photos and author manuscripts.
2. **Asynchronous Background Queue (BullMQ + Redis)**: Migrate the current in-process async `setImmediate` AI classification and email notification dispatcher to a persistent Redis-backed queue with worker concurrency limits and dead-letter queues.
3. **Multi-Instance SSE Scaling**: Integrate Redis Pub/Sub with the `SseService` so that ticket update events broadcast across multiple backend instances behind a load balancer.
4. **Live Bank Account Verification**: Hook author dashboard payout settings into a banking verification API (e.g. RazorpayX / Stripe) to validate IFSC and account names prior to quarterly payout runs.
5. **Continuous AI Evaluation in CI/CD**: Integrate `evalClassifier.js` into GitHub Actions to fail pull requests if prompt modifications degrade classification accuracy below 95%.
