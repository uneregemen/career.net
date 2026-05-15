# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**career.net** is a job board platform built as independently deployable microservices. It is a homework/demo project — not production-grade. All backend services are Spring Boot 3.x (Java 17) + Maven. The frontend is Next.js 14 + TypeScript. Deployment target is AWS ECS Fargate.

## Local Development

### Start all infrastructure first

```bash
docker-compose up -d
```

This starts PostgreSQL (5432), MongoDB (27017), Redis (6379), RabbitMQ (5672, management UI at 15672). The database schema and seed data are applied automatically from [docs/init.sql](docs/init.sql).

### Run a Spring Boot service

```bash
cd services/job-service
mvn spring-boot:run
```

Each service reads config from its `application.yml`, which falls back to sensible localhost defaults — no `.env` file is needed for local dev.

### Build a service (without running)

```bash
mvn clean package -DskipTests
```

### Run tests for a service

```bash
mvn test
# single test class:
mvn test -Dtest=JobServiceTest
```

### Frontend (not yet scaffolded)

```bash
cd frontend
npm run dev      # dev server
npm run build    # production build
```

## Architecture

### Service Map

| Service | Port | Responsibility |
|---|---|---|
| `api-gateway` | 8080 | Routes all `/api/v1/**`, validates Cognito JWTs |
| `job-service` | 8081 | Job CRUD, Redis caching, RabbitMQ publishing |
| `search-service` | 8082 | Job search, stores history in MongoDB |
| `notification-service` | 8083 | Job alerts, in-app notifications, scheduled tasks |
| `admin-service` | 8084 | Company registration & verification, job delegation |
| `ai-agent-service` | 8085 | Gemini-powered chat, tool-calls Search + Job APIs |
| `frontend` | 3000 | Next.js UI |

All external traffic goes through the API Gateway. Services call each other via HTTP (RestTemplate/WebClient) through the gateway URL.

### Data Stores

- **PostgreSQL** — jobs, companies, users, job_alerts, notifications, applications. Schema in [docs/init.sql](docs/init.sql).
- **MongoDB** — `job_searches` collection (search history) + `ai_chat_sessions` (Gemini chat history). Used by search-service and ai-agent-service.
- **Redis** — job posting cache. Keys: `job:{uuid}` (1h TTL), `jobs:city:{city}` (15m), `jobs:search:{hash}` (10m). Managed by `@Cacheable` in job-service.
- **RabbitMQ** — queue `job.created`: published by job-service on every new job, consumed by notification-service to trigger alert matching.

### Authentication Flow

AWS Cognito is the only auth provider. The API Gateway validates the JWT from the `Authorization: Bearer` header against Cognito's JWKS endpoint. Each service is also an OAuth2 resource server (configured in `application.yml` under `spring.security.oauth2.resourceserver.jwt.jwk-set-uri`). The Cognito user's `sub` claim is used as `userId` everywhere in the system. Company/admin status is stored in the `companies` table, not in Cognito groups.

### Notification Flow

1. Job is POSTed → job-service saves it → publishes `JobCreatedEvent` to RabbitMQ `job.created` queue.
2. notification-service consumes the queue → matches job against active `job_alerts` → writes rows to `notifications` table.
3. A second scheduled task reads recent entries from MongoDB `job_searches` → finds related new jobs → also writes to `notifications`.
4. Frontend polls `GET /api/v1/notifications` and shows a bell badge. No email is sent.

### AI Agent Flow

The ai-agent-service receives a chat message, calls Gemini `gemini-1.5-flash` with a system prompt that declares two tools: `search_jobs(position, city)` and `get_job_details(id)`. When Gemini invokes a tool, the service calls the corresponding internal API, injects the result as a `functionResponse`, and re-calls Gemini for the final answer. Sessions persist in MongoDB.

## Key Conventions

- **API versioning**: All endpoints use prefix `/api/v1/` set via `@RequestMapping` at the controller level. Never hardcode version elsewhere.
- **JPA DDL**: `ddl-auto: validate` in all services — schema changes go in [docs/init.sql](docs/init.sql), not via Hibernate auto-create.
- **Redis cache names**: `jobs`, `cityJobs`, `jobSearch` — defined in `RedisConfig.java`. TTLs are set per-cache there, not in `application.yml`.
- **Lombok**: All models and DTOs use `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`. Do not write manual getters/setters.
- **Security**: GET endpoints on jobs/search are public. All write operations require a valid Cognito JWT. The `cognitoUserId` is extracted from `Authentication.getName()` in controllers.
- **Inter-service calls**: Use Spring `WebClient` (non-blocking) for calls from ai-agent-service; use `RestTemplate` elsewhere.

## Environment Variables

All required variables are documented in [.env.example](.env.example). For local dev, `application.yml` defaults cover everything except `GEMINI_API_KEY` (needed only for ai-agent-service) and real AWS credentials (needed only for production Cognito JWT validation — can be bypassed locally by setting `ddl-auto: create` and disabling security).
