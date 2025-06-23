import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { getPineconeService } from './pinecone.service';
import { getOpenAIService } from './openai.service';
import { getMediaProcessingService } from './media-processing.service';
import { getShopifyCsvProcessorService } from './shopify-csv-processor.service';
import { ProcessedDocument, FileType, DocumentMetadata } from '@/types';
import { config } from '@/lib/config';

export class DocumentProcessingService {
  private pineconeService = getPineconeService();
  private openAIService = getOpenAIService();
  private mediaService = getMediaProcessingService();
  private shopifyCsvProcessor = getShopifyCsvProcessorService();

  async processFile(
    buffer: Buffer,
    filename: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<ProcessedDocument> {
    const fileType = this.determineFileType(filename);
    let content: string;
    let filesToCleanup: string[] = [];
    const processingSteps: string[] = [];

    try {
      onProgress?.('processing', 10);

      // Check if it's a Shopify CSV
      if (filename.toLowerCase().includes('shopify') && filename.endsWith('.csv')) {
        onProgress?.('processing_shopify_csv', 20);
        
        // Process as Shopify CSV
        const csvContent = buffer.toString('utf-8');
        const shopifyProducts = await this.shopifyCsvProcessor.processShopifyCsv(csvContent, filename);
        
        onProgress?.('embedding', 50);
        
        // Process each product
        for (let i = 0; i < shopifyProducts.length; i++) {
          const product = shopifyProducts[i];
          const embedding = await this.openAIService.createEmbedding(product.content);
          await this.pineconeService.upsertDocument(product, embedding);
          
          onProgress?.('embedding', 50 + (i / shopifyProducts.length) * 40);
        }
        
        onProgress?.('complete', 100);
        
        // Return a summary document
        return {
          id: `shopify-batch-${uuidv4()}`,
          filename: filename,
          content: `Processed ${shopifyProducts.length} Shopify products from CSV`,
          metadata: {
            source: 'shopify',
            originalFormat: 'csv',
            uploadedAt: new Date(),
            processingSteps: ['shopify_csv_import', `processed_${shopifyProducts.length}_products`],
          },
        };
      }

      // Save the uploaded file temporarily
      const uploadedFilePath = await this.mediaService.saveUploadedFile(
        buffer,
        filename
      );
      filesToCleanup.push(uploadedFilePath);

      // Process based on file type
      switch (fileType) {
        case 'text':
          content = await this.processTextFile(buffer, filename);
          processingSteps.push('text_extraction');
          break;

        case 'audio':
          onProgress?.('processing', 30);
          content = await this.processAudioFile(uploadedFilePath, filename);
          processingSteps.push('audio_transcription');
          break;

        case 'video':
          onProgress?.('processing', 20);
          
          // Check if video needs segmentation (over 100MB)
          const videoSize = await this.mediaService.getFileSize(uploadedFilePath);
          const needsSegmentation = videoSize > config.upload.maxFileSize;
          
          if (needsSegmentation) {
            console.log(`Large video detected (${(videoSize / 1024 / 1024).toFixed(2)}MB), segmenting...`);
            processingSteps.push('video_segmentation');
            
            // Segment the video
            const segments = await this.mediaService.segmentVideo(
              uploadedFilePath,
              10 // 10-minute segments
            );
            filesToCleanup.push(...segments);
            
            // Process each segment
            const segmentContents: string[] = [];
            for (let i = 0; i < segments.length; i++) {
              const segmentPath = segments[i];
              onProgress?.('processing', 20 + (i / segments.length) * 20);
              
              // Extract audio from segment
              const segmentAudioPath = await this.mediaService.extractAudioFromVideo(
                segmentPath
              );
              filesToCleanup.push(segmentAudioPath);
              
              // Transcribe segment audio
              const segmentContent = await this.processAudioFile(
                segmentAudioPath,
                `${filename}_segment_${i + 1}`
              );
              segmentContents.push(`[Segment ${i + 1}/${segments.length}]\n${segmentContent}`);
            }
            
            content = segmentContents.join('\n\n');
            processingSteps.push(`processed_${segments.length}_segments`);
          } else {
            // Normal processing for smaller videos
            const audioPath = await this.mediaService.extractAudioFromVideo(
              uploadedFilePath
            );
            filesToCleanup.push(audioPath);
            processingSteps.push('video_to_audio');
            
            onProgress?.('processing', 40);
            content = await this.processAudioFile(audioPath, filename);
            processingSteps.push('audio_transcription');
          }
          break;

        default:
          throw new Error('Unsupported file type');
      }

      onProgress?.('embedding', 60);

      // Get media duration if applicable
      const duration =
        fileType !== 'text'
          ? await this.mediaService.getMediaDuration(uploadedFilePath)
          : undefined;

      // Create document metadata
      const document: ProcessedDocument = {
        id: uuidv4(),
        filename,
        content,
        metadata: {
          source: fileType,
          originalFormat: filename.split('.').pop() || 'unknown',
          uploadedAt: new Date(),
          processingSteps,
          duration,
        },
      };

      // Split content into chunks if it's too large
      const chunks = await this.openAIService.splitTextIntoChunks(content);
      
      onProgress?.('embedding', 80);

      // Create embeddings for each chunk
      if (chunks.length === 1) {
        // Single chunk - create one embedding
        const embedding = await this.openAIService.createEmbedding(content);
        await this.pineconeService.upsertDocument(document, embedding);
      } else {
        // Multiple chunks - create embeddings in batches to avoid API limits
        const batchSize = 5; // Process 5 chunks at a time
        console.log(`Processing ${chunks.length} chunks in batches of ${batchSize}`);
        
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batchChunks = chunks.slice(i, Math.min(i + batchSize, chunks.length));
          const batchEmbeddings = await this.openAIService.createEmbeddings(batchChunks);
          
          // Store each chunk in the batch
          for (let j = 0; j < batchChunks.length; j++) {
            const chunkIndex = i + j;
            const chunkDocument: ProcessedDocument = {
              ...document,
              id: `${document.id}-chunk-${chunkIndex}`,
              content: batchChunks[j],
              metadata: {
                ...document.metadata,
                processingSteps: [...processingSteps, `chunk_${chunkIndex + 1}_of_${chunks.length}`],
              },
            };
            
            await this.pineconeService.upsertDocument(chunkDocument, batchEmbeddings[j]);
          }
          
          // Log progress
          const processed = Math.min(i + batchSize, chunks.length);
          console.log(`Processed ${processed}/${chunks.length} chunks`);
          onProgress?.('embedding', 60 + (processed / chunks.length) * 30);
        }
      }

      onProgress?.('storing', 95);

      // Cleanup temporary files
      await this.mediaService.cleanupFiles(filesToCleanup);

      onProgress?.('complete', 100);

      return document;
    } catch (error) {
      // Cleanup on error
      await this.mediaService.cleanupFiles(filesToCleanup);
      throw error;
    }
  }

