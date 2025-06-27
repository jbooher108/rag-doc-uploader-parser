import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { ProcessedDocument, DocumentMetadata } from '@/types';

export interface WebpageData {
  ID?: string;
  Handle?: string;
  Command?: string;
  Title?: string;
  Author?: string;
  'Body HTML'?: string;
  'Created At'?: string;
  'Updated At'?: string;
  Published?: string;
  'Published At'?: string;
  'Template Suffix'?: string;
  'Metafield: title_tag [string]'?: string;
  'Metafield: description_tag [string]'?: string;
  'Metafield: custom.hide_on_search [boolean]'?: string;
  'Metafield: bold_mem.Flowerevolution [string]'?: string;
  [key: string]: any; // For any other columns
}

export class WebpageCsvProcessorService {
  async processWebpageCsv(
    csvContent: string,
    filename: string
  ): Promise<ProcessedDocument[]> {
    try {
      // Parse CSV content with more robust options
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        quote: '"',
        escape: '"',
        auto_parse: false, // Keep everything as strings
        relax_column_count: true, // Allow inconsistent column counts
        skip_records_with_error: true, // Skip malformed records
      }) as WebpageData[];

      const processedDocuments: ProcessedDocument[] = [];

      for (const page of records) {
        // Skip unpublished pages
        if (page.Published && page.Published.toLowerCase() !== 'true') {
          continue;
        }

        // Skip pages marked as hidden from search
        if (page['Metafield: custom.hide_on_search [boolean]'] === 'TRUE') {
          continue;
        }

        // Create a natural language description of the webpage
        const content = this.formatWebpageAsNaturalLanguage(page);
        
        // Skip if no meaningful content
        if (!content || content.trim().length < 50) {
          continue;
        }

        // Create document with webpage-specific metadata
        const document: ProcessedDocument = {
          id: `webpage-${page.Handle || page.ID || uuidv4()}`,
          filename: filename,
          content: content,
          metadata: {
            source: 'text',
            originalFormat: 'csv',
            uploadedAt: new Date(),
            // Webpage-specific metadata
            productType: 'webpage',
            productHandle: page.Handle,
            productTitle: page.Title,
            vendor: page.Author,
            type: 'blog_post',
            tags: this.extractTags(page),
            // Add a priority score based on content length and recency
            priorityScore: this.calculatePriorityScore(page),
          },
        };

        processedDocuments.push(document);
      }

