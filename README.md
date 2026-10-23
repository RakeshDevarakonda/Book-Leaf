# BookLeaf — Author Support & Communication Portal

A full-stack, enterprise-grade publishing support portal featuring **Author-Facing** and **Admin-Facing** dashboards powered by asynchronous **AI-assisted response generation, auto-classification, and ticket prioritization** adhering to BookLeaf's knowledge base.

---

## 🏗 Architecture Overview

```text
 ┌────────────────────────────────────────────────────────┐
 │                    React.js Frontend                   │
 │           Author Portal   │   Admin Portal             │
 └───────────────────────────┬────────────────────────────┘
                             │ HTTPS (httpOnly JWT Cookies)
 ┌───────────────────────────▼────────────────────────────┐
 │               Node.js + Express + TypeScript           │
 │       Auth (RBAC)  │  Books & Royalties  │  Tickets    │
 └─────────────┬───────────────────────────┬──────────────┘
               │ PostgreSQL                │ AWS SQS (Job Queue)
 ┌─────────────▼─────────────┐ ┌───────────▼──────────────┐
 │      PostgreSQL DB        │ │     AWS SQS Queue        │
 │  users, books, tickets,   │ │ (Non-blocking AI jobs)   │
 │  auth_sessions, responses │ └───────────┬──────────────┘
 └───────────────────────────┘             │ SQS Event Trigger
                               ┌───────────▼──────────────┐
                               │     Python AI Worker     │
                               │  (AWS Lambda / Consumer) │
                               └───────────┬──────────────┘
                                           │ Gemini API
                               ┌───────────▼──────────────┐
                               │   Google Gemini 2.5      │
                               │ Grounded in KnowledgeBase│
                               └──────────────────────────┘
```

---

## 🚀 Quick Start & Setup Guide

### 1. Prerequisites
- **Node.js** v18+
- **Python** v3.10+
- **PostgreSQL** running locally or via Docker

---

### 2. Backend Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and supply your PostgreSQL connection string and secrets:
# DATABASE_URL=postgres://postgres:password@localhost:5432/bookleaf
# ACCESS_TOKEN_SECRET=your_secure_access_secret_key
# REFRESH_TOKEN_SECRET=your_secure_refresh_secret_key

# 3. Run database migrations & seed sample dataset (10 authors & 18 books)
npm run seed

# 4. Start backend in development mode
npm run dev
```
Backend API will be running on `http://localhost:5000`.

---

### 3. AI Worker Setup

```bash
cd ai-worker

# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env and set:
# DATABASE_URL=postgres://postgres:password@localhost:5432/bookleaf
# GEMINI_API_KEY=your_gemini_api_key_here

# 3. Run local testing server (without needing AWS SQS)
python -m app.test_server
```
AI Worker local testing server will be running on `http://127.0.0.1:8000`.

---

## 🔑 Test Login Credentials (Pre-Seeded)

The database is pre-seeded with the exact assignment dataset:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@bookleaf.com` | `Admin@123` | BookLeaf Ops Admin (Full Queue, Internal Notes, Overrides) |
| **Author 1** | `priya.sharma@email.com` | `Author@123` | Author `AUTH001` (2 books, ₹3,570 pending royalty) |
| **Author 2** | `rohit.kapoor@email.com` | `Author@123` | Author `AUTH002` (2 books, ₹7,744 pending royalty) |
| **Author 3** | `ananya.reddy@email.com` | `Author@123` | Author `AUTH003` (1 book, in production) |
| *(All Authors)* | `<author_email_from_json>` | `Author@123` | All 10 authors from `AUTH001` to `AUTH010` |

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/signup` — Register author (`name`, `email`, `password`, `confirmPassword`).
- `POST /api/auth/login` — Log in with email and password (sets `httpOnly` access/refresh cookies).
- `POST /api/auth/refresh` — Refresh access token (with token rotation & revocation checks).
- `GET /api/auth/me` — Get current logged-in user profile.
- `POST /api/auth/logout` — Revoke device session and clear cookies.

### Books & Royalties (`/api/books`)
- `GET /api/books` — Get published books and aggregated royalty KPI summary for author.
- `GET /api/books/:id` — Get full book details (strict author ownership check).

### Tickets (`/api/tickets`)
- `POST /api/tickets` — Author raises support query (validates book ownership, enqueues AI job).
- `GET /api/tickets` — Author lists their submitted tickets.
- `GET /api/tickets/:id` — Author views ticket and admin public replies (**internal notes excluded**).
- `POST /api/tickets/:id/responses` — Author sends reply.

### Admin Operations (`/api/admin`)
- `GET /api/admin/tickets` — Global ticket queue with filtering (`status`, `category`, `priority`) and pagination (`page`, `limit`). Sorted by urgency (Critical first) and oldest unresolved.
- `GET /api/admin/tickets/:id` — Full ticket view including author/book info, **internal staff notes**, and **AI draft response**.
- `PATCH /api/admin/tickets/:id` — Update status, re-assign admin, or manually override category/priority.
- `POST /api/admin/tickets/:id/responses` — Send public resolution (`is_internal: false`) or private staff note (`is_internal: true`).

---

## 🤖 AI Integration & Safety Highlights

1. **Grounded Prompts:** The AI prompt strictly incorporates the BookLeaf Knowledge Base (80/20 split, ₹1,000 threshold, 45-day quarterly payout, 5–7 days print turnaround, ISBN escalation rules).
2. **Untrusted Prompt Isolation:** Author queries are wrapped in `<untrusted_author_query>` tags with explicit anti-injection instructions.
3. **Decoupled Architecture:** Ticket creation succeeds instantly even if the queue or LLM is down.
4. **Draft Protection:** An admin's manually edited draft is never overwritten by a late background worker run.
5. **Deterministic Fallback:** Includes a rule-based engine when LLM keys are unavailable.

---

## 🛡 Security Practices
- **No Hardcoded Fallbacks:** Server fails fast at startup if critical environment variables are absent.
- **httpOnly Cookies:** Defends against token theft via XSS.
- **Instant Revocation:** `validateSession` middleware checks database revocation status, enabling instant per-device logout.
- **Zero Secret Exposure:** Keys are restricted to `.env` files and never exposed to client bundles.
