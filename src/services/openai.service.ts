import OpenAI from 'openai';
import { config } from '@/lib/config';
import fs from 'fs';
import { Readable } from 'stream';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    if (!config.openai.apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      // Ensure text isn't too long for embedding
      const maxLength = 8000; // Conservative limit for token count
      const truncatedText = text.length > maxLength 
        ? text.substring(0, maxLength) + '...' 
        : text;
      
      if (text.length > maxLength) {
        console.warn(`Text truncated from ${text.length} to ${maxLength} characters for embedding`);
      }

      const response = await this.openai.embeddings.create({
        model: config.openai.embeddingModel,
        input: truncatedText,
        dimensions: config.pinecone.vectorDimension, // 1024 dimensions
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      if (error instanceof Error && error.message.includes('maximum context length')) {
        throw new Error('Text is too long for embedding. Please split into smaller chunks.');
      }
      throw new Error('Failed to create embedding');
    }
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // Ensure each text isn't too long
      const maxLength = 8000;
      const processedTexts = texts.map(text => {
        if (text.length > maxLength) {
          console.warn(`Text truncated from ${text.length} to ${maxLength} characters for embedding`);
          return text.substring(0, maxLength) + '...';
        }
        return text;
      });

      const response = await this.openai.embeddings.create({
        model: config.openai.embeddingModel,
        input: processedTexts,
        dimensions: config.pinecone.vectorDimension,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      console.error('Error creating embeddings:', error);
      if (error instanceof Error && error.message.includes('maximum context length')) {
        throw new Error('One or more texts are too long for embedding. Please use smaller chunks.');
      }
      throw new Error('Failed to create embeddings');
    }
  }

  async transcribeAudio(audioPath: string): Promise<string> {
    try {
      const audioFile = fs.createReadStream(audioPath);
      
      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: config.openai.whisperModel,
        response_format: 'text',
      });

      return response;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  async transcribeAudioBuffer(
    buffer: Buffer,
    filename: string
  ): Promise<string> {
    try {
      // Create a File-like object from buffer
      const file = new File([buffer], filename, {
        type: this.getAudioMimeType(filename),
      });

      const response = await this.openai.audio.transcriptions.create({
        file: file,
        model: config.openai.whisperModel,
        response_format: 'text',
      });

      return response;
    } catch (error) {
      console.error('Error transcribing audio buffer:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  private getAudioMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
    };

    return mimeTypes[extension || ''] || 'audio/mpeg';
  }

  async splitTextIntoChunks(
    text: string,
    chunkSize: number = config.processing.chunkSize,
    overlap: number = config.processing.chunkOverlap
  ): Promise<string[]> {
    const chunks: string[] = [];
    
    // For embeddings, we need to respect token limits
    // text-embedding-3-large has a max of 8191 tokens
    // Using conservative estimate: 1 token ≈ 3 characters for safety
    const maxChunkSize = 8000; // About 2,666 tokens, well within 8191 limit
    const effectiveChunkSize = Math.min(chunkSize, maxChunkSize);
    
    // If the text is short enough, return as single chunk
    if (text.length <= effectiveChunkSize) {
      return [text];
    }

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    let currentLength = 0;

    for (const sentence of sentences) {
      // If adding this sentence would exceed the limit, save current chunk
      if (currentLength + sentence.length > effectiveChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        
        // Add overlap from the end of the previous chunk
        const words = currentChunk.split(' ');
        const overlapWords = Math.floor(overlap / 10); // Approximate words for overlap
        currentChunk = words.slice(-overlapWords).join(' ') + ' ';
        currentLength = currentChunk.length;
      }

      currentChunk += sentence + ' ';
      currentLength += sentence.length + 1;
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    console.log(`Split text into ${chunks.length} chunks, max size: ${effectiveChunkSize} chars`);
    return chunks;
  }
}

// Singleton instance
let openAIService: OpenAIService | null = null;

export const getOpenAIService = (): OpenAIService => {
  if (!openAIService) {
    openAIService = new OpenAIService();
  }
  return openAIService;
}; 