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
```env
PORT=3001
DB_HOST=postgres
DB_PORT=5432
DB_NAME=fileanalyzer
DB_USER=postgres
DB_PASSWORD=postgres
FRONTEND_URL=http://localhost:3000
```

**Note:** When using Docker Compose, `DB_HOST` should be `postgres` (the service name). For local development without Docker, use `localhost`.

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
