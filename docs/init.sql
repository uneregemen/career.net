-- career.net PostgreSQL schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT now()
);

-- ── Companies ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cognito_user_id VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now()
);

-- ── Jobs ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    company_id UUID REFERENCES companies(id),
    country VARCHAR(100),
    city VARCHAR(100),
    town VARCHAR(100),
    working_preference VARCHAR(50),
    requirements TEXT,
    salary_range VARCHAR(100),
    posted_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs USING gin(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active);

-- ── In-app Notifications ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    job_id UUID REFERENCES jobs(id),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ── Job Alerts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    position_keywords VARCHAR(255),
    city VARCHAR(100),
    working_preference VARCHAR(50),
    created_at TIMESTAMP DEFAULT now(),
    is_active BOOLEAN DEFAULT TRUE
);

-- ── Applications ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id),
    user_id VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT now(),
    status VARCHAR(50) DEFAULT 'APPLIED'
);

-- ── Seed data (dev only) ──────────────────────────────────────────────────────
INSERT INTO companies (id, name, cognito_user_id, is_admin, is_verified)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'TechCorp Istanbul', 'seed-cognito-company-1', false, true),
    ('a0000000-0000-0000-0000-000000000002', 'StartupHub Izmir', 'seed-cognito-company-2', false, true),
    ('a0000000-0000-0000-0000-000000000003', 'FinTech Ankara', 'seed-cognito-company-3', false, true)
ON CONFLICT DO NOTHING;

INSERT INTO jobs (title, description, company_id, country, city, town, working_preference, requirements, salary_range)
VALUES
    ('Frontend Developer', 'Build modern React UIs', 'a0000000-0000-0000-0000-000000000001', 'Turkey', 'Istanbul', 'Kadikoy', 'HYBRID', 'React, TypeScript, 2+ years', '30000-45000 TRY'),
    ('Full Stack Developer', 'Node.js and React development', 'a0000000-0000-0000-0000-000000000001', 'Turkey', 'Istanbul', 'Besiktas', 'FULLTIME', 'Node.js, React, PostgreSQL', '40000-60000 TRY'),
    ('Backend Java Developer', 'Spring Boot microservices', 'a0000000-0000-0000-0000-000000000002', 'Turkey', 'Izmir', 'Bornova', 'FULLTIME', 'Java, Spring Boot, 3+ years', '35000-50000 TRY'),
    ('DevOps Engineer', 'AWS and Kubernetes', 'a0000000-0000-0000-0000-000000000003', 'Turkey', 'Ankara', 'Cankaya', 'REMOTE', 'AWS, Docker, Kubernetes', '50000-70000 TRY'),
    ('Mobile Developer', 'React Native iOS/Android', 'a0000000-0000-0000-0000-000000000001', 'Turkey', 'Istanbul', 'Sisli', 'HYBRID', 'React Native, JavaScript', '35000-55000 TRY'),
    ('Data Engineer', 'Big data pipelines', 'a0000000-0000-0000-0000-000000000002', 'Turkey', 'Izmir', 'Alsancak', 'FULLTIME', 'Python, Spark, SQL', '40000-60000 TRY'),
    ('Web Developer', 'Full stack web development', 'a0000000-0000-0000-0000-000000000003', 'Turkey', 'Ankara', 'Kecioren', 'PARTTIME', 'HTML, CSS, JavaScript', '20000-30000 TRY');
