# career.net — Tech Stack & Architecture

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Backend language | Java | 17 | All microservices |
| Backend framework | Spring Boot | 3.2.5 | REST APIs, dependency injection, JPA, security |
| Build tool | Maven | 3.x | Dependency management, packaging |
| Frontend framework | Next.js | 16.2.6 | React-based UI with app router |
| Frontend language | TypeScript | 5.x | Type-safe frontend code |
| Frontend styling | Tailwind CSS v4 | — | Utility-first CSS |
| Frontend state | Zustand + TanStack React Query | — | Global state + server data fetching |
| Primary database | **Supabase** (PostgreSQL 16) | — | Relational data: jobs, companies, users, alerts, notifications |
| NoSQL database | **MongoDB Atlas** | 7 | Search history + AI chat sessions |
| Cache | Redis (**Upstash**) | 7 | Distributed job posting cache |
| Message queue | RabbitMQ (**CloudAMQP**) | 3 | Async event: new job → notification pipeline |
| Authentication | AWS Cognito | — | User pool, JWT issuance, JWKS validation |
| AI model | Google Gemini | gemini-2.0-flash | AI agent chat (tool calling via REST API) |
| Geolocation | OpenStreetMap Nominatim | — | Free reverse geocoding (no API key) |
| Containerization | Docker | — | One Dockerfile per service |
| Cloud platform | **Azure** | — | Azure Container Apps, Azure Container Registry |
| Scheduling | Spring `@Scheduled` + Azure Timer | — | Notification scheduled tasks |

---

## System Architecture

```
                        ┌─────────────┐
                        │   Frontend  │  Next.js 16  :3000
                        │  (Next.js)  │
                        └──────┬──────┘
                               │ HTTP (all requests via gateway)
                        ┌──────▼──────┐
                        │ API Gateway │  Spring Cloud Gateway  :8080
                        │             │  • JWT validation (Cognito JWKS)
                        │             │  • Route /api/v1/** to services
                        └──┬──┬──┬──┬─┘
           ┌───────────────┘  │  │  └────────────────────┐
           │         ┌────────┘  └──────┐                 │
    ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │ Job Service │  │   Search    │  │Notification │  │   Admin     │  │  AI Agent   │
    │   :8081     │  │  Service    │  │  Service    │  │  Service    │  │  Service    │
    │             │  │   :8082     │  │   :8083     │  │   :8084     │  │   :8085     │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┘  └──────┬──────┘
           │                │                 │                                   │
           │         ┌──────▼──────┐          │                          ┌────────▼──────┐
           │         │   MongoDB   │          │                          │  Gemini API   │
           │         │   Atlas     │          │                          │ (Google REST) │
           │         └─────────────┘          │                          └───────────────┘
    ┌──────▼─────────────────────────────────▼──────┐
    │              PostgreSQL (Supabase)              │
    │  jobs · companies · users · job_alerts          │
    │  notifications · applications                   │
    └────────────────────────────────────────────────┘
           │
    ┌──────▼──────┐       ┌─────────────────────────┐
    │    Redis    │       │        RabbitMQ          │
    │  (Upstash)  │       │  queue: job.created      │
    │   Cache     │       │  job-service → pub       │
    └─────────────┘       │  notification-svc → sub  │
                          └─────────────────────────┘
```

---

## Service Responsibilities

### API Gateway (`services/api-gateway` — port 8080)
- Single entry point for all client requests
- Validates AWS Cognito JWTs using the JWKS endpoint before forwarding
- Routes `/api/v1/jobs/**` → job-service, `/api/v1/search/**` → search-service, `/api/v1/profile/**` → notification-service, etc.
- Does **not** hold business logic

### Job Service (`services/job-service` — port 8081)
- Owns the `jobs`, `companies`, and `applications` PostgreSQL tables
- All job reads go through Redis cache (`@Cacheable`); cache is evicted on writes. Cache errors are swallowed gracefully — service falls back to DB if Redis is unavailable.
- Publishes a `JobCreatedEvent` to RabbitMQ `job.created` queue on every new job posting
- Autocomplete and city search normalize Turkish characters (İ→I, ı→i) for case-insensitive matching

### Search Service (`services/search-service` — port 8082)
- Accepts search queries (position, city, country, town, workingPreference)
- Persists every search as a document in MongoDB `job_searches` collection
- Calls Job Service to fetch actual job results
- `GET /api/v1/search/recent` returns the last 10 searches for a user/session

### Notification Service (`services/notification-service` — port 8083)
- Manages `job_alerts`, `notifications`, and `users` (profile) PostgreSQL tables
- **RabbitMQ consumer**: listens on `job.created`; matches job against all active `job_alerts`; writes `notifications` rows
- **Scheduled task 1** (`process-job-alerts`): backup matching on a schedule
- **Scheduled task 2** (`process-related-jobs`): queries MongoDB search history, finds related new jobs via job-service HTTP call, writes notifications
- Exposes `GET/PUT /api/v1/notifications`, `POST/GET/DELETE /api/v1/alerts`, `GET/PUT /api/v1/profile`

