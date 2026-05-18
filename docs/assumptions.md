# Assumptions

1. **"Hotel service"** mentioned in the deployment diagram is a copy-paste artifact from another project spec. It is treated as the "Job Service" in this implementation.

2. **AI model**: Google Gemini `gemini-2.0-flash` is used via the Gemini REST API. A `GEMINI_API_KEY` env var is required (free key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)). The free tier has rate limits; a paid plan is recommended for sustained use.

3. **Geolocation**: The frontend uses the browser `navigator.geolocation` API to obtain the user's coordinates, then calls the OpenStreetMap Nominatim API (free, no API key required) to reverse-geocode to a city name. Turkish city names (İzmir, İstanbul) are normalized (İ→I, ı→i) before database queries to ensure case-insensitive matching.

4. **"Apply" flow**: Clicking Apply records an entry in the `applications` table. A full ATS (applicant tracking system) workflow is out of scope.

5. **Notifications are in-app only** — stored in the `notifications` PostgreSQL table, fetched via `GET /api/v1/notifications`, and displayed as a dropdown in the header. No email or SMS is sent.

6. **Scheduling strategy**:
   - Local development: Spring `@Scheduled` annotations run the notification tasks on a fixed interval inside the service.
   - Production: Azure Container Apps timer triggers or scheduled HTTP calls invoke `POST /api/v1/scheduler/process-job-alerts` and `POST /api/v1/scheduler/process-related-jobs`.

7. **Database sharing**: All services share one PostgreSQL Supabase instance with a single schema in this implementation to keep costs low. In a production microservices deployment, each service would own its own schema or database instance. **Supabase connection requires `?sslmode=require` in the JDBC URL and the connection pooler hostname (`aws-0-REGION.pooler.supabase.com`) for IPv4 compatibility.**

8. **Authentication**: AWS Cognito is the IAM provider. The frontend integrates via AWS Amplify. The API Gateway validates JWTs using Cognito's JWKS endpoint. No Google/social login is implemented.

9. **Real-time AI chat is not required**: The AI chat window uses a request/response polling model (POST message → receive full AI response). No WebSocket or SSE is implemented.

10. **API versioning**: All REST endpoints are versioned under `/api/v1/`. The version prefix is set via `@RequestMapping("/api/v1")` at the controller level in each Spring Boot service.

11. **User profile**: Basic profile data (name, surname, phone, gender, age, profession) is stored in the `users` table and managed via `GET/PUT /api/v1/profile`. Profile endpoints are routed through the notification-service.

12. **Company approval flow**: A company must self-register and be approved by an admin before posting jobs. Each job posting triggers RabbitMQ notifications to all users with matching job alerts.
