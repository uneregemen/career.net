# career.net

A modern job board platform built with an independently deployable microservices architecture.

**Live Demo:** [career-net-ebon.vercel.app](https://career-net-ebon.vercel.app)

**Video Link:** https://drive.google.com/file/d/1oNYiyIjN71FIu5jwe05xElPwfgFs6qKS/view?usp=share_link

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17 + Spring Boot 3.x |
| Frontend | Next.js 16.2.6 + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Primary Database | PostgreSQL (Supabase) |
| NoSQL | MongoDB Atlas |
| Cache | Redis (Upstash) |
| Message Queue | RabbitMQ (CloudAMQP) |
| Authentication | AWS Cognito |
| AI Model | Google Gemini 2.0 Flash |
| Containerization | Docker |
| Cloud | Azure Container Apps + Vercel |

---

## Services

| Service | Port | Responsibility |
|---|---|---|
| `api-gateway` | 8080 | Single entry point, JWT validation |
| `job-service` | 8081 | Job CRUD, Redis cache, RabbitMQ publisher |
| `search-service` | 8082 | Job search, MongoDB search history |
| `notification-service` | 8083 | Notifications, job alerts, user profiles |
| `admin-service` | 8084 | Company registration and approval |
| `ai-agent-service` | 8085 | Gemini-powered AI chat assistant |
| `frontend` | 3000 | Next.js UI |

---

## Features

- **Job Search** — Filter by position, city, country, working preference; Turkish character support
- **Nearby Jobs** — Browser geolocation → nearest jobs via OpenStreetMap
- **Autocomplete** — Real-time suggestions for position and city fields
- **Company Approval Flow** — Company registers → admin approves → job posting enabled
- **Notification System** — Create job alerts, receive notifications for matching new jobs
- **User Profile** — Name, surname, phone, gender, age, profession
- **Application Tracking** — Applied jobs listed in the header dropdown
- **AI Assistant** — Gemini-powered chat; search jobs and query job details conversationally
- **Authentication** — AWS Cognito — register, login, email verification

---

## Assumptions

1. **Shared database** — All services share one Supabase PostgreSQL instance to keep costs low. In a real microservices deployment each service would own its own schema.
2. **In-app notifications only** — Notifications are stored in PostgreSQL and polled by the frontend every 30 seconds. No email or SMS delivery.
3. **Apply flow is minimal** — Clicking "Başvur" inserts a row in `applications`. Full ATS workflow (CV upload, interview scheduling, etc.) is out of scope.
4. **Company approval required** — A company must self-register and be approved by an admin (`is_verified = true`) before it can post jobs.
5. **AI chat is request/response** — No WebSocket or streaming; the full Gemini response is returned in a single HTTP call.
6. **Geolocation via Nominatim** — Browser coordinates are reverse-geocoded using OpenStreetMap Nominatim (free, no API key). Turkish characters (İ → I, ı → i) are normalised before DB queries.
7. **Gemini free tier** — `gemini-2.0-flash` is used. The free tier has rate limits; expect quota errors under sustained load.
8. **Authentication** — AWS Cognito only; no social/OAuth login. The API Gateway validates JWTs via Cognito JWKS. The `sub` claim is used as `userId` everywhere.
9. **Supabase connection pooler** — JDBC URL must use the pooler hostname and `?sslmode=require`; direct port 5432 is blocked.
10. **Saved jobs are client-side** — Bookmarked jobs are stored in `localStorage` (`careernet_saved_jobs`); clearing the browser wipes them.

---

## Issues Encountered

| Area | Problem | Fix |
|---|---|---|
| **Pipeline** | GitHub Actions pushed images to ACR but Container Apps were pulling from `ghcr.io` → `az containerapp update` failed every run | Rewrote pipeline to push to GHCR using built-in `GITHUB_TOKEN` |
| **Pipeline** | `workflow_dispatch` caused all deploy jobs to be skipped — `dorny/paths-filter` returns empty outputs for manual triggers | Added `github.event_name == 'workflow_dispatch' && 'true'` fallback in `changes` job outputs |
| **Pipeline** | `az containerapp update --image :latest` didn't create a new revision (same tag string = no change detected) | Switched to per-commit SHA tag in `az containerapp update` |
| **Pipeline** | `GITHUB_TOKEN` couldn't push to existing GHCR packages — `permission_denied: write_package` | Granted `career.net` repo write access to each package via GitHub Package settings |
| **Search** | Multi-word searches ("Frontend Developer", "Java Developer") returned 0 results | `UriComponentsBuilder.toUriString()` left spaces unencoded; WebClient re-encoded them as `%2520`. Fixed by using the `uri(uriBuilder -> ...)` lambda so WebClient handles encoding internally |
| **Job service** | `GET /api/v1/jobs/my-applications` returned 400 instead of 401 when called without a token | `GET /api/v1/jobs/**` was `permitAll` in SecurityConfig — unauthenticated requests reached the controller with `null` `Authentication`, causing NPE → 400. Added explicit `authenticated()` rules before the wildcard |
| **Job service** | New `my-job-applications` endpoint returned UUID parse error | Endpoint not yet deployed; `GET /api/v1/jobs/{id}` was intercepting "my-job-applications" as a path variable |
| **Supabase** | `DB_PORT=5432` → connection refused | Supabase connection pooler requires port `6543` |
| **RabbitMQ** | Single `RABBITMQ_URL` secret → service failed to start | Split into four separate secrets: `HOST`, `USERNAME`, `PASSWORD`, `VHOST` |
| **Header** | Redesigned `Header.tsx` had no effect on the live site | File was written to root `/components/` instead of `frontend/components/` — Next.js `@/` alias points to the `frontend/` directory |
| **Notifications** | Clicking a notification didn't decrement the badge count | `markRead` API was called but the React Query cache wasn't updated. Fixed with optimistic update: filter the notification out immediately, revert on error |
| **Applications** | New applications were saved with status `APPLIED` instead of `PENDING` | Changed `@PrePersist` default from `"APPLIED"` to `"PENDING"` in the `Application` entity |

---

## Local Development

### Prerequisites

- Docker Desktop
- Java 17 + Maven
- Node.js 20+

### Start Local Infrastructure

```bash
docker-compose up -d
```

Starts MongoDB, Redis, and RabbitMQ locally.

### Environment Variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
# PostgreSQL (Supabase)
DB_HOST=...
DB_PASSWORD=...

# MongoDB Atlas
MONGO_URI=mongodb+srv://...

# Redis (Upstash)
REDIS_URL=rediss://...

# RabbitMQ (CloudAMQP)
RABBITMQ_HOST=...
RABBITMQ_USERNAME=...
RABBITMQ_PASSWORD=...
RABBITMQ_VHOST=...

# AWS Cognito
COGNITO_USER_POOL_ID=...

# Gemini
GEMINI_API_KEY=...
```

### Run a Service

```bash
cd services/job-service
mvn spring-boot:run
```

### Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Deployment

Backend is deployed on **Azure Container Apps**, frontend on **Vercel**.

### Build & Push Docker Image

```bash
docker build --platform linux/amd64 -t ghcr.io/USERNAME/career-net-job-service:latest services/job-service/
docker push ghcr.io/USERNAME/career-net-job-service:latest
```

Full deployment guide: [docs/deployment.md](docs/deployment.md)

---

## Entity-Relationship Diagram

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR cognito_user_id UK
        VARCHAR email
        VARCHAR name
        VARCHAR surname
        VARCHAR phone
        VARCHAR gender
        INT age
        VARCHAR profession
        VARCHAR city
        VARCHAR country
        TIMESTAMP created_at
    }

    companies {
        UUID id PK
        VARCHAR name
        VARCHAR cognito_user_id
        BOOLEAN is_admin
        BOOLEAN is_verified
        TIMESTAMP created_at
    }

    jobs {
        UUID id PK
        VARCHAR title
        TEXT description
        UUID company_id FK
        VARCHAR country
        VARCHAR city
        VARCHAR town
        VARCHAR working_preference
        TEXT requirements
        VARCHAR salary_range
        TIMESTAMP posted_at
        TIMESTAMP expires_at
        BOOLEAN is_active
    }

    applications {
        UUID id PK
        UUID job_id FK
        VARCHAR user_id
        TIMESTAMP applied_at
        VARCHAR status
    }

    notifications {
        UUID id PK
        VARCHAR user_id
        VARCHAR title
        TEXT message
        UUID job_id FK
        BOOLEAN is_read
        TIMESTAMP created_at
    }

    job_alerts {
        UUID id PK
        VARCHAR user_id
        VARCHAR position_keywords
        VARCHAR city
        VARCHAR working_preference
        BOOLEAN is_active
        TIMESTAMP created_at
    }

    companies ||--o{ jobs : "posts"
    jobs ||--o{ applications : "receives"
    jobs ||--o{ notifications : "triggers"
    users ||--o{ applications : "submits"
    users ||--o{ job_alerts : "creates"
    users ||--o{ notifications : "receives"
```

> **Not:** `applications.user_id` ve `notifications.user_id`, `users.cognito_user_id` üzerinden ilişkilendirilir (UUID FK değil, Cognito sub string).

---

## Architecture

```
Frontend (Vercel)
      │
      ▼
API Gateway (Azure Container Apps)
      │
      ├── job-service          → PostgreSQL + Redis + RabbitMQ
      ├── search-service       → MongoDB + job-service
      ├── notification-service → PostgreSQL + MongoDB + RabbitMQ
      ├── admin-service        → PostgreSQL + job-service
      └── ai-agent-service     → MongoDB + Gemini API
```

For detailed architecture: [docs/architecture.md](docs/architecture.md)

---

## Project Structure

```
career.net/
├── services/
│   ├── api-gateway/
│   ├── job-service/
│   ├── search-service/
│   ├── notification-service/
│   ├── admin-service/
│   └── ai-agent-service/
├── frontend/
├── docs/
│   ├── init.sql
│   ├── architecture.md
│   ├── deployment.md
│   └── phases-and-flows.md
└── docker-compose.yml
```
