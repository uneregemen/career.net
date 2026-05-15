# Assumptions

1. **"Hotel service"** mentioned in the deployment diagram is a copy-paste artifact from another project spec. It is treated as the "Job Service" in this implementation.

2. **AI model**: Google Gemini `gemini-1.5-flash` is used via the Gemini REST API. A `GEMINI_API_KEY` env var is required (free key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)). The free tier (~15 req/min) is sufficient for a homework/demo project.

3. **Geolocation**: The frontend uses the browser `navigator.geolocation` API to obtain the user's coordinates, then calls the OpenStreetMap Nominatim API (free, no API key required) to reverse-geocode to a city name.

4. **"Apply" flow**: Clicking Apply records an entry in the `applications` table. A full ATS (applicant tracking system) workflow is out of scope.

5. **Notifications are in-app only** — stored in the `notifications` PostgreSQL table, fetched via `GET /api/v1/notifications`, and displayed as a notification bell in the frontend. No email or SMS is sent.

6. **Scheduling strategy**:
   - Local development: Spring `@Scheduled` annotations run the notification tasks on a fixed interval inside the service.
   - Production: AWS EventBridge Scheduler calls the `POST /api/v1/scheduler/process-job-alerts` and `POST /api/v1/scheduler/process-related-jobs` HTTP endpoints on a cron schedule.

7. **Database sharing**: All services share one PostgreSQL RDS instance with a single schema in this implementation to keep costs low. In a production microservices deployment, each service would own its own schema or database instance.

8. **Authentication**: AWS Cognito is the IAM provider. The frontend integrates via AWS Amplify. The API Gateway validates JWTs using Cognito's JWKS endpoint. No Google/social login is implemented.

9. **Real-time AI chat is not required**: The AI chat window uses a request/response polling model (POST message → receive full AI response). No WebSocket or SSE is implemented.

10. **API versioning**: All REST endpoints are versioned under `/api/v1/`. The version prefix is set via `@RequestMapping("/api/v1")` at the controller level in each Spring Boot service.
