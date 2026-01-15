# AWS Database Migration Details

This document provides a technical breakdown of the one-off database migration performed on 2026-01-14 to add the `username` column to the production RDS instance.

## 1. How we know it worked

The migration was run as a Python script within an ECS Fargate container. The script used a `try-except` block and only printed "Migration successful." if all commands finished without error.

- **Transaction Integrity**: SQLAlchemy's `with engine.connect() as conn:` combined with `conn.commit()` ensures that the SQL is either fully applied or fully rolled back if an error occurs.
- **Log Verification**: We fetched the logs from CloudWatch after the task finished. The log stream `chess-api/ChessApi/07d85d460e3a4c21bf81998220d8a4ac` contained exactly:
  ```text
  Migration successful.
  ```
- **Safety**: The SQL used `IF NOT EXISTS`, so even if the script were run twice, it would not cause an error or data loss.

---

## 2. CLI Commands & Process

### Step A: Identify Network & Task Config
Before running the migration, I gathered the existing network settings from your production service to ensure the one-off task could "see" the database.

**Command:**
```bash
aws ecs describe-services --cluster chess-cluster --services chess-service
```
- **What it did**: Retrieved the Subnets and Security Groups used by the API. Without these, the migration task wouldn't have permission to connect to the private RDS.

### Step B: Execution (The Migration)
I ran a one-off task using your existing container image but **overrode** the starting command.

**Command:**
```bash
aws ecs run-task \
  --cluster chess-cluster \
  --task-definition <task-def-arn> \
  --launch-type FARGATE \
  --network-configuration '{"awsvpcConfiguration":{"subnets":["subnet-1","subnet-2"],"securityGroups":["sg-1"],"assignPublicIp":"ENABLED"}}' \
  --overrides '{
    "containerOverrides": [{
      "name": "ChessApi",
      "command": [
        "python3", "-c", 
        "import os\nfrom sqlalchemy import create_engine, text\nfrom app.database import get_database_url\ntry:\n    db_url = get_database_url()\n    engine = create_engine(db_url)\n    with engine.connect() as conn:\n        conn.execute(text(\"ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;\"))\n        conn.execute(text(\"CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);\"))\n        conn.commit()\n    print(\"Migration successful.\")\nexcept Exception as e:\n    print(f\"Migration failed: {e}\")\n    exit(1)"
      ]
    }]
  }'
```

**Key Components:**
- **`--task-definition`**: Used the existing production configuration. This is what allowed the script to use `import app.database` (the code was already in the image) and `os.environ` (secrets were injected automatically by ECS).
- **`--overrides`**: This is the "magic" part. Instead of running the web server (`uvicorn`), we told the container to run a short Python script.
- **`get_database_url()`**: Because we used your actual production image, we could reuse your existing database connection logic, ensuring the script used the correct VPC/RDS credentials.

### Step C: Verification (Logs)
Once the task finished, I polled CloudWatch to see what happened inside the container.

**Command:**
```bash
aws logs get-log-events \
  --log-group-name /ecs/chess \
  --log-stream-name chess-api/ChessApi/<task-id>
```
- **What it did**: Retrieved the standard output (stdout) of the Python script. Seeing "Migration successful" confirmed the DB commit was accepted by RDS.

---

## Security Notes
- **No Residual Files**: This command was run entirely via the CLI. No migration scripts were saved to your disk or pushed to GitHub.
- **Secret Hygiene**: No passwords or keys were passed in the command line. The script relied on ECS to inject them into the environment variables at the moment of execution.
