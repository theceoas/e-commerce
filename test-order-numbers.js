// Test script to verify order number generation
const { generateUniqueOrderNumber } = require('./src/lib/order-utils.ts');

async function testOrderNumberGeneration() {
  console.log('Testing new KI-DDMM-XXX order number format...');
  
  try {
    // Generate 5 order numbers to test uniqueness and format
    const orderNumbers = [];
    
    for (let i = 0; i < 5; i++) {
      const orderNumber = await generateUniqueOrderNumber();
      console.log(`Generated order number ${i + 1}: ${orderNumber}`);
      orderNumbers.push(orderNumber);
      
      // Verify format matches KI-DDMM-XXX
      const formatMatch = orderNumber.match(/^KI-\d{4}-\d{3}$/);
      if (!formatMatch) {
        console.log(`❌ Order number ${orderNumber} doesn't match expected format KI-DDMM-XXX`);
      }
      
      // Small delay between generations
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Check for duplicates
    const uniqueNumbers = new Set(orderNumbers);
    if (uniqueNumbers.size === orderNumbers.length) {
      console.log('✅ All order numbers are unique!');
    } else {
      console.log('❌ Found duplicate order numbers!');
      console.log('Generated:', orderNumbers);
      console.log('Unique:', Array.from(uniqueNumbers));
    }
    
    // Check if they're incrementing properly
    const counters = orderNumbers.map(num => parseInt(num.split('-')[2], 10));
    const isIncrementing = counters.every((counter, index) => 
      index === 0 || counter === counters[index - 1] + 1
    );
    
    if (isIncrementing) {
      console.log('✅ Order numbers are incrementing correctly!');
    } else {
      console.log('❌ Order numbers are not incrementing properly');
      console.log('Counters:', counters);
    }
    
  } catch (error) {
    console.error('❌ Error testing order number generation:', error);
  }
}

// Run the test
testOrderNumberGeneration();