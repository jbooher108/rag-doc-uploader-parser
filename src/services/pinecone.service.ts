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
            // Include all Shopify-specific metadata
            ...(document.metadata.productType && { productType: document.metadata.productType }),
            ...(document.metadata.productHandle && { productHandle: document.metadata.productHandle }),
            ...(document.metadata.productTitle && { productTitle: document.metadata.productTitle }),
            ...(document.metadata.vendor && { vendor: document.metadata.vendor }),
            ...(document.metadata.type && { type: document.metadata.type }),
            ...(document.metadata.tags && { tags: document.metadata.tags }),
            ...(document.metadata.price && { price: document.metadata.price }),
            ...(document.metadata.sku && { sku: document.metadata.sku }),
            ...(document.metadata.inStock !== undefined && { inStock: document.metadata.inStock }),
            ...(document.metadata.priorityScore !== undefined && { priorityScore: document.metadata.priorityScore }),
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

  // New method for product-aware queries with prioritization
  async queryWithProductPriority(
    embedding: number[],
    topK: number = 10,
    prioritizeProducts: boolean = true
  ): Promise<any[]> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      if (prioritizeProducts) {
        // First, try to get Shopify products
        const productQuery = await index.query({
          vector: embedding,
          topK: Math.ceil(topK * 0.6), // Get 60% from products
          includeMetadata: true,
          filter: {
            source: { $eq: 'shopify' }
          }
        });

        // Then get other relevant content
        const generalQuery = await index.query({
          vector: embedding,
          topK: Math.ceil(topK * 0.4), // Get 40% from general content
          includeMetadata: true,
          filter: {
            source: { $ne: 'shopify' }
          }
        });

        // Combine results with products first
        const allResults = [...(productQuery.matches || []), ...(generalQuery.matches || [])];
        
        // Sort by combined score (similarity + priority)
        return allResults.sort((a, b) => {
          const scoreA = (a.score || 0) + ((a.metadata?.priorityScore as number || 0) / 1000);
          const scoreB = (b.score || 0) + ((b.metadata?.priorityScore as number || 0) / 1000);
          return scoreB - scoreA;
        }).slice(0, topK);
      } else {
        // Standard query without product prioritization
        return this.query(embedding, topK);
      }
    } catch (error) {
      console.error('Error querying Pinecone with product priority:', error);
      throw error;
    }
  }

  // Query specifically for products
  async queryProducts(
    embedding: number[],
    topK: number = 5,
    filters?: {
      vendor?: string;
      type?: string;
      inStock?: boolean;
      minPrice?: number;
      maxPrice?: number;
    }
  ): Promise<any[]> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Build filter object
      const filter: any = {
        source: { $eq: 'shopify' }
      };

      if (filters) {
        if (filters.vendor) {
          filter.vendor = { $eq: filters.vendor };
        }
        if (filters.type) {
          filter.type = { $eq: filters.type };
        }
        if (filters.inStock !== undefined) {
          filter.inStock = { $eq: filters.inStock };
        }
        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
          filter.price = {};
          if (filters.minPrice !== undefined) {
            filter.price.$gte = filters.minPrice.toString();
          }
          if (filters.maxPrice !== undefined) {
            filter.price.$lte = filters.maxPrice.toString();
          }
        }
      }

      const queryResponse = await index.query({
        vector: embedding,
        topK,
        includeMetadata: true,
        filter
      });

      return queryResponse.matches || [];
    } catch (error) {
      console.error('Error querying products from Pinecone:', error);
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