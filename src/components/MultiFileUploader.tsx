'use client';

import React, { useState, useCallback, useRef } from 'react';
import { FileUploadResponse, FileUploadItem, BatchUploadStats } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface MultiFileUploaderProps {
  onBatchComplete?: (stats: BatchUploadStats) => void;
  maxConcurrentUploads?: number;
}

const MultiFileUploader: React.FC<MultiFileUploaderProps> = ({
  onBatchComplete,
  maxConcurrentUploads = 3,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileItems, setFileItems] = useState<FileUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadQueueRef = useRef<Set<string>>(new Set());

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      addFiles(Array.from(files));
    }
  };

  const addFiles = (files: File[]) => {
    const newFileItems: FileUploadItem[] = files.map((file) => ({
      id: uuidv4(),
      file,
      status: 'pending',
      progress: 0,
      message: 'Waiting to upload...',
    }));

    setFileItems((prev) => [...prev, ...newFileItems]);
  };

  const removeFile = (id: string) => {
    setFileItems((prev) => prev.filter((item) => item.id !== id));
  };

  const uploadFile = async (item: FileUploadItem): Promise<void> => {
    // Update status to uploading
    setFileItems((prev) =>
      prev.map((f) =>
        f.id === item.id
          ? { ...f, status: 'uploading', progress: 20, message: 'Uploading...' }
          : f
      )
    );

    const formData = new FormData();
    formData.append('file', item.file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result: FileUploadResponse = await response.json();

      if (result.success && result.documentId) {
        setFileItems((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: 'complete',
                  progress: 100,
                  message: 'Upload complete!',
                  documentId: result.documentId,
                }
              : f
          )
        );
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Upload failed';
      
      setFileItems((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: 'error',
                progress: 0,
                message: errorMessage,
                error: errorMessage,
              }
            : f
        )
      );
    } finally {
      uploadQueueRef.current.delete(item.id);
    }
  };

  const startBatchUpload = async () => {
    setIsUploading(true);
    const pendingFiles = fileItems.filter((item) => item.status === 'pending');

    // Process files with concurrency limit
    for (let i = 0; i < pendingFiles.length; i += maxConcurrentUploads) {
      const batch = pendingFiles.slice(i, i + maxConcurrentUploads);
      await Promise.all(batch.map((item) => uploadFile(item)));
    }

    setIsUploading(false);

    // Calculate stats
    const stats: BatchUploadStats = {
      total: fileItems.length,
      completed: fileItems.filter((item) => item.status === 'complete').length,
      failed: fileItems.filter((item) => item.status === 'error').length,
      inProgress: 0,
    };

    onBatchComplete?.(stats);
  };

  const clearCompleted = () => {
    setFileItems((prev) => prev.filter((item) => item.status !== 'complete'));
  };

  const clearAll = () => {
    setFileItems([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(extension || '')) {
      return '🎥';
    } else if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(extension || '')) {
      return '🎵';
    } else if (['csv', 'json'].includes(extension || '')) {
      return '📊';
    } else {
      return '📄';
    }
  };

  const getStatusIcon = (status: FileUploadItem['status']): string => {
    switch (status) {
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
      case 'uploading':
      case 'processing':
        return '⏳';
      default:
        return '⏸️';
    }
  };

  const getStatusColor = (status: FileUploadItem['status']): string => {
    switch (status) {
      case 'complete':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'uploading':
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const stats: BatchUploadStats = {
    total: fileItems.length,
    completed: fileItems.filter((item) => item.status === 'complete').length,
    failed: fileItems.filter((item) => item.status === 'error').length,
    inProgress: fileItems.filter((item) => 
      item.status === 'uploading' || item.status === 'processing'
    ).length,
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all mb-6
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept=".txt,.md,.pdf,.doc,.docx,.csv,.json,.mp3,.wav,.m4a,.ogg,.flac,.mp4,.avi,.mov,.mkv,.webm"
          className="hidden"
          multiple
        />

        <div className="mb-4">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-lg font-semibold mb-2">
            Drop your files here or click to browse
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You can upload multiple files at once for bulk processing
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>📄 Text files: max 100MB each</p>
            <p>📊 CSV/JSON files: max 100MB each (auto-detected webpage data)</p>
            <p>🎵 Audio files: max 200MB each</p>
            <p>🎥 Video files: max 1GB each (auto-segmented if over 100MB)</p>
          </div>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          disabled={isUploading}
        >
          Choose Files
        </button>
      </div>

      {fileItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Files ({stats.total})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={clearCompleted}
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                disabled={isUploading || stats.completed === 0}
              >
                Clear Completed
              </button>
              <button
                onClick={clearAll}
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                disabled={isUploading}
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
            {fileItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <span className="text-2xl mr-3">{getFileIcon(item.file.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(item.file.size)} • {item.message}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className={`text-xl ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                  </span>
                  {item.status === 'pending' && !isUploading && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="text-green-600 dark:text-green-400">
                  ✓ {stats.completed} completed
                </span>
                {stats.failed > 0 && (
                  <span className="ml-4 text-red-600 dark:text-red-400">
                    ✗ {stats.failed} failed
                  </span>
                )}
                {stats.inProgress > 0 && (
                  <span className="ml-4 text-blue-600 dark:text-blue-400">
                    ⟳ {stats.inProgress} in progress
                  </span>
                )}
              </div>
              <button
                onClick={startBatchUpload}
                disabled={
                  isUploading ||
                  fileItems.filter((item) => item.status === 'pending').length === 0
                }
                className={`
                  px-6 py-3 rounded-lg font-medium transition-colors
                  ${
                    isUploading ||
                    fileItems.filter((item) => item.status === 'pending').length === 0
                      ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }
                `}
              >
                {isUploading
                  ? `Uploading... (${stats.inProgress} files)`
                  : `Upload ${
                      fileItems.filter((item) => item.status === 'pending').length
                    } Files`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiFileUploader; 