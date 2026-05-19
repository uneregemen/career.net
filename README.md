# career.net

Modern bir iş arama platformu. Bağımsız olarak deploy edilebilen mikroservis mimarisi üzerine kurulmuştur.

**Live Demo:** [career-net-ebon.vercel.app](https://career-net-ebon.vercel.app)

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Backend | Java 17 + Spring Boot 3.x |
| Frontend | Next.js 16.2.6 + React 19 + TypeScript |
| Stil | Tailwind CSS v4 |
| Birincil Veritabanı | PostgreSQL (Supabase) |
| NoSQL | MongoDB Atlas |
| Cache | Redis (Upstash) |
| Mesaj Kuyruğu | RabbitMQ (CloudAMQP) |
| Kimlik Doğrulama | AWS Cognito |
| AI Model | Google Gemini 2.0 Flash |
| Container | Docker |
| Bulut | Azure Container Apps + Vercel |

---

## Servisler

| Servis | Port | Açıklama |
|---|---|---|
| `api-gateway` | 8080 | Tüm trafiğin giriş noktası, JWT doğrulama |
| `job-service` | 8081 | İş ilanı CRUD, Redis cache, RabbitMQ yayını |
| `search-service` | 8082 | İş arama, MongoDB'ye arama geçmişi kaydı |
| `notification-service` | 8083 | Bildirimler, iş alarmları, kullanıcı profili |
| `admin-service` | 8084 | Şirket kaydı ve onay yönetimi |
| `ai-agent-service` | 8085 | Gemini destekli AI chat asistanı |
| `frontend` | 3000 | Next.js UI |

---

## Özellikler

- **İş Arama** — Pozisyon, şehir, ülke, çalışma şekli filtreleri; Türkçe karakter desteği
- **Yakın İlanlar** — Tarayıcı konum izni ile yakın şehirdeki ilanlar (OpenStreetMap)
- **Otomatik Tamamlama** — Pozisyon ve şehir arama kutularında anlık öneriler
- **Şirket Onay Akışı** — Şirket kaydı → admin onayı → ilan yayınlama
- **Bildirim Sistemi** — İş alarmı oluştur, eşleşen yeni ilanlar için bildirim al
- **Kullanıcı Profili** — Ad, soyad, telefon, cinsiyet, yaş, meslek
- **Başvuru Takibi** — Başvurulan ilanlar header dropdown'ında listelenir
- **AI Asistan** — Gemini destekli chat; iş ara, ilan detayı sorgula
- **Kimlik Doğrulama** — AWS Cognito ile kayıt, giriş, e-posta doğrulama

---

## Yerel Geliştirme

### Ön Koşullar

- Docker Desktop
- Java 17 + Maven
- Node.js 20+

### Altyapıyı Başlat

```bash
docker-compose up -d
```

MongoDB, Redis ve RabbitMQ'yu yerel olarak başlatır.

### Ortam Değişkenleri

```bash
cp .env.example .env
```

`.env` dosyasını doldurun:

```env
# PostgreSQL (Supabase)
DB_HOST=aws-1-eu-central-1.pooler.supabase.com
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

### Servisleri Çalıştır

```bash
# Bir servis başlatmak için
cd services/job-service
mvn spring-boot:run

# Frontend
cd frontend
npm install
npm run dev
```

---

## Deployment

Backend **Azure Container Apps**, frontend **Vercel** üzerinde deploy edilmiştir.

### Docker Image Build

```bash
docker build --platform linux/amd64 -t ghcr.io/USERNAME/career-net-job-service:latest services/job-service/
docker push ghcr.io/USERNAME/career-net-job-service:latest
```

Detaylı deployment adımları için: [docs/deployment.md](docs/deployment.md)

---

## Mimari

```
Frontend (Vercel)
      │
      ▼
API Gateway (Azure Container Apps)
      │
      ├── job-service        → PostgreSQL + Redis + RabbitMQ
      ├── search-service     → MongoDB + job-service
      ├── notification-service → PostgreSQL + MongoDB + RabbitMQ
      ├── admin-service      → PostgreSQL + job-service
      └── ai-agent-service   → MongoDB + Gemini API
```

Detaylı mimari: [docs/architecture.md](docs/architecture.md)

---

## Proje Yapısı

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
