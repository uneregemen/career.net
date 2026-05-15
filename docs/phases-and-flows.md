# career.net — Implementation Phases & System Flows

---

## Implementation Phases

### Phase 1 — Foundation ✅ Done
**Goal:** Everything the other services depend on before a single line of business logic is written.

| Task | Output |
|---|---|
| `git init` + folder structure | `services/`, `frontend/`, `docs/` directories |
| `docker-compose.yml` | Local PostgreSQL, MongoDB, Redis, RabbitMQ |
| `docs/init.sql` | Full DB schema + seed data (7 jobs, 3 companies) |
| `.env.example` | All env vars documented with local defaults |
| `docs/assumptions.md` | 10 documented decisions |

---

### Phase 2 — Job Service 🔄 In Progress
**Goal:** Core data layer. Every other service depends on jobs existing.

| Task | Key Detail |
|---|---|
| JPA entities: `Job`, `Company`, `Application` | `Job` implements `Serializable` so Redis can store it |
| `JobRepository` | Custom JPQL query for multi-field search with optional params |
| Redis cache config | 3 named caches: `jobs` (1h), `cityJobs` (15m), `jobSearch` (10m) |
| RabbitMQ publisher | Publishes `JobCreatedEvent` on every `POST /api/v1/jobs` |
| `SecurityConfig` | GETs are public; POSTs/PUTs/DELETEs require Cognito JWT |
| `JobService` | `@Cacheable` on reads, `@CacheEvict` on writes |
| `Dockerfile` | Multi-stage: Maven build → JRE Alpine |

Still needed to complete Phase 2:
- `JobController` — REST endpoints wired to `JobService`
- `ApplicationService` + `ApplicationController`

---

### Phase 3 — Search Service
**Goal:** Search with filter support, store every search in MongoDB for history and related-job notifications.

| Task | Key Detail |
|---|---|
| Spring Boot project setup | Port 8082, MongoDB + PostgreSQL (read-only) dependencies |
| `JobSearch` MongoDB document | Fields: `userId`, `sessionId`, `position`, `city`, `filters`, `resultsCount`, `createdAt` |
| `SearchController` | `POST /api/v1/search` — stores search, calls Job Service, returns results |
| `GET /api/v1/search/recent` | Returns last 10 documents for `userId` or `sessionId` from MongoDB |
| `GET /api/v1/search/results` | Delegated filter query to Job Service |
| `Dockerfile` | Multi-stage Maven build |

---

### Phase 4 — Admin Service
**Goal:** Let companies self-register and admins approve them before they can post jobs.

| Task | Key Detail |
|---|---|
| Spring Boot project setup | Port 8084, PostgreSQL only |
| `CompanyController` | `POST /register`, `GET /companies`, `PUT /{id}/verify` |
| Admin check | Read `is_admin` from `companies` table by matching Cognito `sub` from JWT |
| Job delegation | `POST /admin/jobs` calls Job Service internally via `RestTemplate` |
| `Dockerfile` | Multi-stage Maven build |

---

### Phase 5 — Notification Service
**Goal:** Alert users about matching new jobs via in-app notifications.

| Task | Key Detail |
|---|---|
| Spring Boot project setup | Port 8083, PostgreSQL + MongoDB (read-only for searches) |
| `JobAlert` + `Notification` JPA entities | Mapped to `job_alerts` and `notifications` tables |
| RabbitMQ consumer | `@RabbitListener` on `job.created` queue; matches job against all active `job_alerts` |
| Write notification | On match: `INSERT INTO notifications (user_id, title, message, job_id)` |
| Scheduled task 1 | `process-job-alerts` — re-runs alert matching on a schedule (catches any queue misses) |
| Scheduled task 2 | `process-related-jobs` — reads last 7 days of MongoDB `job_searches`, finds related new jobs, writes notifications |
| `GET /api/v1/notifications` | Returns unread notifications for authenticated user |
| `PUT /api/v1/notifications/{id}/read` | Marks one notification as read |
| `Dockerfile` | Multi-stage Maven build |

---

### Phase 6 — AI Agent Service
**Goal:** Gemini-powered chat that can search and display jobs conversationally.

| Task | Key Detail |
|---|---|
| Spring Boot project setup | Port 8085, MongoDB only |
| `AiChatSession` MongoDB document | Fields: `sessionId`, `userId`, `messages[]`, `createdAt` |
| Gemini WebClient config | `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}` |
| Function declarations | Declare `search_jobs(position, city)` and `get_job_details(id)` as Gemini tools |
| Tool execution loop | If Gemini returns a `functionCall`, execute it against internal APIs, re-submit result as `functionResponse` |
| `POST /api/v1/ai/chat` | Accept user message + sessionId → return AI text + job cards |
| `GET /api/v1/ai/chat/{sessionId}` | Return full chat history from MongoDB |
| `Dockerfile` | Multi-stage Maven build |

