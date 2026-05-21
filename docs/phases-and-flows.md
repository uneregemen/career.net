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
| `/` Home | Hero arama kutusu (beyaz, inline); geolocation → yakındaki ilanlar; sol sidebar: son aramalar (silinebilir) + kaydedilenler sayacı + popüler kategoriler |
| `/search` Results | Filtreler toggle ile gösterilir/gizlenir; aktif filtre chip'leri; skeleton loading; boş durum mesajı; sayfalama |
| `/jobs/[id]` Detail | 2 kolonlu layout — sol: iş tanımı + nitelikler; sağ: sticky başvur kartı + kaydet butonu; "X gün önce" zamanı |
| `/saved` Kaydettiklerim | `localStorage`'dan bookmark'lanan ilanları çeker; hiç yoksa boş durum mesajı |
| `/alerts` | Create/list/delete job alerts |
| `/admin` | Başvuru Yönetimi (ilan bazında gruplu, kabul/reddet) + şirket onay listesi + şirket kaydı + ilan yayınlama |
| `/profile` | View + edit profile (name, surname, email, phone, gender, age, profession) |
| `/auth/login` | Cognito sign-in/register via AWS Amplify |
| `<Header />` | Avatar + isim + dropdown; Başvurularım / Bildirimler tabs; bildirime tıklayınca optimistic update; Kaydettiklerim ikonu |
| `<JobCard />` | Bookmark toggle (localStorage); "X dk/saat/gün önce" zaman etiketi; compact prop desteği |
| `<ChatWindow />` | Floating AI chat (bottom-right) |

---

### Phase 10 — Application Management ✅ Done
**Goal:** Company owners can review and accept/reject applications for their own job postings.

| Task | Key Detail |
|---|---|
| `ApplicantUser` entity | Read-only (`@Immutable`) JPA entity mapped to the shared `users` table; exposes `cognitoUserId`, `name`, `surname`, `email` |
| `ApplicantUserRepository` | `findByCognitoUserIdIn(Collection)` — batch fetch to avoid N+1 |
| `ApplicationRepository` JPQL query | `JOIN FETCH a.job j JOIN FETCH j.company WHERE c.cognitoUserId = :ownerUserId` — single query loads applications + jobs + companies |
| `ApplicationService.getApplicationsForMyJobs` | Fetches applications, batch-fetches users, merges into `ApplicationResponse` with `applicantName` + `applicantEmail` |
| `ApplicationService.updateStatus` | Validates caller owns the job (`job.company.cognitoUserId == auth`); allows PENDING → ACCEPTED \| REJECTED; rejects unknown statuses |
| `GET /api/v1/jobs/my-job-applications` | Returns enriched list; authenticated; added before `GET /api/v1/jobs/**` permitAll in SecurityConfig |
| `PUT /api/v1/jobs/applications/{id}/status` | Body: `{ "status": "ACCEPTED" }` — covered by existing `PUT /api/v1/jobs/**` authenticated rule |
| `ApplicationResponse` updated | Added `applicantName`, `applicantEmail` fields; `from(app, user)` overload; existing `from(app)` unchanged |
| Application default status | Changed from `"APPLIED"` → `"PENDING"` in `@PrePersist`; `init.sql` default updated accordingly |
| Admin panel UI | "Başvuru Yönetimi" card: ilan bazında accordion grupları; her başvuranda avatar + isim + email + tarih; PENDING için Kabul/Reddet butonları; durum badge'leri |

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
Browser (user clicks "Hemen Başvur")
  │── POST /api/v1/jobs/{id}/apply ──► Gateway ──► Job Service
  │                                        │── check already applied? → 409 RuntimeException
  │                                        │── INSERT INTO applications (status = 'PENDING')
  │◄── { applicationId, jobTitle, status: "PENDING" }
  │
  Job detail page shows "✓ Başvurunuz alındı!" confirmation banner
  Header dropdown "Başvurularım" tab shows the new application with "Beklemede" badge
```

---

### 9. Company Reviews Applications

```
Company Owner (authenticated, is_verified = true)
  │── GET /api/v1/jobs/my-job-applications ──► Gateway ──► Job Service
  │                                                │── JPQL: SELECT a JOIN FETCH job JOIN FETCH company
  │                                                │         WHERE company.cognitoUserId = auth.sub
  │                                                │── batch fetch applicant info from users table
  │◄── [{ jobTitle, applicantName, applicantEmail, status, appliedAt }, ...]
  │
  Admin panel "Başvuru Yönetimi" groups by job, shows Kabul/Reddet buttons for PENDING
  │
  Company clicks "Kabul Et"
  │── PUT /api/v1/jobs/applications/{id}/status { "status": "ACCEPTED" }
  │                                                │── verify job.company.cognitoUserId == auth.sub
  │                                                │── UPDATE applications SET status = 'ACCEPTED'
  │◄── updated ApplicationResponse
  │
  React Query cache invalidated → badge updates to "Kabul edildi"
  Applicant sees "Kabul edildi" in their Header dropdown "Başvurularım" tab
```

---

### 10. Save a Job (Bookmark)

```
Browser (user clicks bookmark icon on any JobCard or job detail page)
  │── localStorage.getItem("careernet_saved_jobs") → string[]
  │── toggle: add or remove job id
  │── localStorage.setItem(...)
  │
  No API call — entirely client-side
  /saved page reads saved ids → fetches each job via GET /api/v1/jobs/{id}
```
