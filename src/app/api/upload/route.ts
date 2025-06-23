import { NextRequest, NextResponse } from 'next/server';
import { getDocumentProcessingService } from '@/services/document-processing.service';
import { FileUploadResponse } from '@/types';
import { config } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60; // Maximum allowed for Vercel Hobby plan

export async function POST(request: NextRequest) {
  // Debug environment variables
  console.log('Environment variables check:');
  console.log('PINECONE_API_KEY exists:', !!process.env.PINECONE_API_KEY);
  console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  console.log('Config values:');
  console.log('Pinecone API Key length:', config.pinecone.apiKey.length);
  console.log('OpenAI API Key length:', config.openai.apiKey.length);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json<FileUploadResponse>(
        {
          success: false,
          message: 'No file provided',
        },
        { status: 400 }
      );
    }

    // Validate file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = [
      ...config.upload.allowedTextFormats,
      ...config.upload.allowedAudioFormats,
      ...config.upload.allowedVideoFormats,
    ];

    if (!extension || !allowedExtensions.includes(extension)) {
      return NextResponse.json<FileUploadResponse>(
        {
          success: false,
          message: `File type '${extension}' is not supported. Allowed types: ${allowedExtensions.join(
            ', '
          )}`,
        },
        { status: 400 }
      );
    }

    // Determine file type and size limit
    let maxSize = config.upload.maxFileSize;
    let fileType = 'text';
    
    if (config.upload.allowedVideoFormats.includes(extension)) {
      maxSize = config.upload.maxVideoFileSize;
      fileType = 'video';
    } else if (config.upload.allowedAudioFormats.includes(extension)) {
      maxSize = config.upload.maxAudioFileSize;
      fileType = 'audio';
    }

    // Validate file size based on type
    if (file.size > maxSize) {
      return NextResponse.json<FileUploadResponse>(
        {
          success: false,
          message: `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} file size exceeds maximum allowed size of ${
            maxSize / 1024 / 1024
          }MB`,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process the file
    const documentProcessingService = getDocumentProcessingService();
    
    // Initialize Pinecone if needed
    await documentProcessingService.initializePinecone();
    
    const document = await documentProcessingService.processFile(
      buffer,
      file.name
    );

    return NextResponse.json<FileUploadResponse>({
      success: true,
      message: 'File uploaded and processed successfully',
      documentId: document.id,
    });
  } catch (error) {
    console.error('Error processing file upload:', error);
    
    return NextResponse.json<FileUploadResponse>(
      {
        success: false,
        message: 'Failed to process file',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 