import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function clearPinecone() {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX_NAME || 'documents';
  const index = pc.index(indexName);

  try {
    console.log(`Clearing all vectors from index: ${indexName}`);
    
    // Delete all vectors
    await index.deleteAll();
    
    console.log('✅ All vectors deleted successfully');
  } catch (error) {
    console.error('Error clearing Pinecone:', error);
  }
}

clearPinecone(); 