export interface FileRecord {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  size: number;
  file_path: string;
  metadata: FileMetadata | string;
  created_at: Date;
  updated_at: Date;
}

export interface FileMetadata {
  type?: string;
  width?: number;
  height?: number;
  format?: string;
  hasAlpha?: boolean;
  colorSpace?: string;
  channels?: number;
  density?: number;
  fileSize?: number;
  detectedMimeType?: string;
  extension?: string;
  note?: string;
  error?: string;
}

export interface FileUploadResponse {
  success: boolean;
  data: FileRecord;
  message: string;
}

export interface FileListResponse {
  success: boolean;
  data: FileRecord[];
  count: number;
}

