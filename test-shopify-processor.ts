import { getShopifyCsvProcessorService } from './src/services/shopify-csv-processor.service';
import fs from 'fs';

async function testShopifyProcessor() {
  try {
    console.log('Testing Shopify CSV processor...');
    
    // Read the test CSV file
    const csvContent = fs.readFileSync('test-shopify.csv', 'utf-8');
    console.log('CSV content length:', csvContent.length);
    console.log('CSV preview:', csvContent.substring(0, 200));
    
    // Process the CSV
    const processor = getShopifyCsvProcessorService();
    const products = await processor.processShopifyCsv(csvContent, 'test-shopify.csv');
    
    console.log(`\n✅ Successfully processed ${products.length} products`);
    
    // Show details of each product
    products.forEach((product, index) => {
      console.log(`\n--- Product ${index + 1} ---`);
      console.log('ID:', product.id);
      console.log('Title:', product.metadata.productTitle);
      console.log('Price:', product.metadata.price);
      console.log('Type:', product.metadata.type);
      console.log('Tags:', product.metadata.tags);
      console.log('Content preview:', product.content.substring(0, 100) + '...');
    });
    
    // Test if "Wood Dragon Finale" is found
    const woodDragonProduct = products.find(p => 
      p.metadata.productTitle?.includes('Wood Dragon Finale')
    );
    
    if (woodDragonProduct) {
      console.log('\n✅ Found Wood Dragon Finale product!');
      console.log('Title:', woodDragonProduct.metadata.productTitle);
      console.log('Price:', woodDragonProduct.metadata.price);
    } else {
      console.log('\n❌ Wood Dragon Finale product not found');
    }
    
  } catch (error) {
    console.error('❌ Error testing Shopify processor:', error);
  }
}

testShopifyProcessor(); 