  private determineFileType(filename: string): FileType {
    const extension = filename.split('.').pop()?.toLowerCase();

    if (config.upload.allowedTextFormats.includes(extension || '')) {
      return 'text';
    } else if (this.mediaService.isAudioFile(filename)) {
      return 'audio';
    } else if (this.mediaService.isVideoFile(filename)) {
      return 'video';
    }

    throw new Error(`Unsupported file type: ${extension}`);
  }

  private async processTextFile(
    buffer: Buffer,
    filename: string
  ): Promise<string> {
    const extension = filename.split('.').pop()?.toLowerCase();

    // Handle PDF files
    if (extension === 'pdf') {
      try {
        console.log(`Processing PDF file: ${filename}, buffer size: ${buffer.length} bytes`);
        
        // Use pdf2json which is designed for Node.js
        const PDFParser = (await import('pdf2json')).default;
        const pdfParser = new PDFParser();
        
        console.log('PDF parser loaded successfully');
        
        // Create a promise to handle the async parsing
        const pdfText = await new Promise<string>((resolve, reject) => {
          pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            try {
              // Extract text from all pages
              let extractedText = '';
              const pages = pdfData.Pages || [];
              
              console.log(`PDF parsed successfully: ${pages.length} pages`);
              
              pages.forEach((page: any, pageIndex: number) => {
                extractedText += `\n--- Page ${pageIndex + 1} ---\n`;
                
                // Extract text from all text elements on the page
                if (page.Texts) {
                  // Group texts by their Y position (line)
                  const textsByLine = new Map<number, Array<{x: number, text: string}>>();
                  
                  page.Texts.forEach((text: any) => {
                    if (text.R && text.R.length > 0) {
                      const yPos = Math.round(text.y * 10) / 10; // Round to nearest 0.1 to group similar Y positions
                      
                      if (!textsByLine.has(yPos)) {
                        textsByLine.set(yPos, []);
                      }
                      
                      // Combine all text runs in this text element
                      let combinedText = '';
                      text.R.forEach((r: any) => {
                        if (r.T) {
                          combinedText += decodeURIComponent(r.T);
                        }
                      });
                      
                      if (combinedText) {
                        textsByLine.get(yPos)!.push({
                          x: text.x,
                          text: combinedText
                        });
                      }
                    }
                  });
                  
                  // Sort lines by Y position and process each line
                  const sortedLines = Array.from(textsByLine.entries()).sort((a, b) => a[0] - b[0]);
                  
                  sortedLines.forEach(([_, texts]) => {
                    // Sort texts in line by X position
                    texts.sort((a, b) => a.x - b.x);
                    
                    let lineText = '';
                    let lastX = -1;
                    
                    texts.forEach((textItem, index) => {
                      // Check if we need a space based on position
                      if (lastX !== -1) {
                        const gap = textItem.x - lastX;
                        // Add space if there's a significant gap or if previous text doesn't end with space
                        if (gap > 0.5 || (!lineText.endsWith(' ') && textItem.text.length > 1)) {
                          lineText += ' ';
                        }
                      }
                      
                      lineText += textItem.text;
                      lastX = textItem.x + textItem.text.length * 0.5; // Approximate end position
                    });
                    
                    extractedText += lineText.trim() + '\n';
                  });
                }
                extractedText += '\n';
              });
              
              resolve(extractedText);
            } catch (error) {
              reject(error);
            }
          });
          
          pdfParser.on('pdfParser_dataError', (error: any) => {
            reject(error);
          });
          
          // Parse the PDF buffer
          pdfParser.parseBuffer(buffer);
        });
        
        console.log(`PDF text extracted successfully: ${pdfText.length} characters`);
        
        if (!pdfText || pdfText.trim().length === 0) {
          throw new Error('PDF appears to be empty or contains no extractable text');
        }
        
        return pdfText;
      } catch (error) {
        console.error('Error parsing PDF:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message);
          console.error('Error stack:', error.stack);
        }
        throw new Error(`Failed to extract text from PDF: ${filename}`);
      }
    }

    // Handle other text formats (txt, md, etc.)
    // TODO: Add support for DOC/DOCX files
    return buffer.toString('utf-8');
  }

  private async processAudioFile(
    audioPath: string,
    originalFilename: string
  ): Promise<string> {
    try {
      // Transcribe audio using OpenAI Whisper
      const transcription = await this.openAIService.transcribeAudio(audioPath);
      
      if (!transcription || transcription.trim().length === 0) {
        throw new Error('Audio transcription resulted in empty text');
      }

      return transcription;
    } catch (error) {
      console.error('Error processing audio file:', error);
      throw new Error(`Failed to transcribe audio file: ${originalFilename}`);
    }
  }

  async initializePinecone(): Promise<void> {
    await this.pineconeService.initialize();
  }
}

// Singleton instance
let documentProcessingService: DocumentProcessingService | null = null;

export const getDocumentProcessingService = (): DocumentProcessingService => {
  if (!documentProcessingService) {
    documentProcessingService = new DocumentProcessingService();
  }
  return documentProcessingService;
}; 