---

### Phase 7 — API Gateway
**Goal:** Single entry point for all traffic; validate auth before forwarding.

| Task | Key Detail |
|---|---|
| Spring Cloud Gateway setup | Port 8080 |
| Route definitions | `/api/v1/jobs/**` → 8081, `/api/v1/search/**` → 8082, `/api/v1/alerts/**` + `/api/v1/notifications/**` → 8083, `/api/v1/admin/**` → 8084, `/api/v1/ai/**` → 8085 |
| JWT filter | Validates Bearer token against Cognito JWKS before forwarding to protected routes |
| `Dockerfile` | Multi-stage Maven build |

---

### Phase 8 — Frontend
**Goal:** Next.js UI covering all user-facing use cases.

| Page / Component | What it does |
|---|---|
| `/` Home | Position + city search boxes with debounced autocomplete; browser geolocation → city → 5 nearby jobs; "Son Aramalarim" recent searches panel |
| `/search` Results | Left filter pane (country, city, town, working preference); active filters as chips with ×; paginated job list |
| `/jobs/[id]` Detail | Full job info + Apply button (records application, shows confirmation) |
| `/alerts` | Create / list / delete "İş Alarmı" job alerts |
| `/admin` | Company registration form; job posting form (verified companies only) |
| `/auth/login` | Cognito sign-in via AWS Amplify |
| `<ChatWindow />` | Floating bottom-right AI chat; available on all authenticated pages |
| `<NotificationBell />` | Header badge; polls `GET /api/v1/notifications`; marks as read on click |

Frontend setup commands:
```bash
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install @aws-amplify/auth @tanstack/react-query axios zustand
npx shadcn-ui@latest init
```

---

### Phase 9 — Deployment Artifacts
**Goal:** Make every service deployable to AWS ECS Fargate.

| Task | Key Detail |
|---|---|
| `Dockerfile` in each service | Stage 1: `maven:3.9-eclipse-temurin-17` → `mvn package`; Stage 2: `eclipse-temurin:17-jre-alpine` → run JAR |
| `taskdef/` folder | ECS Task Definition JSON per service (CPU, memory, env vars from AWS Secrets Manager) |
| ECR repositories | One per service; image tagged with git SHA |
| EventBridge rules | Two rules: `process-job-alerts` (every 5 min), `process-related-jobs` (daily) |

---

## System Flows

### 1. User Registers / Logs In

```
Browser
  │── POST /auth/signup ──► AWS Cognito
  │                              │── creates user in User Pool
  │◄── JWT (access + refresh) ───┘
  │
  │── POST /api/v1/users (optional profile save) ──► Gateway ──► Job Service
```

---

### 2. Home Page Load (Geolocation + Nearby Jobs)

```
Browser
  │── navigator.geolocation.getCurrentPosition()
  │   └── coords {lat, lng}
  │── GET nominatim.openstreetmap.org/reverse?lat=&lon= ──► "Istanbul"
  │
  │── GET /api/v1/jobs/nearby?city=Istanbul ──► Gateway ──► Job Service
  │                                                  │── Redis: GET jobs:city:istanbul
  │                                                  │   HIT  ──► return cached list
  │                                                  │   MISS ──► DB query → cache → return
  │◄── 5 job cards ───────────────────────────────────┘
  │
  │── GET /api/v1/search/recent ──► Gateway ──► Search Service
  │                                                  └── MongoDB: find({userId}) → last 10
  │◄── "Son Aramalarim" list ─────────────────────────┘
```

---

### 3. Job Search with Filters

```
Browser (user types "Web Developer" + "Istanbul" + REMOTE filter)
  │
  │── POST /api/v1/search
  │    body: { position, city, filters: { workingPreference: REMOTE } }
  │    ──► Gateway ──► Search Service
  │                        │── MongoDB: insert job_searches document
  │                        │── GET /api/v1/jobs?position=Web+Developer&city=Istanbul&workingPreference=REMOTE
  │                        │    ──► Gateway ──► Job Service
  │                        │         └── JPQL search query on PostgreSQL
  │                        │◄── Page<JobResponse> ────────────────────────
  │◄── { results, total, page } ──────────────────────────────────────────
  │
  Browser renders job list with filter chips [REMOTE ×] [Istanbul ×]
  User clicks × on REMOTE chip → new POST /api/v1/search without that filter
```

