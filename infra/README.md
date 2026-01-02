# Chess API Infrastructure

AWS CDK infrastructure for deploying the Chess API to AWS.

## Architecture

- **ECS Fargate**: Runs the FastAPI container (256 CPU / 512 MB)
- **RDS PostgreSQL**: db.t3.micro, single-AZ (~$12.50/month)
- **ALB + ACM**: HTTPS load balancer with SSL certificate
- **ECR**: Docker image repository
- **Secrets Manager**: Database credentials

## Estimated Monthly Cost: ~$45

| Service | Cost |
|---------|------|
| ECS Fargate | ~$9.50 |
| RDS PostgreSQL | ~$12.50 |
| ALB | ~$16.50 |
| ECR, Route53, Secrets, Logs | ~$5.00 |

## Prerequisites

1. AWS CLI configured with credentials
2. Node.js 18+ installed
3. Domain configured in Route 53 (pakhunchan.com)

## Deployment

### First-time setup

```bash
# Install dependencies
cd infra
npm install

# Bootstrap CDK (first time only)
npx cdk bootstrap aws://ACCOUNT_ID/us-east-1

# Deploy all stacks
npx cdk deploy --all
```

### After deployment

1. **Push initial Docker image to ECR:**
   ```bash
   # Get the ECR login command
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

   # Build and push
   cd ../backend
   docker build -t chess-api .
   docker tag chess-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/chess-api:latest
   docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/chess-api:latest
   ```

2. **Add GitHub secret:**
   - Go to: https://github.com/pakhunchan/chess/settings/secrets/actions
   - Add secret: `AWS_ROLE_ARN`
   - Value: Copy from CDK output `ChessEcsStack.GithubActionsRoleArn`

3. **Verify deployment:**
   - Health check: https://chess-api.pakhunchan.com/health
   - Create a game: `curl -X POST https://chess-api.pakhunchan.com/games`

## Stacks

| Stack | Resources |
|-------|-----------|
| ChessNetworkStack | VPC, Subnets, Security Groups |
| ChessDatabaseStack | RDS PostgreSQL, Secrets Manager |
| ChessEcrStack | ECR Repository |
| ChessAlbStack | ALB, ACM Certificate, Route 53 Record |
| ChessEcsStack | ECS Cluster, Fargate Service, GitHub OIDC |

## Useful Commands

```bash
# Synthesize CloudFormation templates
npx cdk synth

# Compare deployed stack with current state
npx cdk diff

# Deploy a specific stack
npx cdk deploy ChessEcsStack

# Destroy all stacks (careful!)
npx cdk destroy --all
```

## CI/CD

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:
1. Builds the Docker image on push to `main`
2. Pushes to ECR
3. Updates the ECS task definition
4. Deploys with rolling update

Triggered by changes to:
- `backend/**`
- `.github/workflows/deploy.yml`
