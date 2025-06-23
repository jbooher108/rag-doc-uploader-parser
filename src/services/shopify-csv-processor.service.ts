import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { ProcessedDocument, DocumentMetadata } from '@/types';

export interface ShopifyProduct {
  handle: string;
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  variant_sku?: string;
  variant_price?: string;
  variant_compare_at_price?: string;
  variant_inventory_qty?: string;
  image_src?: string;
  seo_title?: string;
  seo_description?: string;
  status?: string;
}

export class ShopifyCsvProcessorService {
  async processShopifyCsv(
    csvContent: string,
    filename: string
  ): Promise<ProcessedDocument[]> {
    try {
      // Parse CSV content
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as ShopifyProduct[];

      const processedDocuments: ProcessedDocument[] = [];

      for (const product of records) {
        // Skip draft or archived products
        if (product.status && product.status.toLowerCase() !== 'active') {
          continue;
        }

        // Create a natural language description of the product
        const content = this.formatProductAsNaturalLanguage(product);
        
        // Create document with special metadata for Shopify products
        const document: ProcessedDocument = {
          id: `shopify-${product.handle || uuidv4()}`,
          filename: filename,
          content: content,
          metadata: {
            source: 'shopify',
            originalFormat: 'csv',
            uploadedAt: new Date(),
            // Special Shopify metadata
            productType: 'shopify_product',
            productHandle: product.handle,
            productTitle: product.title,
            vendor: product.vendor,
            type: product.product_type,
            tags: product.tags?.split(',').map(t => t.trim()),
            price: product.variant_price,
            sku: product.variant_sku,
            inStock: parseInt(product.variant_inventory_qty || '0') > 0,
            // Add a priority score for Shopify products
            priorityScore: 100, // High priority for product data
          },
        };

        processedDocuments.push(document);
      }

      return processedDocuments;
    } catch (error) {
      console.error('Error processing Shopify CSV:', error);
      throw new Error('Failed to process Shopify CSV file');
    }
  }

  private formatProductAsNaturalLanguage(product: ShopifyProduct): string {
    const parts: string[] = [];

    // Title and basic info
    parts.push(`Product: ${product.title}`);
    
    if (product.vendor) {
      parts.push(`Brand/Vendor: ${product.vendor}`);
    }

    if (product.product_type) {
      parts.push(`Category: ${product.product_type}`);
    }

    // Description
    if (product.body_html) {
      // Strip HTML tags for cleaner text
      const description = product.body_html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      parts.push(`Description: ${description}`);
    }

    // Price information
    if (product.variant_price) {
      parts.push(`Price: $${product.variant_price}`);
      
      if (product.variant_compare_at_price && 
          parseFloat(product.variant_compare_at_price) > parseFloat(product.variant_price)) {
        const discount = Math.round(
          ((parseFloat(product.variant_compare_at_price) - parseFloat(product.variant_price)) / 
           parseFloat(product.variant_compare_at_price)) * 100
        );
        parts.push(`Original Price: $${product.variant_compare_at_price} (${discount}% off)`);
      }
    }

    // SKU and inventory
    if (product.variant_sku) {
      parts.push(`SKU: ${product.variant_sku}`);
    }

    const inventoryQty = parseInt(product.variant_inventory_qty || '0');
    if (inventoryQty > 0) {
      parts.push(`In Stock: ${inventoryQty} units available`);
    } else {
      parts.push('Currently out of stock');
    }

    // Tags
    if (product.tags) {
      parts.push(`Tags: ${product.tags}`);
    }

    // SEO information
    if (product.seo_title || product.seo_description) {
      parts.push('Additional Information:');
      if (product.seo_title) parts.push(product.seo_title);
      if (product.seo_description) parts.push(product.seo_description);
    }

    return parts.join('\n');
  }
}

// Singleton instance
let shopifyCsvProcessorService: ShopifyCsvProcessorService | null = null;

export const getShopifyCsvProcessorService = (): ShopifyCsvProcessorService => {
  if (!shopifyCsvProcessorService) {
    shopifyCsvProcessorService = new ShopifyCsvProcessorService();
  }
  return shopifyCsvProcessorService;
}; 