---

### 4. Company Posts a Job

```
Admin/Company (authenticated)
  │
  │── POST /api/v1/admin/jobs
  │    Authorization: Bearer {CognitoJWT}
  │    body: { title, city, workingPreference, ... }
  │    ──► Gateway
  │           │── validate JWT via Cognito JWKS ✓
  │           ──► Admin Service
  │                  │── extract cognitoUserId from JWT
  │                  │── SELECT * FROM companies WHERE cognito_user_id = ?
  │                  │── check is_verified = true  (else 403)
  │                  │── POST /api/v1/jobs ──► Job Service
  │                                               │── INSERT INTO jobs
  │                                               │── @CacheEvict cityJobs + jobSearch
  │                                               │── RabbitMQ publish: JobCreatedEvent
  │                                               │    { jobId, title, city, workingPreference }
  │◄── JobResponse ────────────────────────────────┘
```

---

### 5. Notification: Job Alert Match

```
RabbitMQ queue: job.created
  │
  Notification Service (consumer)
  │── receive JobCreatedEvent { jobId, title, city, workingPreference }
  │── SELECT * FROM job_alerts
  │    WHERE is_active = true
  │    AND (position_keywords IS NULL OR title ILIKE '%' || position_keywords || '%')
  │    AND (city IS NULL OR city = event.city)
  │    AND (working_preference IS NULL OR working_preference = event.workingPreference)
  │
  │── for each matching alert:
  │       INSERT INTO notifications
  │         (user_id, title, message, job_id)
  │       VALUES
  │         (alert.user_id, 'New job match!', '...', event.jobId)
  │
  Frontend (user opens app)
  │── GET /api/v1/notifications ──► Notification Service
  │◄── [{ id, title, message, jobId, isRead: false }]
  │── renders bell badge with count
  │── user clicks notification → navigate to /jobs/{jobId}
  │── PUT /api/v1/notifications/{id}/read
```

---

### 6. Related Job Notification (Scheduled Task)

```
AWS EventBridge (daily cron)
  │── POST /api/v1/scheduler/process-related-jobs ──► Notification Service
  │
  Notification Service
  │── MongoDB: find job_searches where createdAt > now() - 7 days, group by userId
  │── for each user's recent search terms:
  │       SELECT * FROM jobs
  │         WHERE posted_at > (last notification sent)
  │         AND title ILIKE '%' || searchTerm || '%'
  │── for each new matching job not yet notified:
  │       INSERT INTO notifications (user_id, title, message, job_id)
```

---

### 7. AI Agent Chat

```
Browser (authenticated user)
  │── POST /api/v1/ai/chat
  │    body: { sessionId, message: "I'd like to search web dev jobs in Istanbul" }
  │    ──► Gateway ──► AI Agent Service
  │
  AI Agent Service
  │── load chat history from MongoDB ai_chat_sessions
  │── POST generativelanguage.googleapis.com/.../gemini-1.5-flash:generateContent
  │    contents: [system_prompt, ...history, { role:user, content: message }]
  │    tools: [{ name:search_jobs, params:{position,city} }, { name:get_job_details, params:{id} }]
  │
  Gemini responds with functionCall: search_jobs("web developer", "Istanbul")
  │
  AI Agent Service
  │── POST /api/v1/search ──► Search Service ──► Job Service
  │◄── [job1, job2, job3]
  │
  │── re-submit to Gemini with functionResponse: { results: [job1, job2, job3] }
  │
  Gemini responds with final text:
    "Here are a few options you might like:
     • Junior Web Developer – Istanbul – TechCorp [Apply]
     • Full Stack Developer – Istanbul – StartupHub [Apply]"
  │
  AI Agent Service
  │── append user message + assistant response to MongoDB session
  │◄── { text, jobCards: [{id, title, company, city, requirements}] }
  │
  Browser renders chat bubble + job cards with [Apply] buttons
```

---

### 8. Apply to a Job

```
Browser (authenticated user clicks [Apply] on job card)
  │
  │── POST /api/v1/jobs/{id}/apply
  │    Authorization: Bearer {CognitoJWT}
  │    ──► Gateway ──► Job Service
  │                        │── extract userId from JWT
  │                        │── check applications table: already applied? → 409
  │                        │── INSERT INTO applications (job_id, user_id)
  │◄── { applicationId, status: "APPLIED" }
  │
  Browser shows confirmation message
```
