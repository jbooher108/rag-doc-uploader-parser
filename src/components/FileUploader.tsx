'use client';

import React, { useState, useCallback, useRef } from 'react';
import { FileUploadResponse, UploadProgress } from '@/types';

interface FileUploaderProps {
  onUploadSuccess?: (documentId: string) => void;
  onUploadError?: (error: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploadProgress({
      stage: 'uploading',
      progress: 0,
      message: 'Uploading file...',
    });

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result: FileUploadResponse = await response.json();

      if (result.success && result.documentId) {
        setUploadProgress({
          stage: 'complete',
          progress: 100,
          message: 'Upload complete!',
        });
        onUploadSuccess?.(result.documentId);
        
        // Reset after 2 seconds
        setTimeout(() => {
          setSelectedFile(null);
          setUploadProgress(null);
        }, 2000);
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Upload failed';
      setUploadProgress(null);
      onUploadError?.(errorMessage);
    }
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

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
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
        />

        {!selectedFile && !uploadProgress && (
          <>
            <div className="mb-4">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-lg font-semibold mb-2">
                Drop your file here or click to browse
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Supports text documents, audio files, and video files
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Choose File
            </button>

            <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
              <p className="mb-1">
                <span className="font-semibold">Text:</span> .txt, .md, .pdf, .doc, .docx
              </p>
              <p className="mb-1">
                <span className="font-semibold">Audio:</span> .mp3, .wav, .m4a, .ogg, .flac
              </p>
              <p>
                <span className="font-semibold">Video:</span> .mp4, .avi, .mov, .mkv, .webm
              </p>
            </div>
          </>
        )}

        {selectedFile && !uploadProgress && (
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <span className="text-6xl">{getFileIcon(selectedFile.name)}</span>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">{selectedFile.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={uploadFile}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
              >
                Upload to RAG Database
              </button>
              <button
                onClick={() => setSelectedFile(null)}
                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {uploadProgress && (
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              {uploadProgress.stage === 'complete' ? (
                <span className="text-6xl">✅</span>
              ) : (
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold">{uploadProgress.message}</h3>
              <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader; 