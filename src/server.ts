import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileRouter } from './routes/file.routes';
import { errorHandler } from './middleware/error.middleware';
import { initializeDatabase } from './database/connection';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api//health', (req, res) => {
  res.json({ status: 'ok', message: 'File Analyzer API is running' });
});

app.get('/api/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'File Analyzer API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      files: '/api/files'
    }
  });
});

app.use('/api/files', fileRouter);

// Error handling
app.use(errorHandler);

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📁 Upload directory: ${process.env.UPLOAD_DIR || './uploads'}`);
    });
  })
  .catch((error) => {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  });