### Admin Service (`services/admin-service` — port 8084)
- Company self-registration (`POST /api/v1/admin/companies/register`)
- Admin approves via `PUT /api/v1/admin/companies/{id}/verify` — only then can the company post jobs
- Job delegation: `POST /api/v1/admin/jobs` calls job-service internally via RestTemplate

### AI Agent Service (`services/ai-agent-service` — port 8085)
- Stores chat sessions in MongoDB `ai_chat_sessions`
- Calls Gemini `gemini-2.0-flash` with function tools: `search_jobs(position, city)` and `get_job_details(id)`
- Tool call loop: Gemini returns functionCall → service calls internal API → injects functionResponse → re-submits to Gemini
- No streaming — full response in one HTTP call

### Frontend (`frontend` — port 3000)
- Next.js 16.2.6 + React 19, App Router; all pages under `app/`
- Auth via AWS Amplify; Cognito idToken attached to every API request via axios interceptor
- All `/api/v1/*` requests proxied to API Gateway via `next.config.ts` rewrite (no CORS)
- Header: profile avatar dropdown (Bilgilerim / Bildirimler tabs) + logout icon
- Key pages: `/` (home + geolocation), `/search` (filters + results), `/jobs/[id]` (detail + apply), `/alerts`, `/profile`, `/admin`

---

## Data Model

### PostgreSQL Tables

```
users
  id (UUID PK) · cognito_user_id (unique) · email · city · country · created_at
  name · surname · phone · gender · age · profession   ← profil alanları

companies
  id (UUID PK) · name · cognito_user_id · is_admin · is_verified · created_at

jobs
  id (UUID PK) · title · description · company_id (FK→companies) · country · city · town
  working_preference (FULLTIME|PARTTIME|REMOTE|HYBRID) · requirements · salary_range
  posted_at · expires_at · is_active

job_alerts
  id (UUID PK) · user_id (Cognito sub) · position_keywords · city · working_preference
  created_at · is_active

notifications
  id (UUID PK) · user_id (Cognito sub) · title · message · job_id (FK→jobs)
  is_read · created_at

applications
  id (UUID PK) · job_id (FK→jobs) · user_id (Cognito sub) · applied_at · status
```

### MongoDB Collections

```
job_searches
  { userId, sessionId, position, city, filters: {country, town, workingPreference},
    resultsCount, createdAt }

ai_chat_sessions
  { sessionId, userId, messages: [{role, content, timestamp}], createdAt }
```

### Redis Keys

```
job:{uuid}                     TTL 1h    — single job JSON
jobs:city:{city}               TTL 15m   — nearby jobs list
jobs:search:{sha256_of_params} TTL 10m   — paginated search result
```

---

## API Overview

All endpoints are prefixed `/api/v1/`. Pagination: `?page=0&size=20`.

| Service | Method | Path | Auth |
|---|---|---|---|
| Job | GET | `/jobs`, `/jobs/{id}`, `/jobs/nearby?city=`, `/jobs/autocomplete/position?q=`, `/jobs/autocomplete/city?q=` | Public |
| Job | POST/PUT | `/jobs`, `/jobs/{id}` | Verified company/admin |
| Job | DELETE | `/jobs/{id}` | Admin |
| Job | POST | `/jobs/{id}/apply` | User |
| Job | GET | `/jobs/my-applications` | User |
| Search | POST | `/search` | Public |
| Search | GET | `/search/recent` | User / Public |
| Notification | GET/PUT | `/notifications`, `/notifications/{id}/read` | User |
| Notification | POST/GET/DELETE | `/alerts`, `/alerts/{id}` | User |
| Notification | POST | `/scheduler/process-job-alerts`, `/scheduler/process-related-jobs` | Internal |
| Profile | GET/PUT | `/profile` | User |
| Admin | POST | `/admin/companies/register` | User |
| Admin | GET/PUT | `/admin/companies`, `/admin/companies/{id}/verify` | Admin |
| Admin | POST | `/admin/jobs` | Verified company/admin |
| AI Agent | POST | `/ai/chat` | User/Anonymous |
| AI Agent | GET | `/ai/chat/{sessionId}` | User |

---

## Deployment (Azure Container Apps)

```
Azure Container Registry (ACR)
       ↓
Docker image build (multi-stage Maven)
       ↓
Azure Container Apps Environment
  ├── job-service          :8081
  ├── search-service       :8082
  ├── notification-service :8083
  ├── admin-service        :8084
  ├── ai-agent-service     :8085
  ├── api-gateway          :8080
  └── frontend             :3000

External managed services:
  Supabase (PostgreSQL)  — primary DB; use pooler URL + sslmode=require
  MongoDB Atlas          — NoSQL search history + AI sessions
  Upstash (Redis)        — job cache (rediss:// SSL)
  CloudAMQP (RabbitMQ)  — message queue (amqps:// SSL, port 5671)
  AWS Cognito            — auth (JWT)
  Google Gemini API      — AI model
```

Each service has its own `Dockerfile` using a multi-stage Maven build:
1. `maven:3.9-eclipse-temurin-17` — compiles and packages the JAR
2. `eclipse-temurin:17-jre-alpine` — runs the JAR (slim runtime image)

**Important:** Build with `--platform linux/amd64` on Apple Silicon Macs.
