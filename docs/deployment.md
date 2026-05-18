# career.net — AWS ECS Deployment Rehberi

## Ön Koşullar

- AWS CLI kurulu (`brew install awscli`) ve yapılandırılmış (`aws configure`)
- Docker Desktop çalışıyor olmalı
- AWS hesabında: ECR, ECS, IAM, Secrets Manager, EventBridge, CloudWatch, Route53, Cloud Map erişimi

---

## Adım 0 — Account ID'yi Task Definition'lara Uygula

```bash
cd /path/to/career.net

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account ID: $ACCOUNT_ID"
python3 -c "
import json, glob
for f in glob.glob('taskdef/*.json'):
    with open(f) as fp: d = json.load(fp)
    txt = json.dumps(d)
    txt = txt.replace('YOUR_ACCOUNT_ID', '$ACCOUNT_ID')
    with open(f, 'w') as fp: fp.write(txt)
print('✓ Tüm task definition\'lar güncellendi')
"
```

---

## Adım 1 — IAM Rolleri

ECS'nin container başlatabilmesi için bu rol **zorunlu**:

```bash
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":{"Service":"ecs-tasks.amazonaws.com"},
      "Action":"sts:AssumeRole"
    }]
  }' --query "Role.RoleName" --output text

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

echo "✓ ecsTaskExecutionRole hazır"
```

---

## Adım 2 — AWS Secrets Manager

```bash
REGION=eu-north-1

create_or_update() {
  aws secretsmanager create-secret --name "$1" --secret-string "$2" --region $REGION 2>&1 | \
    grep -q "AlreadyExists" && \
    aws secretsmanager put-secret-value --secret-id "$1" --secret-string "$2" --region $REGION > /dev/null
  echo "✓ $1"
}

# .env dosyasındaki gerçek değerleri kullan:
create_or_update "career-net/DB_HOST"           "db.xxxx.supabase.co"
create_or_update "career-net/DB_PASSWORD"       "SUPABASE_SIFREN"
create_or_update "career-net/MONGO_URI"         "mongodb+srv://..."
create_or_update "career-net/REDIS_URL"         "rediss://default:SIFRE@host.upstash.io:6379"
create_or_update "career-net/RABBITMQ_HOST"     "cow.rmq2.cloudamqp.com"
create_or_update "career-net/RABBITMQ_USERNAME" "KULLANICI"
create_or_update "career-net/RABBITMQ_PASSWORD" "SIFRE"
create_or_update "career-net/RABBITMQ_VHOST"    "VHOST"
create_or_update "career-net/GEMINI_API_KEY"    "GEMINI_KEY"
create_or_update "career-net/COGNITO_USER_POOL_ID" "eu-north-1_XXXXXXX"
```

> **Not:** `RABBITMQ_URL` tek URL değil — 4 ayrı secret gerekiyor. `DB_PORT` task definition'da `6543` (Supabase connection pooler).

---

## Adım 3 — CloudWatch Log Grupları

```bash
for service in job-service search-service notification-service admin-service ai-agent-service api-gateway frontend; do
  aws logs create-log-group --log-group-name /ecs/career-net/$service --region eu-north-1 2>/dev/null
  echo "✓ /ecs/career-net/$service"
done
```

---

## Adım 4 — ECR Repositories

```bash
for service in job-service search-service notification-service admin-service ai-agent-service api-gateway frontend; do
  aws ecr create-repository --repository-name career-net-$service --region eu-north-1 2>/dev/null
  echo "✓ career-net-$service"
done
```

---

## Adım 5 — Docker Build ve ECR Push

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=eu-north-1
ECR="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# ECR login
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR

# Backend servisler (linux/amd64 — Fargate için zorunlu)
for service in job-service search-service notification-service admin-service ai-agent-service api-gateway; do
  echo "▶ Building ${service}..."
  docker build --platform linux/amd64 -t "career-net-${service}" "services/${service}/"
  docker tag "career-net-${service}:latest" "${ECR}/career-net-${service}:latest"
  docker push "${ECR}/career-net-${service}:latest"
  echo "✓ ${service} pushed"
