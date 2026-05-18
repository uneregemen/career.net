# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**career.net** is a job board platform built as independently deployable microservices. It is a homework/demo project — not production-grade. All backend services are Spring Boot 3.x (Java 17) + Maven. The frontend is **Next.js 16.2.6 + React 19 + TypeScript** — this version has breaking changes from Next.js 14; check `node_modules/next/dist/docs/` before writing any frontend code. Deployment target is AWS ECS Fargate.

## External Services (Cloud — NOT local)

These are cloud-hosted. **Never add localhost fallback defaults for them in `application.yml`.**

| Service | Provider | Env vars |
|---|---|---|
| PostgreSQL | **Supabase** | `DB_HOST`, `DB_PASSWORD` — no `:localhost` default |
| MongoDB | **MongoDB Atlas** | `MONGO_URI` — no local URI default |
| Redis | **Upstash** | `REDIS_URL=rediss://...` — SSL required, used via `spring.data.redis.url` |
| RabbitMQ | **CloudAMQP** | `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`, `RABBITMQ_VHOST` — SSL enabled, port default 5671 |
| Auth | **AWS Cognito** | `COGNITO_USER_POOL_ID`, `AWS_REGION` |
| AI | **Google Gemini** | `GEMINI_API_KEY` |

**Correct pattern in `application.yml`:**
```yaml
datasource:
  url: jdbc:postgresql://${DB_HOST}:${DB_PORT:5432}/${DB_NAME:postgres}
  username: ${DB_USERNAME:postgres}
  password: ${DB_PASSWORD}          # no default — must be set
```

**Wrong (never do this):**
```yaml
datasource:
  url: jdbc:postgresql://${DB_HOST:localhost}:5432/${DB_NAME:careerdb}
  username: ${DB_USERNAME:careeruser}
  password: ${DB_PASSWORD:careerpass}
```

## Local Development

### Start local infrastructure

```bash
docker-compose up -d
```

This starts MongoDB (27017), Redis (6379), and RabbitMQ (5672, management UI at 15672). PostgreSQL is cloud-hosted (Supabase) — set `DB_HOST` and `DB_PASSWORD` before running any service.

### Required env vars for local dev

Copy `.env.example` to `.env` and fill in:
- `DB_HOST`, `DB_PASSWORD` — Supabase connection
- `MONGO_URI` — MongoDB Atlas connection string
- `REDIS_URL` — Upstash URL (`rediss://...`)
- `RABBITMQ_HOST`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`, `RABBITMQ_VHOST` — CloudAMQP instance
- `GEMINI_API_KEY` — Google AI Studio key (ai-agent-service only)
- `COGNITO_USER_POOL_ID` — AWS Cognito (can skip for local if security is disabled)
- Inter-service URLs: `JOB_SERVICE_URL`, `SEARCH_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`, `ADMIN_SERVICE_URL`, `AI_AGENT_SERVICE_URL`
- Frontend: `NEXT_PUBLIC_API_URL` (points to API Gateway, default `http://localhost:8080`), `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`

### Run a Spring Boot service

```bash
cd services/job-service
mvn spring-boot:run
```

### Build without running

```bash
mvn clean package -DskipTests
```

### Run tests

```bash
mvn test
# single test class:
mvn test -Dtest=JobServiceTest
```

### Frontend

```bash
cd frontend
npm run dev      # dev server on :3000
npm run build    # production build
```

Frontend proxies all `/api/v1/*` requests to `NEXT_PUBLIC_API_URL` via a rewrite in `next.config.ts` — no CORS needed.

## Architecture

### Service Map

| Service | Port | Responsibility |
|---|---|---|
| `api-gateway` | 8080 | Routes all `/api/v1/**`, validates Cognito JWTs |
| `job-service` | 8081 | Job CRUD, Redis caching, RabbitMQ publishing |
| `search-service` | 8082 | Job search, stores history in MongoDB Atlas |
| `notification-service` | 8083 | Job alerts, in-app notifications, scheduled tasks |
| `admin-service` | 8084 | Company registration & verification, job delegation |
| `ai-agent-service` | 8085 | Gemini-powered chat, tool-calls Search + Job APIs |
| `frontend` | 3000 | Next.js UI |

All external traffic goes through the API Gateway. Services call each other via HTTP (RestTemplate/WebClient).

### Data Stores

- **PostgreSQL (Supabase)** — jobs, companies, users, job_alerts, notifications, applications. Schema in [docs/init.sql](docs/init.sql).
- **MongoDB (Atlas)** — `job_searches` collection (search history) + `ai_chat_sessions` (Gemini chat history).
- **Redis** — job posting cache. Keys: `job:{uuid}` (1h TTL), `jobs:city:{city}` (15m), `jobs:search:{hash}` (10m). Managed by `@Cacheable` in job-service.
- **RabbitMQ (CloudAMQP/Amazon MQ)** — queue `job.created`: published by job-service on every new job, consumed by notification-service.

### Authentication Flow

AWS Cognito is the only auth provider. The API Gateway validates the JWT from the `Authorization: Bearer` header against Cognito's JWKS endpoint. Each service is also an OAuth2 resource server (`spring.security.oauth2.resourceserver.jwt.jwk-set-uri`). The Cognito user's `sub` claim is used as `userId` everywhere. Company/admin status is stored in the `companies` table, not in Cognito groups.

The frontend uses AWS Amplify (`@aws-amplify/auth`) to manage Cognito tokens in the browser; `lib/api.ts` attaches the `idToken` to every request via an axios interceptor.

### Notification Flow

1. Job is POSTed → job-service saves it → publishes `JobCreatedEvent` to RabbitMQ `job.created` queue.
2. notification-service consumes the queue → matches job against active `job_alerts` → writes rows to `notifications` table.
3. A second scheduled task reads recent entries from MongoDB `job_searches` → finds related new jobs → also writes to `notifications`.
4. Frontend polls `GET /api/v1/notifications` and shows a bell badge. No email is sent.

### AI Agent Flow

The ai-agent-service receives a chat message, calls Gemini `gemini-1.5-flash` with a system prompt that declares two tools: `search_jobs(position, city)` and `get_job_details(id)`. When Gemini invokes a tool, the service calls the corresponding internal API, injects the result as a `functionResponse`, and re-calls Gemini for the final answer. Sessions persist in MongoDB Atlas. No streaming — full response in one HTTP call.

## Key Conventions

- **API versioning**: All endpoints use prefix `/api/v1/` set via `@RequestMapping` at the controller level. Never hardcode version elsewhere.
- **JPA DDL**: `ddl-auto: validate` in all services — schema changes go in [docs/init.sql](docs/init.sql), not via Hibernate auto-create.
- **Redis cache names**: `jobs`, `cityJobs`, `jobSearch` — defined in `RedisConfig.java`. TTLs are set per-cache there, not in `application.yml`.
- **Lombok**: All models and DTOs use `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`. Do not write manual getters/setters.
- **Security**: GET endpoints on jobs/search are public. All write operations require a valid Cognito JWT. The `cognitoUserId` is extracted from `Authentication.getName()` in controllers.
- **Inter-service calls**: Use Spring `WebClient` for calls from ai-agent-service; use `RestTemplate` elsewhere.
- **No local DB defaults**: `DB_HOST`, `DB_PASSWORD`, `MONGO_URI` must never have localhost/local fallbacks in `application.yml`. They are always cloud-hosted.
- **Frontend state**: Global auth/UI state uses Zustand; server data fetching uses TanStack React Query. All API calls go through `lib/api.ts` (axios instance with Amplify interceptor).
