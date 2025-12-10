# File Analyzer Backend

Node.js/Express API for file upload, analysis, and conversion.

## Quick Start

```bash
# Using Docker Compose
docker-compose up -d

# Or local development
npm install
npm run dev
```

## Environment

Create `.env` file:
```env
PORT=3001
DB_HOST=postgres
DB_PORT=5432
DB_NAME=fileanalyzer
DB_USER=postgres
DB_PASSWORD=postgres
FRONTEND_URL=http://localhost:3000
```

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

## Tech Stack

- Node.js 20, Express 4, TypeScript 5
- PostgreSQL 16
- Sharp (image processing)
- Multer (file upload)
