# File Analyzer Backend

Node.js/Express API for file upload, analysis, and conversion.

## Quick Start

### Local Development (Without Docker)

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Running with Docker Compose

```bash
# 1. Create .env file (see Environment section below)

# 2. Start services (PostgreSQL + Backend)
docker-compose up -d

# 3. View logs
docker-compose logs -f backend

# 4. Stop services
docker-compose down

# 5. Stop and remove volumes (clean database)
docker-compose down -v
```

The backend will be available at `http://localhost:3001`

## Environment

Create `.env` file in the root directory:

### For Local Development (Docker Compose)
```env
PORT=3001
DB_HOST=postgres
DB_PORT=5432
DB_NAME=fileanalyzer
DB_USER=postgres
DB_PASSWORD=postgres
FRONTEND_URL=http://localhost:3000
```

### For Local Development (Without Docker)
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fileanalyzer
DB_USER=postgres
DB_PASSWORD=postgres
FRONTEND_URL=http://localhost:3000
```

### For AWS RDS Connection
```env
PORT=3001
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=fileanalyzer
DB_USER=your_db_username
DB_PASSWORD=your_db_password
FRONTEND_URL=https://your-alb-url.com

# Optional: SSL Configuration for RDS
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false

# Optional: Connection Pool Settings
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

**Notes:**
- When using Docker Compose, `DB_HOST` should be `postgres` (the service name)
- For local development without Docker, use `localhost`
- For RDS, use the RDS endpoint from AWS Console (RDS → Databases → Your DB → Connectivity & security)
- RDS endpoint format: `your-db-instance.xxxxxxxxxx.region.rds.amazonaws.com`

## Connecting to AWS RDS Database

### Prerequisites
- AWS RDS PostgreSQL instance created
- Security group configured to allow connections from your ECS tasks or local IP
- Database credentials (username and password)

### Step 1: Get RDS Endpoint

1. Go to AWS Console → RDS → Databases
2. Select your database instance
3. Under **Connectivity & security**, copy the **Endpoint** (e.g., `mydb.xxxxxxxxxx.us-east-1.rds.amazonaws.com`)
4. Note the **Port** (default is `5432` for PostgreSQL)

### Step 2: Configure Security Group

Ensure your RDS security group allows inbound connections:

1. Go to RDS → Databases → Your DB → Connectivity & security
2. Click on the **VPC security group**
3. Add inbound rule:
   - **Type:** PostgreSQL
   - **Port:** 5432
   - **Source:** 
     - For ECS: Select the ECS security group
     - For local testing: Your public IP address (`x.x.x.x/32`)

### Step 3: Update Environment Variables

#### For ECS Task Definition (Production)

In your ECS task definition, set environment variables or use AWS Secrets Manager:

**Option 1: Environment Variables (Not Recommended for Production)**
```json
{
  "name": "DB_HOST",
  "value": "your-rds-endpoint.region.rds.amazonaws.com"
},
{
  "name": "DB_PORT",
  "value": "5432"
},
{
  "name": "DB_NAME",
  "value": "fileanalyzer"
},
{
  "name": "DB_USER",
  "value": "your_db_username"
},
{
  "name": "DB_PASSWORD",
  "value": "your_db_password"
}
```

**Option 2: AWS Secrets Manager (Recommended)**

1. Store database credentials in Secrets Manager:
   ```json
   {
     "host": "your-rds-endpoint.region.rds.amazonaws.com",
     "port": "5432",
     "dbname": "fileanalyzer",
     "username": "your_db_username",
     "password": "your_db_password"
   }
   ```

2. Reference in ECS task definition:
   ```json
   {
     "name": "DB_HOST",
     "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:rds-credentials:host::"
   },
   {
     "name": "DB_PORT",
     "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:rds-credentials:port::"
   },
   {
     "name": "DB_NAME",
     "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:rds-credentials:dbname::"
   },
   {
     "name": "DB_USER",
     "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:rds-credentials:username::"
   },
   {
     "name": "DB_PASSWORD",
     "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:rds-credentials:password::"
   }
   ```

#### For Local Testing

Update your `.env` file:
```env
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=fileanalyzer
DB_USER=your_db_username
DB_PASSWORD=your_db_password
```

### Step 4: Test Connection

```bash
# Test connection locally
npm run dev

# Or with Docker
docker-compose up -d
docker-compose logs -f backend
```

You should see: `✅ Database connected successfully`

### SSL/TLS Connection (Optional)

The database connection already supports SSL configuration. To enable SSL for RDS:

1. Add to your `.env` file:
```env
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

2. For production with proper certificate validation:
   - Download the RDS CA certificate bundle from AWS
   - Set `DB_SSL_REJECT_UNAUTHORIZED=true` (requires proper CA certificate setup)

**Note:** The connection code automatically handles SSL when `DB_SSL=true` is set. No code changes needed.

### Troubleshooting

**Connection timeout:**
- Check security group rules allow inbound traffic from your source
- Verify RDS is in the same VPC as your ECS tasks
- Check route tables and network ACLs

**Authentication failed:**
- Verify username and password are correct
- Check database name exists
- Ensure user has proper permissions

**Connection refused:**
- Verify RDS endpoint is correct
- Check port number (default 5432)
- Ensure RDS instance is available (not stopped)

## API Endpoints

- `POST /api/files/upload` - Upload file
- `GET /api/files` - List files
- `GET /api/files/:id` - Get file details
- `POST /api/files/:id/convert` - Convert image
- `POST /api/files/:id/compress` - Compress image
- `POST /api/files/:id/resize` - Resize image
- `POST /api/files/:id/crop` - Crop image
- `GET /api/files/:id/extract-text` - Extract PDF text
- `GET /api/files/stats/summary` - Get statistics
- `GET /api/files/duplicates` - Find duplicates
- `POST /api/files/batch/delete` - Batch delete
- `DELETE /api/files/:id` - Delete file

## Building Docker Image

### Build for Local Testing

```bash
# Build the image
docker build -t fileanalyzer-backend:latest .

# Run the container (requires PostgreSQL running separately)
docker run -p 3001:3001 \
  -e PORT=3001 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_NAME=fileanalyzer \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  fileanalyzer-backend:latest
```

### Build and Push to ECR (AWS)

```bash
# 1. Authenticate Docker to ECR
aws ecr get-login-password --region <region> | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com

# 2. Build the image
docker build -t backend-repo:latest .

# 3. Tag for ECR
docker tag backend-repo:latest \
  <account-id>.dkr.ecr.<region>.amazonaws.com/backend-repo:latest

# 4. Push to ECR
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/backend-repo:latest

# Optional: Tag with Git commit SHA
COMMIT_SHA=$(git rev-parse --short HEAD)
docker tag backend-repo:latest \
  <account-id>.dkr.ecr.<region>.amazonaws.com/backend-repo:$COMMIT_SHA
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/backend-repo:$COMMIT_SHA
```

**Replace:**
- `<account-id>` with your AWS account ID
- `<region>` with your AWS region (e.g., `us-east-1`)

## Tech Stack

- Node.js 20, Express 4, TypeScript 5
- PostgreSQL 16
- Sharp (image processing)
- Multer (file upload)