      return processedDocuments;
    } catch (error) {
      console.error('Error processing webpage CSV:', error);
      console.error('CSV content preview:', csvContent.substring(0, 500));
      
      // Try a more lenient approach if the strict parsing fails
      try {
        console.log('Attempting fallback CSV parsing...');
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: false, // Don't trim to preserve exact content
          quote: false, // Disable quote parsing
          relax_column_count: true,
          skip_records_with_error: true,
        }) as WebpageData[];
        
        console.log(`Fallback parsing succeeded: ${records.length} records found`);
        
        const processedDocuments: ProcessedDocument[] = [];
        for (const page of records) {
          if (page.Published && page.Published.toLowerCase() !== 'true') continue;
          if (page['Metafield: custom.hide_on_search [boolean]'] === 'TRUE') continue;
          
          const content = this.formatWebpageAsNaturalLanguage(page);
          if (!content || content.trim().length < 50) continue;
          
          const document: ProcessedDocument = {
            id: `webpage-${page.Handle || page.ID || uuidv4()}`,
            filename: filename,
            content: content,
            metadata: {
              source: 'text',
              originalFormat: 'csv',
              uploadedAt: new Date(),
              productType: 'webpage',
              productHandle: page.Handle,
              productTitle: page.Title,
              vendor: page.Author,
              type: 'blog_post',
              tags: this.extractTags(page),
              priorityScore: this.calculatePriorityScore(page),
            },
          };
          processedDocuments.push(document);
        }
        
        return processedDocuments;
      } catch (fallbackError) {
        console.error('Fallback CSV parsing also failed:', fallbackError);
        throw new Error(`Failed to process webpage CSV file. The file may be malformed or contain unescaped special characters. Original error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async processWebpageJson(
    jsonContent: string,
    filename: string
  ): Promise<ProcessedDocument[]> {
    try {
      const data = JSON.parse(jsonContent);
      const pages = Array.isArray(data) ? data : [data];
      
      const processedDocuments: ProcessedDocument[] = [];

      for (const page of pages) {
        // Skip unpublished pages
        if (page.Published && page.Published.toLowerCase() !== 'true') {
          continue;
        }

        // Create a natural language description of the webpage
        const content = this.formatWebpageAsNaturalLanguage(page);
        
        // Skip if no meaningful content
        if (!content || content.trim().length < 50) {
          continue;
        }

        // Create document
        const document: ProcessedDocument = {
          id: `webpage-${page.Handle || page.ID || uuidv4()}`,
          filename: filename,
          content: content,
          metadata: {
            source: 'text',
            originalFormat: 'json',
            uploadedAt: new Date(),
            productType: 'webpage',
            productHandle: page.Handle,
            productTitle: page.Title,
            vendor: page.Author,
            type: 'blog_post',
            tags: this.extractTags(page),
            priorityScore: this.calculatePriorityScore(page),
          },
        };

        processedDocuments.push(document);
      }

      return processedDocuments;
    } catch (error) {
      console.error('Error processing webpage JSON:', error);
      throw new Error('Failed to process webpage JSON file');
    }
  }

  private formatWebpageAsNaturalLanguage(page: WebpageData): string {
    let content = '';

    // Add title
    if (page.Title) {
      content += `Title: ${page.Title}\n\n`;
    }

    // Add author
    if (page.Author) {
      content += `Author: ${page.Author}\n\n`;
    }

    // Add SEO title if different from main title
    const seoTitle = page['Metafield: title_tag [string]'];
    if (seoTitle && seoTitle !== page.Title) {
      content += `SEO Title: ${seoTitle}\n\n`;
    }

    // Add SEO description
    const seoDescription = page['Metafield: description_tag [string]'];
    if (seoDescription) {
      content += `Description: ${seoDescription}\n\n`;
    }

    // Add main content from Body HTML (cleaned)
    if (page['Body HTML']) {
      const cleanedContent = this.cleanHtmlContent(page['Body HTML']);
      if (cleanedContent) {
        content += `Content:\n${cleanedContent}\n\n`;
      }
    }

    // Add publication info
    if (page['Published At']) {
      content += `Published: ${page['Published At']}\n`;
    }

    // Add handle/URL info
    if (page.Handle) {
      content += `URL Handle: ${page.Handle}\n`;
    }

    return content.trim();
  }

  private cleanHtmlContent(html: string): string {
    if (!html) return '';

    try {
      // Truncate extremely long content to prevent processing issues
      const maxLength = 50000; // 50k characters should be plenty for most content
      let content = html.length > maxLength ? html.substring(0, maxLength) + '...' : html;

      // Remove HTML tags but preserve structure
      let cleaned = content
        // Convert common HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        // Convert div and paragraph tags to line breaks
        .replace(/<\/?(div|p|br)[^>]*>/gi, '\n')
        // Convert headers to readable format
        .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, '\n$2\n')
        // Convert list items
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
        // Convert strong/bold tags
        .replace(/<\/?(strong|b)[^>]*>/gi, '')
        // Convert emphasis/italic tags
        .replace(/<\/?(em|i)[^>]*>/gi, '')
        // Remove all other HTML tags
        .replace(/<[^>]*>/g, ' ')
        // Clean up whitespace
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple line breaks
        .replace(/^\s+|\s+$/g, '')
        // Remove excessive whitespace
        .replace(/[ \t]+/g, ' ')
        // Remove weird characters that might cause issues
        .replace(/[^\x20-\x7E\n\r]/g, ' ') // Keep only printable ASCII + newlines
        .trim();

      // Final length check
      if (cleaned.length > maxLength) {
        cleaned = cleaned.substring(0, maxLength) + '...';
      }

      return cleaned;
    } catch (error) {
      console.error('Error cleaning HTML content:', error);
      // Return truncated raw content if cleaning fails
      return html.substring(0, 1000) + '...';
    }
  }

  private extractTags(page: WebpageData): string[] {
    const tags: string[] = [];

    // Extract from title
    if (page.Title) {
      // Look for common tag-like patterns in titles
      const titleWords = page.Title.toLowerCase().split(/\s+/);
      titleWords.forEach(word => {
        if (word.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(word)) {
          tags.push(word);
        }
      });
    }

    // Extract from template suffix
    if (page['Template Suffix']) {
      tags.push(page['Template Suffix'].replace(/-/g, ' '));
    }

    // Add content type tags based on patterns
    const bodyHtml = page['Body HTML']?.toLowerCase() || '';
    if (bodyHtml.includes('flower essence')) tags.push('flower essence');
    if (bodyHtml.includes('meditation')) tags.push('meditation');
    if (bodyHtml.includes('elixir')) tags.push('elixir');
    if (bodyHtml.includes('practice')) tags.push('spiritual practice');
    if (bodyHtml.includes('wallpaper')) tags.push('digital wallpaper');

    return [...new Set(tags)].slice(0, 10); // Dedupe and limit to 10 tags
  }

  private calculatePriorityScore(page: WebpageData): number {
    let score = 50; // Base score

    // Boost for recent content
    if (page['Published At'] || page['Updated At']) {
      const dateStr = page['Updated At'] || page['Published At'];
      try {
        const date = new Date(dateStr!);
        const monthsAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsAgo < 6) score += 30;
        else if (monthsAgo < 12) score += 20;
        else if (monthsAgo < 24) score += 10;
      } catch (e) {
        // Invalid date, skip
      }
    }

    // Boost for content with author
    if (page.Author) score += 10;

    // Boost for content with SEO optimization
    if (page['Metafield: title_tag [string]']) score += 10;
    if (page['Metafield: description_tag [string]']) score += 10;

    // Boost for longer content
    const contentLength = (page['Body HTML'] || '').length;
    if (contentLength > 5000) score += 20;
    else if (contentLength > 2000) score += 10;
    else if (contentLength > 500) score += 5;

    return Math.min(score, 100); // Cap at 100
  }
}

// Singleton instance
let webpageCsvProcessorService: WebpageCsvProcessorService | null = null;

export const getWebpageCsvProcessorService = (): WebpageCsvProcessorService => {
  if (!webpageCsvProcessorService) {
    webpageCsvProcessorService = new WebpageCsvProcessorService();
  }
  return webpageCsvProcessorService;
}; 