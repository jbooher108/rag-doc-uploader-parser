import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '@/lib/config';
import { ProcessedDocument } from '@/types';

export class PineconeService {
  private pinecone: Pinecone;
  private indexName: string;

  constructor() {
    if (!config.pinecone.apiKey) {
      throw new Error('PINECONE_API_KEY is not set in environment variables');
    }
    
    this.pinecone = new Pinecone({
      apiKey: config.pinecone.apiKey,
    });
    this.indexName = config.pinecone.indexName;
    
    if (!this.indexName) {
      throw new Error('PINECONE_INDEX_NAME is not set in environment variables');
    }
  }

  async initialize(): Promise<void> {
    try {
      // Check if index exists
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.indexes?.some(
        (index) => index.name === this.indexName
      );

      if (!indexExists) {
        // Create index with 1024 dimensions
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: config.pinecone.vectorDimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
      }
    } catch (error) {
      console.error('Error initializing Pinecone:', error);
      throw error;
    }
  }

  private async waitForIndexReady(): Promise<void> {
    const maxAttempts = 20;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const indexDescription = await this.pinecone.describeIndex(this.indexName);
        if (indexDescription.status?.ready) {
          return;
        }
      } catch (error) {
        // Index might not be ready yet
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Pinecone index failed to become ready');
  }

  async upsertDocument(
    document: ProcessedDocument,
    embedding: number[]
  ): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);

      await index.upsert([
        {
          id: document.id,
          values: embedding,
          metadata: {
            filename: document.filename,
            content: document.content.substring(0, 1000), // Store first 1000 chars
            source: document.metadata.source,
            originalFormat: document.metadata.originalFormat,
            uploadedAt: document.metadata.uploadedAt.toISOString(),
          },
        },
      ]);
    } catch (error) {
      console.error('Error upserting document to Pinecone:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      await index.deleteOne(documentId);
    } catch (error) {
      console.error('Error deleting document from Pinecone:', error);
      throw error;
    }
  }

  async query(
    embedding: number[],
    topK: number = 5
  ): Promise<any[]> {
    try {
      const index = this.pinecone.index(this.indexName);
      const queryResponse = await index.query({
        vector: embedding,
        topK,
        includeMetadata: true,
      });

      return queryResponse.matches || [];
    } catch (error) {
      console.error('Error querying Pinecone:', error);
      throw error;
    }
  }
}

// Singleton instance
let pineconeService: PineconeService | null = null;

export const getPineconeService = (): PineconeService => {
  if (!pineconeService) {
    pineconeService = new PineconeService();
  }
  return pineconeService;
}; 