# career.net — Implementation Phases & System Flows

---

## Implementation Phases

### Phase 1 — Foundation ✅ Done
**Goal:** Everything the other services depend on before a single line of business logic is written.

| Task | Output |
|---|---|
| `git init` + folder structure | `services/`, `frontend/`, `docs/` directories |
| `docker-compose.yml` | Local MongoDB, Redis, RabbitMQ |
| `docs/init.sql` | Full DB schema + seed data (7 jobs, 3 companies) |
| `.env.example` | All env vars documented |
| `docs/assumptions.md` | Documented decisions |

---

### Phase 2 — Job Service ✅ Done
**Goal:** Core data layer. Every other service depends on jobs existing.

| Task | Key Detail |
|---|---|
| JPA entities: `Job`, `Company`, `Application` | `Job` implements `Serializable` so Redis can store it |
| `JobRepository` | Custom JPQL + native queries; Turkish char normalization (İ→I) |
| Redis cache config | 3 named caches: `jobs` (1h), `cityJobs` (15m), `jobSearch` (10m); graceful fallback if Redis down |
| RabbitMQ publisher | Publishes `JobCreatedEvent` on every `POST /api/v1/jobs` |
| `SecurityConfig` | GETs are public; POSTs/PUTs/DELETEs require Cognito JWT |
| `JobController` + `ApplicationController` | REST endpoints + my-applications endpoint |
| `GlobalExceptionHandler` | `@NotBlank` validation → 400; `DataAccessException` → 503 |
| `Dockerfile` | Multi-stage: Maven build → JRE Alpine |

---

### Phase 3 — Search Service ✅ Done
**Goal:** Search with filter support, store every search in MongoDB.

| Task | Key Detail |
|---|---|
| Spring Boot project setup | Port 8082, MongoDB + WebClient |
| `JobSearch` MongoDB document | Fields: `userId`, `sessionId`, `position`, `city`, `filters`, `resultsCount`, `createdAt` |
| `SearchController` | `POST /api/v1/search` — stores search, calls Job Service, returns results |
| `GET /api/v1/search/recent` | Last 10 documents for `userId` or `sessionId` |

---

### Phase 4 — Admin Service ✅ Done
**Goal:** Company self-registration + admin approval before job posting.

| Task | Key Detail |
|---|---|
| `CompanyController` | `POST /register`, `GET /companies`, `PUT /{id}/verify` |
| Admin check | `is_admin` flag from `companies` table matched against Cognito `sub` |
| Job delegation | `POST /admin/jobs` calls Job Service via RestTemplate; forwards JWT |
| `GlobalExceptionHandler` | 403 for unverified/unauthorized; `HttpClientErrorException` parsing for upstream errors |

---

### Phase 5 — Notification Service ✅ Done
**Goal:** Alert users about matching new jobs via in-app notifications + manage user profiles.

| Task | Key Detail |
|---|---|
| `JobAlert` + `Notification` JPA entities | Mapped to `job_alerts` and `notifications` tables |
| `UserProfile` JPA entity | Mapped to `users` table; profile fields: name, surname, phone, gender, age, profession |
| RabbitMQ consumer | `@RabbitListener` on `job.created`; null-safe city/workingPreference matching |
| Scheduled task 1 | `process-job-alerts` every 5 min |
| Scheduled task 2 | `process-related-jobs` daily; fetches recent jobs from job-service via RestTemplate |
| `ProfileController` | `GET/PUT /api/v1/profile` — user profile management |
| `GlobalExceptionHandler` | Catches all exceptions; returns structured JSON errors |

---

### Phase 6 — AI Agent Service ✅ Done
**Goal:** Gemini-powered chat that can search and display jobs conversationally.

| Task | Key Detail |
|---|---|
| `AiChatSession` MongoDB document | Fields: `sessionId`, `userId`, `messages[]`, `createdAt` |
| Gemini WebClient config | `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}` |
| Function declarations | `search_jobs(position, city)` and `get_job_details(id)` as Gemini tools |
| Tool execution loop | Gemini `functionCall` → internal API → `functionResponse` → final answer |
| Error handling | try-catch wraps entire chat(); 429 quota → user-friendly message |
| `POST /api/v1/ai/chat` | Return AI text + job cards |

---

### Phase 7 — API Gateway ✅ Done
**Goal:** Single entry point; validate auth before forwarding.

| Task | Key Detail |
|---|---|
| Spring Cloud Gateway | Port 8080 |
| Route definitions | `/api/v1/jobs/**` → 8081, `/search/**` → 8082, `/notifications/**` + `/alerts/**` + `/profile/**` → 8083, `/admin/**` → 8084, `/ai/**` → 8085 |
| JWT filter | Validates Bearer token against Cognito JWKS |

---

### Phase 8 — Frontend ✅ Done
**Goal:** Next.js 16.2.6 + React 19 UI covering all user-facing use cases.

