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

export type FileType = 'text' | 'audio' | 'video';

export interface DocumentMetadata {
  source: FileType | 'shopify';
  originalFormat: string;
  uploadedAt: Date;
  processingSteps?: string[];
  // Shopify-specific metadata
  productType?: string;
  productHandle?: string;
  productTitle?: string;
  vendor?: string;
  type?: string;
  tags?: string[];
  price?: string;
  sku?: string;
  inStock?: boolean;
  priorityScore?: number;
  duration?: number; // for audio/video files
  url?: string; // for Shopify product URLs
}

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