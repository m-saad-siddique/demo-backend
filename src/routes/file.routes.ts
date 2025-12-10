import { Router } from 'express';
import { upload } from '../middleware/upload.middleware';
import { FileService } from '../services/file.service';
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';

const router = Router();
const fileService = new FileService();

// Upload file
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded' },
      });
    }

    const fileRecord = await fileService.saveFile(
      req.file.filename,
      req.file.originalname,
      req.file.path,
      req.file.mimetype,
      req.file.size
    );

    res.status(201).json({
      success: true,
      data: fileRecord,
      message: 'File uploaded and analyzed successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to upload file' },
    });
  }
});

// Get all files
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const files = await fileService.getAllFiles(limit, offset);
    
    res.json({
      success: true,
      data: files,
      count: files.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch files' },
    });
  }
});

// Get file by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const file = await fileService.getFileById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found' },
      });
    }

    res.json({
      success: true,
      data: file,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch file' },
    });
  }
});

// Download file
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const file = await fileService.getFileById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found' },
      });
    }

    res.download(file.file_path, file.original_filename);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to download file' },
    });
  }
});

// Convert image
router.post('/:id/convert', async (req: Request, res: Response) => {
  try {
    const file = await fileService.getFileById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found' },
      });
    }

    if (!file.mime_type.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: { message: 'File is not an image' },
      });
    }

    const { format, width, height, quality } = req.body;
    const validFormats = ['jpeg', 'png', 'webp'];
    
    if (!format || !validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        error: { message: `Format must be one of: ${validFormats.join(', ')}` },
      });
    }

    const outputPath = await fileService.convertImage(file.file_path, format, {
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      quality: quality ? parseInt(quality) : undefined,
    });

    res.download(outputPath, `${path.parse(file.original_filename).name}.${format}`);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to convert image' },
    });
  }
});

// Delete file
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await fileService.deleteFile(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found' },
      });
    }

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to delete file' },
    });
  }
});

// Compress image
router.post('/:id/compress', async (req: Request, res: Response) => {
  try {
    const file = await fileService.getFileById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found' },
      });
    }

    if (!file.mime_type.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: { message: 'File is not an image' },
      });
    }

    const quality = req.body.quality ? parseInt(req.body.quality) : 80;
    const outputPath = await fileService.compressImage(file.file_path, quality);
    const stats = await fs.stat(outputPath);
    const originalStats = await fs.stat(file.file_path);
    const compressionRatio = ((1 - stats.size / originalStats.size) * 100).toFixed(2);

    res.download(outputPath, `compressed_${file.original_filename}`, () => {
      // Clean up temporary file after download
      fs.unlink(outputPath).catch(() => {});
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to compress image' },
    });
  }
});

// Resize image
router.post('/:id/resize', async (req: Request, res: Response) => {
  try {
    const file = await fileService.getFileById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found' },
      });
    }

    if (!file.mime_type.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: { message: 'File is not an image' },
      });
    }

    const { width, height, fit } = req.body;
    const outputPath = await fileService.resizeImage(
      file.file_path,
      width ? parseInt(width) : undefined,
      height ? parseInt(height) : undefined,
      fit || 'inside'
    );

    res.download(outputPath, `resized_${file.original_filename}`, () => {
      fs.unlink(outputPath).catch(() => {});
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to resize image' },
    });
  }
});

// Crop image
router.post('/:id/crop', async (req: Request, res: Response) => {
  try {
    const file = await fileService.getFileById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found' },
      });
    }

    if (!file.mime_type.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: { message: 'File is not an image' },
      });
    }

    const { x, y, width, height } = req.body;
    if (!x || !y || !width || !height) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required parameters: x, y, width, height' },
      });
    }

    const outputPath = await fileService.cropImage(
      file.file_path,
      parseInt(x),
      parseInt(y),
      parseInt(width),
      parseInt(height)
    );

    res.download(outputPath, `cropped_${file.original_filename}`, () => {
      fs.unlink(outputPath).catch(() => {});
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to crop image' },
    });
  }
});

// Extract PDF text
router.get('/:id/extract-text', async (req: Request, res: Response) => {
  try {
    const file = await fileService.getFileById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found' },
      });
    }

    if (file.mime_type !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        error: { message: 'File is not a PDF' },
      });
    }

    const text = await fileService.extractPDFText(file.file_path);
    
    res.json({
      success: true,
      data: {
        text,
        filename: file.original_filename,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to extract text from PDF' },
    });
  }
});

// Get file statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const stats = await fileService.getFileStatistics();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to get statistics' },
    });
  }
});

// Find duplicate files
router.get('/duplicates', async (req: Request, res: Response) => {
  try {
    const duplicates = await fileService.findDuplicates();
    res.json({
      success: true,
      data: duplicates,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to find duplicates' },
    });
  }
});

// Batch delete files
router.post('/batch/delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'ids must be a non-empty array' },
      });
    }

    const deletedCount = await fileService.batchDelete(ids);
    
    res.json({
      success: true,
      message: `Deleted ${deletedCount} file(s)`,
      deletedCount,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to delete files' },
    });
  }
});

export { router as fileRouter };

