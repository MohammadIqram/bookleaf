# Engineering Write-Up: BookLeaf Author Support Portal

**Author:** Senior Full-Stack Engineer  
**Date:** October 2026  
**System:** BookLeaf Author Support & Communication Portal  

---

### 1. Executive Summary & Core Priorities

The BookLeaf Support Portal was engineered around a core thesis: **working software with exceptional AI architecture and bulletproof operational reliability beats superficial polish.** BookLeaf serves authors who treat their books as passion projects; support inquiries often involve emotional stakes (royalties, print defects, delayed milestones).

Our implementation focused on six uncompromising engineering priorities:
1. **AI Integration Quality & Cost Awareness**: High-value LLM triage and drafting with single-call classification (`max_tokens: 150`), selective knowledge base injection, and SHA-256 draft caching.
2. **Resilience & Zero-Downtime Fallback**: Circuit breaker protection (`CLOSED` → `OPEN` → `HALF_OPEN`) and a deterministic keyword/regex rules engine guaranteeing that ticket submission and triage never fail, even if external LLMs experience outages.
3. **Strict RBAC & Data Privacy**: Complete author data isolation (returning 404 instead of 403 on foreign resources to eliminate enumeration vulnerabilities) and zero leakage of internal notes to authors or LLM prompts.
4. **Real-Time Communication**: Native Server-Sent Events (SSE) with 25-second keepalive heartbeats and a client-side 10-second polling fallback.
5. **Clean Express Architecture**: Strict separation of concerns (`routes` → `controllers` → `services` → `database`) with Zod request validation and centralized operational error handling.
6. **Factual Prompt Engineering**: Strict mitigation against prompt injection (`<author_query>` delimiters) and zero hallucination of policies, bank details, or false promises.

---

### 2. Key Architecture Trade-Offs

| Decision | Selected Approach | Trade-Off / Alternative Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **Real-Time Transport** | **Server-Sent Events (SSE)** | Full-Duplex WebSockets | Ticket communication is predominantly server-to-client push (replies, queue status changes). SSE avoids WS proxy state overhead, works seamlessly across firewalls, and requires zero connection handshake complexity. |
| **Model Selection** | **Claude 3 Haiku / GPT-4o Mini** | Frontier Models (Claude 3.5 Sonnet / GPT-4o) | Haiku and GPT-4o Mini cost ~15–20x less, respond in <600ms, and excel at structured JSON and tone following. Classification and drafting are low-complexity tasks where frontier models would represent wasteful token spend. |
| **Task Execution** | **In-Process Async (`setImmediate`)** | Distributed Queue (BullMQ / Celery) | For single-instance operation and simplicity, `setImmediate` decoupled ticket creation (HTTP 201 in <50ms) from AI calls without requiring external Redis infrastructure upfront. |
| **Knowledge Base** | **Selective File Markdown Injection** | Vector Database / RAG (Pinecone / pgvector) | BookLeaf's policy knowledge base is structured and finite (~8 files). Category-routed selective injection is 100% deterministic, has zero chunking error, and incurs zero vector database maintenance costs. |
| **File Attachments** | **Metadata Storage (UI-Only Preview)** | Direct S3 Multipart Uploads | Prioritized core AI triage, SSE synchronization, and financial logic. Marked transparently as "stored name only / upload coming soon". |

---

### 3. Production Evolution Roadmap

To transition this portal from a hardened prototype to an enterprise-scale system serving hundreds of thousands of authors:

1. **Distributed Event & Task Pipeline**:
   - Replace in-process `setImmediate` with **BullMQ** backed by Redis for AI ingestion jobs, retries, and dead-letter queues.
   - Introduce **Redis Pub/Sub** into `SseService` to support horizontal scaling across multi-container Node.js clusters behind AWS ALB.
2. **Cloud Object Storage for Defective Media**:
   - Implement S3 / Cloudflare R2 presigned URLs allowing authors reporting print defects to upload high-resolution photographic proof directly to cloud storage.
3. **Automated Banking Verification**:
   - Integrate RazorpayX or Stripe Identity APIs into the author payout settings to automatically verify IFSC and account holder names, preventing failed quarterly disbursements.
4. **CI/CD Quality Guardrails**:
   - Run `evalClassifier.js` in GitHub Actions on every pull request, enforcing a threshold of ≥ 95% classification accuracy before prompt updates can merge to production.
