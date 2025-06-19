'use client';

import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import MultiFileUploader from '@/components/MultiFileUploader';
import { BatchUploadStats } from '@/types';

export default function Home() {
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('batch');
  const [batchStats, setBatchStats] = useState<BatchUploadStats | null>(null);

  const handleUploadSuccess = (documentId: string) => {
    setUploadedDocuments((prev) => [...prev, documentId]);
    setErrorMessage(null);
  };

  const handleUploadError = (error: string) => {
    setErrorMessage(error);
  };

  const handleBatchComplete = (stats: BatchUploadStats) => {
    setBatchStats(stats);
    setUploadedDocuments((prev) => [
      ...prev,
      ...Array(stats.completed).fill('batch-upload'),
    ]);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            RAG Database Uploader
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Upload text documents, audio clips, or video files to your Pinecone vector database.
            Audio and video files will be automatically transcribed to text.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex justify-center">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-1 inline-flex">
              <button
                onClick={() => setActiveTab('single')}
                className={`
                  px-6 py-2 rounded-md font-medium transition-all
                  ${
                    activeTab === 'single'
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
              >
                Single File
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                className={`
                  px-6 py-2 rounded-md font-medium transition-all
                  ${
                    activeTab === 'batch'
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
              >
                Batch Upload
              </button>
            </div>
          </div>
        </div>

        {/* Upload Components */}
        {activeTab === 'single' ? (
          <FileUploader
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        ) : (
          <MultiFileUploader onBatchComplete={handleBatchComplete} />
        )}

        {/* Error Message */}
        {errorMessage && activeTab === 'single' && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-red-600 dark:text-red-400 mr-2">⚠️</span>
                <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Batch Upload Stats */}
        {batchStats && activeTab === 'batch' && (
          <div className="mt-8 max-w-4xl mx-auto">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
                Batch Upload Complete
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Files</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {batchStats.total}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {batchStats.completed}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {batchStats.failed}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {batchStats.total > 0
                      ? Math.round((batchStats.completed / batchStats.total) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload History */}
        {uploadedDocuments.length > 0 && activeTab === 'single' && (
          <div className="mt-12 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Recent Uploads
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <ul className="space-y-2">
                {uploadedDocuments.slice(-5).map((docId, index) => (
                  <li
                    key={`${docId}-${index}`}
                    className="flex items-center text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="font-mono text-sm">{docId}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {uploadedDocuments.length} document{uploadedDocuments.length !== 1 ? 's' : ''} uploaded to Pinecone
              </p>
            </div>
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="inline-flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <span className="mr-2">🔢</span>
              <span>1024-dimensional vectors</span>
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center">
              <span className="mr-2">🤖</span>
              <span>Powered by OpenAI</span>
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center">
              <span className="mr-2">🌲</span>
              <span>Stored in Pinecone</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 max-w-2xl mx-auto text-left">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Getting Started
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>• <strong>Batch Upload:</strong> Perfect for initial mass upload of all your documents</li>
                <li>• <strong>Single File:</strong> Quick upload for individual files</li>
                <li>• <strong>Concurrent Processing:</strong> Uploads 3 files simultaneously for faster processing</li>
                <li>• <strong>Auto-conversion:</strong> Videos → Audio → Text automatically</li>
                <li>• <strong>Smart Chunking:</strong> Large documents are split into overlapping chunks</li>
                <li>• <strong>Large Video Support:</strong> Videos over 100MB are automatically segmented into 10-minute chunks</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
