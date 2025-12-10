import { pool } from '../database/connection';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileTypeFromFile } from 'file-type';
import { FileRecord, FileMetadata } from '../types/file.types';

export class FileService {
  async saveFile(
    filename: string,
    originalFilename: string,
    filePath: string,
    mimeType: string,
    size: number
  ): Promise<FileRecord> {
    let metadata: FileMetadata = {};

    try {
      // Analyze file based on type
      if (mimeType.startsWith('image/')) {
        metadata = await this.analyzeImage(filePath);
      } else if (mimeType === 'application/pdf') {
        metadata = await this.analyzePDF(filePath);
      } else {
        metadata = await this.analyzeGeneric(filePath);
      }

      const result = await pool.query(
        `INSERT INTO files (filename, original_filename, mime_type, size, file_path, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [filename, originalFilename, mimeType, size, filePath, JSON.stringify(metadata)]
      );

      return result.rows[0];
    } catch (error) {
      // Clean up file if database insert fails
      await fs.unlink(filePath).catch(() => {});
      throw error;
    }
  }

  async getAllFiles(limit: number = 50, offset: number = 0): Promise<FileRecord[]> {
    const result = await pool.query(
      `SELECT * FROM files ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async getFileById(id: string): Promise<FileRecord | null> {
    const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async deleteFile(id: string): Promise<boolean> {
    const file = await this.getFileById(id);
    if (!file) {
      return false;
    }

    // Delete file from filesystem
    try {
      await fs.unlink(file.file_path);
    } catch (error) {
      console.error('Error deleting file from filesystem:', error);
    }

    // Delete record from database
    await pool.query('DELETE FROM files WHERE id = $1', [id]);
    return true;
  }

  private async analyzeImage(filePath: string): Promise<FileMetadata> {
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();
      const stats = await fs.stat(filePath);

      return {
        type: 'image',
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        hasAlpha: metadata.hasAlpha,
        colorSpace: metadata.space,
        channels: metadata.channels,
        density: metadata.density,
        fileSize: stats.size,
      };
    } catch (error) {
      console.error('Error analyzing image:', error);
      return { type: 'image', error: 'Failed to analyze image' };
    }
  }

  private async analyzePDF(filePath: string): Promise<FileMetadata> {
    try {
      const stats = await fs.stat(filePath);
      return {
        type: 'pdf',
        fileSize: stats.size,
        note: 'PDF analysis - basic metadata only',
      };
    } catch (error) {
      console.error('Error analyzing PDF:', error);
      return { type: 'pdf', error: 'Failed to analyze PDF' };
    }
  }

  private async analyzeGeneric(filePath: string): Promise<FileMetadata> {
    try {
      const stats = await fs.stat(filePath);
      const fileType = await fileTypeFromFile(filePath);

      return {
        type: 'generic',
        fileSize: stats.size,
        detectedMimeType: fileType?.mime,
        extension: fileType?.ext,
      };
    } catch (error) {
      console.error('Error analyzing file:', error);
      return { type: 'generic', error: 'Failed to analyze file' };
    }
  }

  async convertImage(
    filePath: string,
    outputFormat: 'jpeg' | 'png' | 'webp',
    options?: { width?: number; height?: number; quality?: number }
  ): Promise<string> {
    const outputPath = filePath.replace(path.extname(filePath), `.${outputFormat}`);
    
    let pipeline = sharp(filePath);

    if (options?.width || options?.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    switch (outputFormat) {
      case 'jpeg':
        await pipeline.jpeg({ quality: options?.quality || 80 }).toFile(outputPath);
        break;
      case 'png':
        await pipeline.png({ quality: options?.quality || 80 }).toFile(outputPath);
        break;
      case 'webp':
        await pipeline.webp({ quality: options?.quality || 80 }).toFile(outputPath);
        break;
    }

    return outputPath;
  }

  async compressImage(filePath: string, quality: number = 80): Promise<string> {
    const outputPath = filePath.replace(path.extname(filePath), `_compressed${path.extname(filePath)}`);
    const image = sharp(filePath);
    const metadata = await image.metadata();

    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      await image.jpeg({ quality, mozjpeg: true }).toFile(outputPath);
    } else if (metadata.format === 'png') {
      await image.png({ quality, compressionLevel: 9 }).toFile(outputPath);
    } else if (metadata.format === 'webp') {
      await image.webp({ quality }).toFile(outputPath);
    } else {
      // Convert to JPEG for compression
      await image.jpeg({ quality, mozjpeg: true }).toFile(outputPath.replace(path.extname(outputPath), '.jpg'));
      return outputPath.replace(path.extname(outputPath), '.jpg');
    }

    return outputPath;
  }

  async resizeImage(
    filePath: string,
    width?: number,
    height?: number,
    fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' = 'inside'
  ): Promise<string> {
    const outputPath = filePath.replace(path.extname(filePath), `_resized${path.extname(filePath)}`);
    
    await sharp(filePath)
      .resize(width, height, {
        fit,
        withoutEnlargement: true,
      })
      .toFile(outputPath);

    return outputPath;
  }

  async cropImage(
    filePath: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<string> {
    const outputPath = filePath.replace(path.extname(filePath), `_cropped${path.extname(filePath)}`);
    
    await sharp(filePath)
      .extract({ left: x, top: y, width, height })
      .toFile(outputPath);

    return outputPath;
  }

  async extractPDFText(filePath: string): Promise<string> {
    try {
      // Dynamic import to handle optional dependency
      const pdfParse = await import('pdf-parse').catch(() => null);
      if (!pdfParse) {
        throw new Error('PDF parsing library not available');
      }
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse.default(dataBuffer);
      return data.text || 'No text found in PDF';
    } catch (error: any) {
      console.error('Error extracting PDF text:', error);
      throw new Error(error.message || 'Failed to extract text from PDF');
    }
  }

  async getFileStatistics(): Promise<any> {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_files,
        SUM(size) as total_size,
        COUNT(CASE WHEN mime_type LIKE 'image/%' THEN 1 END) as image_count,
        COUNT(CASE WHEN mime_type = 'application/pdf' THEN 1 END) as pdf_count,
        COUNT(CASE WHEN mime_type LIKE 'text/%' THEN 1 END) as text_count,
        AVG(size) as avg_file_size,
        MAX(size) as max_file_size,
        MIN(size) as min_file_size
      FROM files
    `);
    return result.rows[0];
  }

  async findDuplicates(): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        original_filename,
        size,
        mime_type,
        COUNT(*) as duplicate_count,
        array_agg(id) as file_ids
      FROM files
      GROUP BY original_filename, size, mime_type
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `);
    return result.rows;
  }

  async batchDelete(ids: string[]): Promise<number> {
    let deletedCount = 0;
    for (const id of ids) {
      const deleted = await this.deleteFile(id);
      if (deleted) deletedCount++;
    }
    return deletedCount;
  }
}

