'use client';

import React, { useState } from 'react';

export function WebpageUploader({ onUploadComplete }: { onUploadComplete?: (docId: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate it's a CSV or JSON file
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      setUploadStatus('Please select a CSV or JSON file');
      return;
    }

    // Check file size (warn for very large files)
    const maxSizeWarningMB = 50;
    if (file.size > maxSizeWarningMB * 1024 * 1024) {
      setUploadStatus(`Warning: Large file (${(file.size / 1024 / 1024).toFixed(1)}MB). Processing may take a while.`);
    }

    setIsUploading(true);
    setUploadStatus(`Uploading ${file.name.endsWith('.csv') ? 'CSV' : 'JSON'} file...`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus('✅ Webpage data uploaded successfully!');
        onUploadComplete?.(result.documentId);
      } else {
        setUploadStatus(`❌ Upload failed: ${result.message}`);
      }
    } catch (error) {
      setUploadStatus(`❌ Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">🌐</div>
        <div>
          <h3 className="font-semibold text-lg">Webpage Content Upload</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Upload CSV or JSON files containing webpage/blog content
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Supported Data Format</h4>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <p>• <strong>CSV files</strong> with columns like: Title, Author, Body HTML, Handle, Published At</p>
            <p>• <strong>JSON files</strong> with webpage/blog post data</p>
            <p>• Automatically extracts and cleans HTML content</p>
            <p>• Creates searchable embeddings with metadata</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="file"
            accept=".csv,.json"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 file:cursor-pointer cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          {uploadStatus && (
            <div className={`p-3 rounded-lg text-sm ${
              uploadStatus.includes('✅') 
                ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800'
                : uploadStatus.includes('❌')
                ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800'
                : uploadStatus.includes('Warning')
                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-800'
                : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800'
            }`}>
              {uploadStatus}
            </div>
          )}
          
          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
              Processing webpage data...
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>💡 <strong>Tips for best results:</strong></p>
          <p>• Ensure your CSV has columns like "Title", "Body HTML", "Author"</p>
          <p>• Published content will be prioritized over draft content</p>
          <p>• HTML content will be automatically cleaned and formatted</p>
          <p>• Files larger than 50MB may take longer to process</p>
        </div>
      </div>
    </div>
  );
} 