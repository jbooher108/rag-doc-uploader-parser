export interface FileUploadResponse {
  success: boolean;
  message: string;
  documentId?: string;
  error?: string;
}

export interface ProcessedDocument {
  id: string;
  filename: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
}

export interface DocumentMetadata {
  source: 'text' | 'audio' | 'video';
  originalFormat: string;
  uploadedAt: Date;
  processingSteps?: string[];
  duration?: number; // for audio/video files
}

export type FileType = 'text' | 'audio' | 'video';

export interface UploadProgress {
  stage: 'uploading' | 'processing' | 'embedding' | 'storing' | 'complete';
  progress: number;
  message: string;
}

export interface FileUploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  documentId?: string;
  error?: string;
}

export interface BatchUploadStats {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
} 