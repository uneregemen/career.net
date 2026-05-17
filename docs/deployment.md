# career.net — AWS ECS Deployment Rehberi

## Ön Koşullar

- AWS CLI kurulu ve yapılandırılmış (`aws configure`)
- Docker kurulu
- AWS hesabında: ECR, ECS, Secrets Manager, CloudWatch erişimi

---

## Adım 1 — AWS Secrets Manager'a Şifreleri Ekle

Tüm hassas değerleri Secrets Manager'a ekle. `YOUR_ACCOUNT_ID` yerine kendi hesap ID'ni yaz.

```bash
aws secretsmanager create-secret --name career-net/DB_HOST \
  --secret-string "db.mqjvwjqtbwknugtfogal.supabase.co" --region eu-north-1

aws secretsmanager create-secret --name career-net/DB_PASSWORD \
  --secret-string "SUPABASE_SIFREN" --region eu-north-1

aws secretsmanager create-secret --name career-net/MONGO_URI \
  --secret-string "mongodb+srv://..." --region eu-north-1

aws secretsmanager create-secret --name career-net/REDIS_URL \
  --secret-string "rediss://default:...@firm-sculpin-127412.upstash.io:6379" --region eu-north-1

aws secretsmanager create-secret --name career-net/RABBITMQ_URL \
  --secret-string "amqps://meqbblbp:...@cow.rmq2.cloudamqp.com/meqbblbp" --region eu-north-1

aws secretsmanager create-secret --name career-net/GEMINI_API_KEY \
  --secret-string "GEMINI_KEY" --region eu-north-1

aws secretsmanager create-secret --name career-net/COGNITO_USER_POOL_ID \
  --secret-string "eu-north-1_gAQieJNc7" --region eu-north-1
```

---

## Adım 2 — ECR Repository'leri Oluştur

Her servis için ayrı bir container registry:

```bash
for service in job-service search-service notification-service admin-service ai-agent-service api-gateway frontend; do
  aws ecr create-repository \
    --repository-name career-net-$service \
    --region eu-north-1
done
```

---

## Adım 3 — Docker Image'larını Build Et ve Push Et

```bash
# ECR'a login
aws ecr get-login-password --region eu-north-1 | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.eu-north-1.amazonaws.com

# Her servis için (job-service örneği)
cd services/job-service
docker build -t career-net-job-service .
docker tag career-net-job-service:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.eu-north-1.amazonaws.com/career-net-job-service:latest
docker push \
  YOUR_ACCOUNT_ID.dkr.ecr.eu-north-1.amazonaws.com/career-net-job-service:latest
```

Tüm servisler için tekrarla: `search-service`, `notification-service`, `admin-service`, `ai-agent-service`, `api-gateway`, `frontend`.

---

## Adım 4 — ECS Cluster Oluştur

```bash
aws ecs create-cluster --cluster-name career-net --region eu-north-1
```

---

## Adım 5 — Task Definition'ları Kaydet

`taskdef/` klasöründeki JSON dosyalarında `YOUR_ACCOUNT_ID` yerine gerçek account ID'ni yaz, sonra:

```bash
for service in job-service search-service notification-service admin-service ai-agent-service api-gateway frontend; do
  aws ecs register-task-definition \
    --cli-input-json file://taskdef/$service.json \
    --region eu-north-1
done
```

---

## Adım 6 — ECS Servisleri Başlat

Her task definition için bir ECS Service oluştur (Application Load Balancer ile):

```bash
aws ecs create-service \
  --cluster career-net \
  --service-name job-service \
  --task-definition career-net-job-service \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[SUBNET_ID],securityGroups=[SG_ID],assignPublicIp=ENABLED}" \
  --region eu-north-1
```

---

## Adım 7 — CloudWatch Log Groups Oluştur

Task definition'lardaki log grupları önceden var olmalı:

```bash
for service in job-service search-service notification-service admin-service ai-agent-service api-gateway frontend; do
  aws logs create-log-group \
    --log-group-name /ecs/career-net/$service \
    --region eu-north-1
done
```

---

## Değiştirmen Gereken Değerler

Tüm `taskdef/*.json` dosyalarında:

| Placeholder | Gerçek Değer |
|---|---|
| `YOUR_ACCOUNT_ID` | AWS Console → sağ üst → hesap numarası |
| `eu-north-1` | Cognito'nun kurulu olduğu region (zaten eu-north-1) |
| `SUBNET_ID` | VPC → Subnets → bir subnet ID |
| `SG_ID` | EC2 → Security Groups → bir security group ID |