| Page / Component | What it does |
|---|---|
| `/` Home | Position + city search with autocomplete; geolocation → nearest jobs; recent searches panel; gradient hero |
| `/search` Results | Left filter pane (country, city, town, working preference); active filter chips; paginated job list |
| `/jobs/[id]` Detail | Full job info (title, company, location with country, working type) + Apply button |
| `/alerts` | Create/list/delete job alerts |
| `/admin` | Company registration + job posting form (country field included) |
| `/profile` | View + edit profile (name, surname, email, phone, gender, age, profession) |
| `/auth/login` | Cognito sign-in/register via AWS Amplify |
| `<Header />` | Profile avatar dropdown (Bilgilerim / Bildirimler tabs + başvurular listesi) + logout icon |
| `<ChatWindow />` | Floating AI chat (bottom-right) |

---

### Phase 9 — Deployment Artifacts ✅ Done
**Goal:** Make every service deployable to Azure Container Apps.

| Task | Key Detail |
|---|---|
| `Dockerfile` in each service | Stage 1: `maven:3.9-eclipse-temurin-17` → `mvn package`; Stage 2: `eclipse-temurin:17-jre-alpine` → run JAR; build with `--platform linux/amd64` |
| `taskdef/` folder | ECS Task Definition JSONs (reference artifacts, deployment moved to Azure) |
| Azure Container Registry | One image per service |
| Azure Container Apps | One container app per service in shared environment |

---

## System Flows

### 1. User Registers / Logs In

```
Browser
  │── POST /auth/signup ──► AWS Cognito
  │                              │── creates user in User Pool
  │◄── JWT (access + refresh) ───┘
  │
  Browser stores token via AWS Amplify; attaches to every API request
```

---

### 2. Home Page Load (Geolocation + Nearby Jobs)

```
Browser
  │── navigator.geolocation.getCurrentPosition()
  │   └── coords {lat, lng}
  │── GET nominatim.openstreetmap.org/reverse → "Istanbul"
  │
  │── GET /api/v1/jobs/nearby?city=Istanbul ──► Gateway ──► Job Service
  │                                                  │── normalizeCity("Istanbul") → "istanbul"
  │                                                  │── Redis: GET jobs:city:istanbul
  │                                                  │   HIT  ──► return cached list
  │                                                  │   MISS ──► DB query → cache → return
  │◄── 5 job cards ───────────────────────────────────┘
```

---

### 3. Job Search with Filters

```
Browser (user types "Web Developer" + "Istanbul" + REMOTE filter)
  │── POST /api/v1/search ──► Gateway ──► Search Service
  │                                           │── MongoDB: insert job_searches document
  │                                           │── GET /api/v1/jobs (Job Service)
  │                                           │    └── JPQL Specification + normalize city
  │◄── { results, total, page } ──────────────┘
```

---

### 4. Company Posts a Job

```
Verified Company (authenticated)
  │── POST /api/v1/admin/jobs ──► Gateway ──► Admin Service
  │                                               │── check is_verified = true (else 403)
  │                                               │── POST /api/v1/jobs ──► Job Service
  │                                                        │── INSERT INTO jobs
  │                                                        │── @CacheEvict
  │                                                        │── RabbitMQ publish: JobCreatedEvent
  │◄── JobResponse ─────────────────────────────────────────┘
```

---

### 5. Notification: Job Alert Match

```
RabbitMQ queue: job.created
  │
  Notification Service (consumer)
  │── receive JobCreatedEvent
  │── SELECT * FROM job_alerts WHERE is_active = true
  │── for each alert: matches(alert, event) — null-safe city/workingPreference check
  │── INSERT INTO notifications for matching users
  │
  Frontend header polls GET /api/v1/notifications every 30s
  │── shows badge count; dropdown shows notification list
  │── click → navigate to job; mark as read
```

---

### 6. Related Job Notification (Scheduled Task)

```
Spring @Scheduled (daily 09:00 TR) or Azure Timer
  │── POST /api/v1/scheduler/process-related-jobs ──► Notification Service
  │
  Notification Service
  │── GET /api/v1/jobs?page=0&size=100 ──► Job Service (recent jobs)
  │── MongoDB: find job_searches (last 7 days, userId not null)
  │── group by userId → search terms
  │── for each user × job: if title contains search term → INSERT notifications
```

---

### 7. AI Agent Chat

```
Browser
  │── POST /api/v1/ai/chat { sessionId, message } ──► Gateway ──► AI Agent Service
  │
  AI Agent Service
  │── load history from MongoDB
  │── POST gemini-2.0-flash:generateContent
  │    tools: [search_jobs(position,city), get_job_details(id)]
  │
  Gemini: functionCall search_jobs("developer", "Istanbul")
  │── POST /api/v1/search ──► Search Service ──► Job Service
  │◄── [job1, job2, job3]
  │── re-submit to Gemini with functionResponse
  │◄── { text: "İşte bulduğum ilanlar...", jobCards: [...] }
  │
  Browser renders chat bubble + job cards
```

---

### 8. Apply to a Job

```
Browser (user clicks Apply)
  │── POST /api/v1/jobs/{id}/apply ──► Gateway ──► Job Service
  │                                        │── check already applied? → 409
  │                                        │── INSERT INTO applications
  │◄── { applicationId, status: "PENDING" }
  │
  Header dropdown "Başvurularım" section shows the new application
```
