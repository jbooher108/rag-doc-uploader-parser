import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { ProcessedDocument, DocumentMetadata } from '@/types';

export interface ShopifyProduct {
  Handle: string;
  Title: string;
  'Body HTML'?: string;
  Type?: string;
  Tags?: string;
  Status?: string;
  Published?: string;
  URL?: string;
  'Custom Collections'?: string;
  'Smart Collections'?: string;
  'Image Src'?: string;
  'Image Alt Text'?: string;
  'Option1 Name'?: string;
  'Variant Image'?: string;
  'Variant Price'?: string;
  'Metafield: title_tag [string]'?: string;
  'Metafield: description_tag [string]'?: string;
  'Metafield: custom.how_to_use [multi_line_text_field]'?: string;
  'Metafield: custom.ingredients [multi_line_text_field]'?: string;
  'Metafield: custom.essences_inside_pictures [list.file_reference]'?: string;
  'Metafield: custom.essences_inside_names [list.single_line_text_field]'?: string;
  'Metafield: custom.essences_inside_descriptors [list.single_line_text_field]'?: string;
  'Metafield: custom.summary_blurb [multi_line_text_field]'?: string;
  'Metafield: custom.smells_like [multi_line_text_field]'?: string;
  'Metafield: judgeme.widget [string]'?: string;
}

export class ShopifyCsvProcessorService {
  async processShopifyCsv(
    csvContent: string,
    filename: string
  ): Promise<ProcessedDocument[]> {
    try {
      console.log('Processing Shopify CSV...');
      console.log('CSV content preview:', csvContent.substring(0, 500));
      
      // Parse CSV content with more lenient options
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Allow inconsistent column counts
        relax_quotes: true, // Be more lenient with quotes
        skip_records_with_error: true, // Skip problematic records
      }) as ShopifyProduct[];

      console.log(`Parsed ${records.length} records from CSV`);
      if (records.length > 0) {
        console.log('First record sample:', JSON.stringify(records[0], null, 2));
      }

      const processedDocuments: ProcessedDocument[] = [];

      // Build a map of first non-empty price per product handle
      const handleToPrice: Record<string, number | undefined> = {};
      for (const product of records) {
        if (!handleToPrice[product.Handle] && product['Variant Price']) {
          const parsed = parseFloat(product['Variant Price'].replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed)) {
            handleToPrice[product.Handle] = parsed;
          }
        }
      }

      for (const product of records) {
        // Skip draft or archived products
        if (product.Status && product.Status.toLowerCase() !== 'active') {
          console.log(`Skipping inactive product: ${product.Title}`);
          continue;
        }

        // Skip products without a title
        if (!product.Title || product.Title.trim() === '') {
          console.log(`Skipping product without title: ${product.Handle}`);
          continue;
        }

        // Use the first non-empty price for this handle
        const price = handleToPrice[product.Handle];

        // Create a natural language description of the product
        const content = this.formatProductAsNaturalLanguage(product);
        
        // Create document with special metadata for Shopify products
        const document: ProcessedDocument = {
          id: `shopify-${product.Handle || uuidv4()}`,
          filename: filename,
          content: content,
          metadata: {
            source: 'shopify',
            originalFormat: 'csv',
            uploadedAt: new Date(),
            // Special Shopify metadata
            productType: 'shopify_product',
            productHandle: product.Handle,
            productTitle: product.Title,
            vendor: 'Lotus Wei', // Default vendor since it's not in CSV
            type: product.Type,
            tags: product.Tags?.split(',').map(t => t.trim()).filter(t => t.length > 0),
            price: price,
            sku: product.Handle, // Use handle as SKU since no SKU field
            inStock: true, // Assume in stock since no inventory field
            url: product.URL,
            // Add a priority score for Shopify products
            priorityScore: 100, // High priority for product data
          },
        };

        console.log(`Processed product: ${product.Title}, Price: ${product['Variant Price']}, Assigned: ${price}`);
        processedDocuments.push(document);
      }

      console.log(`Successfully processed ${processedDocuments.length} Shopify products`);
      return processedDocuments;
    } catch (error) {
      console.error('Error processing Shopify CSV:', error);
      throw new Error(`Failed to process Shopify CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private formatProductAsNaturalLanguage(product: ShopifyProduct): string {
    const parts: string[] = [];

    // Title and basic info
    parts.push(`Product: ${product.Title}`);
    
    if (product.Type) {
      parts.push(`Category: ${product.Type}`);
    }

    // Description from Body HTML
    if (product['Body HTML']) {
      // Strip HTML tags for cleaner text
      const description = product['Body HTML']
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      parts.push(`Description: ${description}`);
    }

    // Price information
    if (product['Variant Price']) {
      parts.push(`Price: $${product['Variant Price']}`);
    }

    // Tags
    if (product.Tags) {
      parts.push(`Tags: ${product.Tags}`);
    }

    // Custom metafields for additional product information
    if (product['Metafield: custom.how_to_use [multi_line_text_field]']) {
      parts.push(`How to Use: ${product['Metafield: custom.how_to_use [multi_line_text_field]']}`);
    }

    if (product['Metafield: custom.ingredients [multi_line_text_field]']) {
      parts.push(`Ingredients: ${product['Metafield: custom.ingredients [multi_line_text_field]']}`);
    }

    if (product['Metafield: custom.summary_blurb [multi_line_text_field]']) {
      parts.push(`Summary: ${product['Metafield: custom.summary_blurb [multi_line_text_field]']}`);
    }

    if (product['Metafield: custom.smells_like [multi_line_text_field]']) {
      parts.push(`Smells Like: ${product['Metafield: custom.smells_like [multi_line_text_field]']}`);
    }

    // Essences information
    if (product['Metafield: custom.essences_inside_names [list.single_line_text_field]']) {
      parts.push(`Essences: ${product['Metafield: custom.essences_inside_names [list.single_line_text_field]']}`);
    }

    if (product['Metafield: custom.essences_inside_descriptors [list.single_line_text_field]']) {
      parts.push(`Essence Descriptions: ${product['Metafield: custom.essences_inside_descriptors [list.single_line_text_field]']}`);
    }

    // SEO information
    if (product['Metafield: title_tag [string]']) {
      parts.push(`SEO Title: ${product['Metafield: title_tag [string]']}`);
    }

    if (product['Metafield: description_tag [string]']) {
      parts.push(`SEO Description: ${product['Metafield: description_tag [string]']}`);
    }

    // URL
    if (product.URL) {
      parts.push(`Product URL: ${product.URL}`);
    }

    // Collections
    if (product['Custom Collections']) {
      parts.push(`Custom Collections: ${product['Custom Collections']}`);
    }

    if (product['Smart Collections']) {
      parts.push(`Smart Collections: ${product['Smart Collections']}`);
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