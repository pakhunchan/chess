# AWS Deployment Plan for Chess Backend

## Configuration
| Setting | Value |
|---------|-------|
| Domain | `pakhunchan.com` |
| Frontend URL | `chess.pakhunchan.com` |
| API URL | `chess-api.pakhunchan.com` |
| AWS Region | `us-east-1` |
| GitHub Repo | `pakhunchan/chess` |
| Network Mode | Public subnet (cost-optimized) |

## Overview
Deploy FastAPI backend to AWS using ECS Fargate, RDS PostgreSQL, ALB + ACM, with CDK (TypeScript) for IaC and GitHub Actions for CI/CD.

## Estimated Monthly Cost: ~$45/month
| Service | Cost |
|---------|------|
| ECS Fargate (256 CPU/512MB) | ~$9.50 |
| RDS PostgreSQL (db.t3.micro) | ~$12.50 |
| ALB | ~$16.50 |
| ECR, Route53, Secrets, Logs | ~$5.00 |

*Using public subnet for ECS (no NAT Gateway) saves ~$32/month*

---

## Project Structure

```
chess/
├── backend/                 # Existing (minor modifications needed)
├── frontend/                # Existing
├── infra/                   # NEW - CDK TypeScript project
│   ├── bin/
│   │   └── infra.ts        # CDK app entry point
│   ├── lib/
│   │   ├── network-stack.ts    # VPC, subnets, security groups
│   │   ├── database-stack.ts   # RDS PostgreSQL + Secrets Manager
│   │   ├── ecr-stack.ts        # Container registry
│   │   ├── alb-stack.ts        # Load balancer + ACM certificate
│   │   └── ecs-stack.ts        # Fargate service + GitHub OIDC role
│   ├── cdk.json
│   ├── tsconfig.json
│   └── package.json
└── .github/
    └── workflows/
        └── deploy.yml      # NEW - CI/CD pipeline
```

---

## Implementation Steps

### Phase 1: Backend Code Changes (3 files)

1. **backend/Dockerfile** - Add `curl` for ECS health checks
   ```dockerfile
   RUN apt-get update && apt-get install -y --no-install-recommends \
       libpq-dev stockfish curl && rm -rf /var/lib/apt/lists/*
   ```

2. **backend/app/database.py** - Support AWS Secrets Manager components
   ```python
   def get_database_url():
       if url := os.getenv("DATABASE_URL"):
           return url
       # AWS injects individual secrets
       user = os.getenv("DB_USER", "chess")
       password = os.getenv("DB_PASSWORD", "chess")
       host = os.getenv("DB_HOST", "localhost")
       port = os.getenv("DB_PORT", "5432")
       dbname = os.getenv("DB_NAME", "chess")
       return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"
   ```

3. **backend/app/main.py** - Configurable CORS origins
   ```python
   CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
   ```
   *Production value: `https://chess.pakhunchan.com,http://localhost:5173`*

### Phase 2: CDK Infrastructure Setup

1. **Initialize CDK project**
   ```bash
   mkdir infra && cd infra
   npx cdk init app --language typescript
   npm install aws-cdk-lib constructs
   ```

2. **Create NetworkStack** (`lib/network-stack.ts`)
   - VPC with 2 AZs (no NAT Gateway for cost savings)
   - Public subnets for ALB and ECS Fargate
   - Isolated subnets for RDS (no internet access)
   - Security groups: ALB (443/80) → ECS (8000) → RDS (5432)

3. **Create DatabaseStack** (`lib/database-stack.ts`)
   - RDS PostgreSQL 16, db.t3.micro, single-AZ
   - 20GB GP2 storage
   - Auto-generated credentials in Secrets Manager
   - Isolated subnet placement

4. **Create EcrStack** (`lib/ecr-stack.ts`)
   - ECR repository with lifecycle rules
   - Keep only 5 tagged images

5. **Create AlbStack** (`lib/alb-stack.ts`)
   - Application Load Balancer (internet-facing)
   - ACM certificate for `chess-api.pakhunchan.com` with DNS validation
   - HTTPS listener (443) + HTTP→HTTPS redirect
   - Route 53 A record: `chess-api` → ALB

6. **Create EcsStack** (`lib/ecs-stack.ts`)
   - ECS Cluster
   - Fargate Task Definition (256 CPU / 512 MB)
   - Container with secrets injection from Secrets Manager
   - Service with health checks on `/health`
   - GitHub OIDC provider + IAM role for CI/CD

### Phase 3: GitHub Actions CI/CD

1. **Create `.github/workflows/deploy.yml`**
   - Trigger on push to `main` (backend/** paths)
   - Use OIDC for AWS authentication (no long-lived keys)
   - Build and push Docker image to ECR
   - Update ECS task definition
   - Deploy with rolling update

### Phase 4: Deployment

1. Bootstrap CDK: `cdk bootstrap aws://ACCOUNT/REGION`
2. Deploy all stacks: `cdk deploy --all`
3. Push initial Docker image to ECR
4. Add `AWS_ROLE_ARN` secret to GitHub repo
5. Verify health check and CORS configuration

---

## Architecture Diagram

```
                    chess-api.pakhunchan.com
                              │
Internet → Route53 → ALB (HTTPS:443) → ECS Fargate → RDS PostgreSQL
                         │                   │              │
                        ACM              Public        Isolated
                    (SSL Cert)           Subnet         Subnet
                                            │
                                      Secrets Manager
                                      (DB credentials)

GitHub Actions (pakhunchan/chess) → ECR → ECS (rolling deploy)
```

---

## Security

- RDS in isolated subnet (no internet access)
- ECS in public subnet with security group restrictions
- Secrets Manager for database credentials
- Security groups restrict traffic between tiers
- GitHub OIDC (no long-lived AWS access keys)
- TLS 1.2+ enforced on ALB

---

## Post-Deployment Checklist

1. [ ] CDK bootstrap completed in us-east-1
2. [ ] All stacks deployed successfully
3. [ ] Initial Docker image pushed to ECR
4. [ ] `AWS_ROLE_ARN` secret added to GitHub repo (pakhunchan/chess)
5. [ ] DNS propagation verified for chess-api.pakhunchan.com
6. [ ] Health check endpoint responding at https://chess-api.pakhunchan.com/health
7. [ ] Frontend CORS working from chess.pakhunchan.com
