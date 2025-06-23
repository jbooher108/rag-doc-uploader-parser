import { NextRequest, NextResponse } from 'next/server';
import { getPineconeService } from '@/services/pinecone.service';
import { getOpenAIService } from '@/services/openai.service';

export async function POST(request: NextRequest) {
  try {
    const { query, prioritizeProducts = true, topK = 10 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Get services
    const pineconeService = getPineconeService();
    const openAIService = getOpenAIService();

    // Create embedding for the query
    const queryEmbedding = await openAIService.createEmbedding(query);

    // Query with product prioritization
    const results = await pineconeService.queryWithProductPriority(
      queryEmbedding,
      topK,
      prioritizeProducts
    );

    // Format results for response
    const formattedResults = results.map((match) => {
      const isProduct = match.metadata?.source === 'shopify';
      
      return {
        id: match.id,
        score: match.score,
        isProduct,
        content: match.metadata?.content || '',
        // Include product-specific fields if it's a product
        ...(isProduct && {
          product: {
            title: match.metadata?.productTitle,
            vendor: match.metadata?.vendor,
            price: match.metadata?.price,
            sku: match.metadata?.sku,
            inStock: match.metadata?.inStock,
            type: match.metadata?.type,
            tags: match.metadata?.tags,
          }
        }),
        // Raw metadata for debugging
        metadata: match.metadata,
      };
    });

    // Create a natural language response
    const productResults = formattedResults.filter(r => r.isProduct);
    const otherResults = formattedResults.filter(r => !r.isProduct);

    let naturalLanguageResponse = '';

    if (productResults.length > 0) {
      naturalLanguageResponse += 'Based on your query, here are the most relevant products:\n\n';
      
      productResults.forEach((result, index) => {
        const product = result.product!;
        naturalLanguageResponse += `${index + 1}. **${product.title}**\n`;
        if (product.vendor) naturalLanguageResponse += `   Brand: ${product.vendor}\n`;
        if (product.price) naturalLanguageResponse += `   Price: $${product.price}\n`;
        if (product.inStock !== undefined) {
          naturalLanguageResponse += `   Availability: ${product.inStock ? 'In Stock' : 'Out of Stock'}\n`;
        }
        naturalLanguageResponse += `   ${result.content.substring(0, 200)}...\n\n`;
      });
    }

    if (otherResults.length > 0) {
      naturalLanguageResponse += '\nAdditional relevant information:\n\n';
      otherResults.forEach((result, index) => {
        naturalLanguageResponse += `${index + 1}. ${result.content.substring(0, 300)}...\n\n`;
      });
    }

    return NextResponse.json({
      success: true,
      query,
      totalResults: formattedResults.length,
      productResults: productResults.length,
      generalResults: otherResults.length,
      naturalLanguageResponse,
      results: formattedResults,
    });
  } catch (error) {
    console.error('Error processing query:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 