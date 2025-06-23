'use client';

import React, { useState } from 'react';

export function ShopifyUploader({ onUploadComplete }: { onUploadComplete?: (docId: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate it's a CSV file
    if (!file.name.endsWith('.csv')) {
      setUploadStatus('Please select a CSV file');
      return;
    }

    // Check if it's a Shopify CSV (basic check)
    if (!file.name.toLowerCase().includes('product')) {
      setUploadStatus('Warning: This might not be a Shopify products CSV. Make sure your file is named like "products_export.csv" or contains "shopify" in the filename.');
    }

    setIsUploading(true);
    setUploadStatus('Uploading Shopify products...');

    const formData = new FormData();
    // Rename the file to include 'shopify' if it doesn't already
    const fileName = file.name.toLowerCase().includes('shopify') 
      ? file.name 
      : `shopify_${file.name}`;
    
    const renamedFile = new File([file], fileName, { type: file.type });
    formData.append('file', renamedFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus('✅ Shopify products uploaded successfully!');
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
    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
      <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4">
        📦 Shopify Product Import
      </h3>
      
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Upload your Shopify products CSV export to prioritize product information in search results.</p>
          <p className="mt-2">
            <strong>How to export from Shopify:</strong>
          </p>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Go to Products in your Shopify admin</li>
            <li>Click "Export" and select "All products"</li>
            <li>Choose "CSV for Excel" format</li>
            <li>Upload the downloaded file here</li>
          </ol>
        </div>

        <div className="relative">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-purple-100 file:text-purple-700
              hover:file:bg-purple-200
              dark:file:bg-purple-800 dark:file:text-purple-200
              dark:hover:file:bg-purple-700
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {uploadStatus && (
          <div className={`text-sm mt-2 ${
            uploadStatus.includes('✅') ? 'text-green-600 dark:text-green-400' :
            uploadStatus.includes('❌') ? 'text-red-600 dark:text-red-400' :
            uploadStatus.includes('Warning') ? 'text-yellow-600 dark:text-yellow-400' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            {uploadStatus}
          </div>
        )}

        <div className="bg-purple-100 dark:bg-purple-800/30 rounded p-3 text-xs text-purple-700 dark:text-purple-300">
          <strong>💡 Pro Tip:</strong> Products from your Shopify CSV will automatically be prioritized when users ask about products, 
          prices, or availability. The system will show product results first, followed by any other relevant information.
        </div>
      </div>
    </div>
  );
} 