done

# Frontend
docker build --platform linux/amd64 -t career-net-frontend frontend/
docker tag career-net-frontend:latest ${ECR}/career-net-frontend:latest
docker push ${ECR}/career-net-frontend:latest
echo "✓ frontend pushed"
```

> **Önemli:** `docker tag` komutunda `${service}` şeklinde süslü parantez kullan. zsh'de `$service:latest` → `serviceatest` hatasına yol açar (`:l` lowercase modifier).

---

## Adım 6 — ECS Cluster

```bash
aws ecs create-cluster --cluster-name career-net --region eu-north-1 --query "cluster.status" --output text
```

---

## Adım 7 — Cloud Map Servis Keşfi

Servisler birbirini `http://job-service.career-net.local:8081` gibi DNS adlarıyla bulur.

```bash
REGION=eu-north-1
VPC_ID=$(aws ec2 describe-vpcs --region $REGION --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)

# Private DNS namespace
OP_ID=$(aws servicediscovery create-private-dns-namespace \
  --name career-net.local --vpc $VPC_ID --region $REGION \
  --query "OperationId" --output text)

# Namespace hazır olana kadar bekle
until aws servicediscovery get-operation --operation-id $OP_ID --region $REGION \
  --query "Operation.Status" --output text | grep -q "SUCCESS"; do sleep 3; done

NS_ID=$(aws servicediscovery list-namespaces --region $REGION \
  --query "Namespaces[?Name=='career-net.local'].Id" --output text)
echo "Namespace ID: $NS_ID"

# Her servis için Cloud Map kaydı
for service in job-service search-service notification-service admin-service ai-agent-service api-gateway frontend; do
  SVC_ID=$(aws servicediscovery create-service \
    --name "$service" --namespace-id $NS_ID \
    --dns-config "NamespaceId=$NS_ID,DnsRecords=[{Type=A,TTL=10}]" \
    --region $REGION --query "Service.Id" --output text)
  echo "✓ ${service}: ${SVC_ID}"
done
```

---

## Adım 8 — Task Definition'ları Kaydet

```bash
for service in job-service search-service notification-service admin-service ai-agent-service api-gateway frontend; do
  REV=$(aws ecs register-task-definition \
    --cli-input-json file://taskdef/${service}.json \
    --region eu-north-1 --query "taskDefinition.revision" --output text)
  echo "✓ ${service}:${REV}"
done
```

---

## Adım 9 — Security Group Portlarını Aç

```bash
SG_ID=$(aws ec2 describe-security-groups --region eu-north-1 \
  --filters "Name=group-name,Values=default" \
  --query "SecurityGroups[0].GroupId" --output text)

for port in 3000 8080 8081 8082 8083 8084 8085; do
  aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID --protocol tcp --port $port --cidr 0.0.0.0/0 \
    --region eu-north-1 2>/dev/null && echo "✓ $port" || echo "✓ $port (zaten açık)"
done
```

---

## Adım 10 — ECS Servisleri Başlat (Cloud Map ile)

```bash
REGION=eu-north-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
SUBNET=$(aws ec2 describe-subnets --region $REGION \
  --filters "Name=defaultForAz,Values=true" \
  --query "Subnets[0].SubnetId" --output text)
SG_ID=$(aws ec2 describe-security-groups --region $REGION \
  --filters "Name=group-name,Values=default" \
  --query "SecurityGroups[0].GroupId" --output text)

# Cloud Map service ID'lerini al
declare -A CM_IDS
for service in job-service search-service notification-service admin-service ai-agent-service api-gateway frontend; do
  CM_IDS[$service]=$(aws servicediscovery list-services --region $REGION \
    --filters "Name=NAMESPACE_ID,Values=${NS_ID}" \
    --query "Services[?Name=='${service}'].Id" --output text)
done

# Servisleri başlat
for service in job-service search-service notification-service admin-service ai-agent-service api-gateway frontend; do
  SVCID="${CM_IDS[$service]}"
  aws ecs create-service \
    --cluster career-net \
    --service-name "${service}" \
    --task-definition "career-net-${service}" \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET}],securityGroups=[${SG_ID}],assignPublicIp=ENABLED}" \
    --service-registries "registryArn=arn:aws:servicediscovery:${REGION}:${ACCOUNT_ID}:service/${SVCID}" \
    --region $REGION \
    --query "service.serviceName" --output text
done
```

