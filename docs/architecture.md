# career.net — Tech Stack & Architecture

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Backend language | Java | 17 | All microservices |
| Backend framework | Spring Boot | 3.2.5 | REST APIs, dependency injection, JPA, security |
| Build tool | Maven | 3.x | Dependency management, packaging |
| Frontend framework | Next.js | 14 | React-based UI with app router |
| Frontend language | TypeScript | 5.x | Type-safe frontend code |
| Frontend styling | Tailwind CSS + shadcn/ui | — | Utility-first CSS + component library |
| Primary database | **Supabase** (PostgreSQL 16) | — | Relational data: jobs, companies, users, alerts, notifications |
| NoSQL database | **MongoDB Atlas** | 7 | Search history + AI chat sessions |
| Cache | Redis (Upstash / AWS ElastiCache) | 7 | Distributed job posting cache |
| Message queue | RabbitMQ (local Docker / Amazon MQ) | 3 | Async event: new job → notification pipeline |
| Authentication | AWS Cognito | — | User pool, JWT issuance, JWKS validation |
| AI model | Google Gemini | gemini-1.5-flash | AI agent chat (tool calling via REST API) |
| Geolocation | OpenStreetMap Nominatim | — | Free reverse geocoding (no API key) |
| Containerization | Docker | — | One Dockerfile per service |
| Cloud platform | AWS | — | ECS Fargate, ElastiCache, Amazon MQ, ECR |
| Scheduling | AWS EventBridge Scheduler | — | Triggers notification scheduled tasks |

---

## System Architecture

```
                        ┌─────────────┐
                        │   Frontend  │  Next.js  :3000
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
    │                  PostgreSQL (AWS RDS)           │
    │  jobs · companies · users · job_alerts          │
    │  notifications · applications                   │
    └────────────────────────────────────────────────┘
           │
    ┌──────▼──────┐       ┌─────────────────────────┐
    │    Redis    │       │        RabbitMQ          │
    │ (ElastiCache│       │  queue: job.created      │
    │   Cache)    │       │  job-service → pub       │
    └─────────────┘       │  notification-svc → sub  │
                          └─────────────────────────┘
```

---

## Service Responsibilities

### API Gateway (`services/api-gateway` — port 8080)
- Single entry point for all client requests
- Validates AWS Cognito JWTs using the JWKS endpoint before forwarding
- Routes `/api/v1/jobs/**` → job-service, `/api/v1/search/**` → search-service, etc.
- Does **not** hold business logic

### Job Service (`services/job-service` — port 8081)
- Owns the `jobs`, `companies`, and `applications` PostgreSQL tables
- All job reads go through Redis cache (`@Cacheable`); cache is evicted on writes
- Publishes a `JobCreatedEvent` to RabbitMQ `job.created` queue on every new job posting
- Autocomplete endpoints query the DB with `ILIKE` (position titles, city names)

### Search Service (`services/search-service` — port 8082)
- Accepts search queries (position, city, country, town, workingPreference)
- Persists every search as a document in MongoDB `job_searches` collection (for recent-searches history and related-job notifications)
- Calls Job Service to fetch actual job results; applies filters
- `GET /api/v1/search/recent` returns the last 10 searches for a user/session

### Notification Service (`services/notification-service` — port 8083)
- Manages `job_alerts` and `notifications` PostgreSQL tables
- **RabbitMQ consumer**: listens on `job.created`; when a new job arrives, matches it against all active `job_alerts` and writes a row to `notifications` for each match
- **Scheduled task 1** (`process-job-alerts`): same matching logic, runs on a schedule for any jobs missed by the queue
- **Scheduled task 2** (`process-related-jobs`): queries MongoDB for searches a user made in the last 7 days, finds related new jobs, writes notifications
- Exposes `GET /api/v1/notifications` (unread list) and `PUT /api/v1/notifications/{id}/read`
- No email is sent; notifications are displayed in the frontend UI as a bell badge

### Admin Service (`services/admin-service` — port 8084)
- Manages company self-registration (`POST /api/v1/admin/companies/register`)
- Admins approve companies via `PUT /api/v1/admin/companies/{id}/verify`
- Verified companies and admins can post jobs; admin-service delegates job creation to job-service
- Admin privilege is determined by the `is_admin` flag in the `companies` table (checked against the Cognito `sub` claim)

### AI Agent Service (`services/ai-agent-service` — port 8085)
- Stores chat sessions in MongoDB `ai_chat_sessions` collection
- On each message, calls Gemini `gemini-1.5-flash` with a system prompt that declares function tools: `search_jobs(position, city)` and `get_job_details(id)`
- When Gemini requests a tool call, the service executes the corresponding internal API call, injects the result as a `functionResponse`, and re-submits to Gemini for the final answer
- Returns a structured response: AI text + list of job cards (title, company, requirements, apply link)
- No real-time streaming — full response returned in one HTTP call

### Frontend (`frontend` — port 3000)
- Next.js 14 App Router; all pages under `app/`
- Auth state managed by AWS Amplify (`@aws-amplify/auth`); Cognito tokens stored in browser and attached to all API requests
- Server-side data fetching for job listings (SEO not required; RSC used for simplicity)
- Key UI features: position + city autocomplete, browser geolocation → nearest jobs, "Son Aramalarim" recent searches panel, left-side filter pane with chip-style active filters, floating AI chat window (bottom-right, all authenticated pages), notification bell in header

---

## Data Model

### PostgreSQL Tables

```
users
  id (UUID PK) · cognito_user_id (unique) · email · city · country · created_at

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
job:{uuid}                     TTL 1h    — single job JSON (set on create, evicted on update/delete)
jobs:city:{city}               TTL 15m   — list of job UUIDs for homepage nearby
jobs:search:{sha256_of_params} TTL 10m   — paginated search result JSON
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
| Search | POST | `/search` | Public |
| Search | GET | `/search/recent`, `/search/results` | User / Public |
| Notification | GET/PUT | `/notifications`, `/notifications/{id}/read` | User |
| Notification | POST/GET/PUT/DELETE | `/alerts`, `/alerts/{id}` | User |
| Notification | POST | `/scheduler/process-job-alerts`, `/scheduler/process-related-jobs` | Internal (EventBridge) |
| Admin | POST | `/admin/companies/register` | User |
| Admin | GET/PUT | `/admin/companies`, `/admin/companies/{id}/verify` | Admin |
| Admin | POST | `/admin/jobs` | Verified company/admin |
| AI Agent | POST | `/ai/chat` | User/Anonymous |
| AI Agent | GET | `/ai/chat/{sessionId}` | User |

---

## Deployment (AWS ECS Fargate)

```
ECR Repository per service
       ↓
ECS Task Definition (Dockerfile → image)
       ↓
ECS Service (Fargate, VPC private subnet)
       ↓
Application Load Balancer (public)
       ↓
Route 53 (career.net domain)

External managed services:
  Supabase (PostgreSQL)   — primary DB (cloud, not AWS RDS)
  MongoDB Atlas           — NoSQL search history + AI sessions
  Upstash / ElastiCache   — Redis job cache
  Amazon MQ (RabbitMQ)    — message queue
  AWS Cognito             — auth
  AWS EventBridge         — cron triggers for notification tasks
  Google Gemini API       — AI model for chat agent
```

Each service has its own `Dockerfile` using a multi-stage Maven build:
1. `maven:3.9-eclipse-temurin-17` — compiles and packages the JAR
2. `eclipse-temurin:17-jre-alpine` — runs the JAR (slim runtime image)