> **Kritik:** Her `create-service` ve `update-service` komutuna `--service-registries` ekle, yoksa Cloud Map DNS kaydı oluşmaz.

---

## Adım 11 — EventBridge Kuralları

```bash
REGION=eu-north-1

aws events put-rule --name career-net-process-job-alerts \
  --schedule-expression "rate(5 minutes)" --state ENABLED --region $REGION

aws events put-rule --name career-net-process-related-jobs \
  --schedule-expression "cron(0 6 * * ? *)" --state ENABLED --region $REGION

echo "✓ EventBridge kuralları oluşturuldu"
```

---

## Servis Durumu Kontrol

```bash
# Tüm servislerin durumu
aws ecs describe-services \
  --cluster career-net \
  --services job-service search-service notification-service admin-service ai-agent-service api-gateway frontend \
  --region eu-north-1 \
  --query "services[*].{Service:serviceName,Running:runningCount,Pending:pendingCount}" \
  --output table

# DNS kayıtları (Route53)
aws route53 list-resource-record-sets \
  --hosted-zone-id $(aws route53 list-hosted-zones --query "HostedZones[?Name=='career-net.local.'].Id" --output text | cut -d'/' -f3) \
  --query "ResourceRecordSets[?Type=='A'].{Name:Name,IP:ResourceRecords[0].Value}" \
  --output table

# Public IP al (örnek: frontend)
TASK=$(aws ecs list-tasks --cluster career-net --service-name frontend --desired-status RUNNING --region eu-north-1 --query "taskArns[0]" --output text)
ENI=$(aws ecs describe-tasks --cluster career-net --tasks $TASK --region eu-north-1 --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)
aws ec2 describe-network-interfaces --network-interface-ids $ENI --region eu-north-1 --query "NetworkInterfaces[0].Association.PublicIp" --output text
```

---

## Güncelleme (Yeni Deployment)

```bash
SERVICE=job-service   # değiştir
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR="${ACCOUNT_ID}.dkr.ecr.eu-north-1.amazonaws.com"

docker build --platform linux/amd64 -t "career-net-${SERVICE}" "services/${SERVICE}/"
docker tag "career-net-${SERVICE}:latest" "${ECR}/career-net-${SERVICE}:latest"
docker push "${ECR}/career-net-${SERVICE}:latest"

aws ecs update-service \
  --cluster career-net \
  --service $SERVICE \
  --force-new-deployment \
  --region eu-north-1
```

---

## Yaşanan Sorunlar ve Çözümler

| Sorun | Çözüm |
|---|---|
| `ecsTaskExecutionRole` eksik → container başlamıyor | IAM rolü oluştur, ECR + SecretsManager policy ekle |
| `DB_PORT=5432` → Supabase bağlanamıyor | Task definition'da `DB_PORT=6543` (connection pooler) |
| `RABBITMQ_URL` tek secret → servis başlamıyor | 4 ayrı secret: HOST, USERNAME, PASSWORD, VHOST |
| `$service:latest` → `serviceatest` (zsh) | `${service}:latest` süslü parantez kullan |
| Security group portları kapalı → timeout | 3000, 8080-8085 inbound açık |
| `job-service.career-net.local` NXDOMAIN | Cloud Map + `--service-registries` her `create/update-service`'te olmalı |
| Service güncelleme sırasında `--service-registries` unutulursa | DNS kaydı silinir, tekrar `update-service --service-registries` ile ekle |
