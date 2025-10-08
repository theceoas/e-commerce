const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ysubkmcyeqosjybogvyq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdWJrbWN5ZXFvc2p5Ym9ndnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjk5NDYsImV4cCI6MjA3MzkwNTk0Nn0._KUlofWqNHlr3LEMFx6UXHCOhQNh0CKze1eNls9eM1U'
);

async function testCheckoutProcess() {
  try {
    console.log('🧪 Testing checkout process...\n');

    // Step 1: Get a product to order
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, price, sizes')
      .limit(1)
      .single();

    if (productError) {
      console.error('❌ Failed to fetch product:', productError.message);
      return;
    }

    console.log('✅ Product found:', products.name);

    // Step 2: Get shipping zone
    const { data: shippingZone, error: zoneError } = await supabase
      .from('shipping_zones')
      .select('id, name, price')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (zoneError) {
      console.error('❌ Failed to fetch shipping zone:', zoneError.message);
      return;
    }

    console.log('✅ Shipping zone found:', shippingZone.name);

    // Step 3: Generate order number (using the same logic as the app)
    function generateOrderNumber() {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const datePrefix = `${day}${month}`;
      
      // Generate a 3-digit counter (starting from 001)
      const counter = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
      
      return `KI-${datePrefix}-${counter}`;
    }

    const orderNumber = generateOrderNumber();
    console.log('✅ Generated order number:', orderNumber);

    // Step 4: Create test order data
    const orderData = {
      order_number: orderNumber,
      user_id: null, // Guest order
      guest_email: 'test@example.com',
      subtotal: products.price,
      total_amount: products.price + shippingZone.price,
      shipping_address: {
        first_name: 'Test',
        last_name: 'User',
        address_line_1: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        postal_code: '12345',
        country: 'Nigeria',
        phone: '+2341234567890'
      },
      shipping_zone_id: shippingZone.id,
      shipping_cost: shippingZone.price,
      payment_status: 'paid',
      status: 'pending'
    };

    console.log('📝 Order data prepared');

    // Step 5: Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Failed to create order:', orderError.message);
      console.error('Error details:', orderError);
      return;
    }

    console.log('✅ Order created successfully:', order.id);

    // Step 6: Create order items
    const orderItem = {
      order_id: order.id,
      product_id: products.id,
      quantity: 1,
      size: products.sizes[0].size, // Use first available size
      price: products.price, // Original price
      unit_price: products.price, // Effective price
      total_price: products.price * 1 // Total for this item
    };

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .insert([orderItem])
      .select();

    if (itemsError) {
      console.error('❌ Failed to create order items:', itemsError.message);
      console.error('Error details:', itemsError);
      return;
    }

    console.log('✅ Order items created successfully');

    // Step 7: Test webhook trigger
    try {
      console.log('🔗 Testing webhook trigger...');
      
      const webhookResponse = await fetch('http://localhost:3000/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'purchase',
          data: {
            order_id: order.id,
            order_number: order.order_number,
            total_amount: order.total_amount,
            subtotal: order.subtotal,
            shipping_cost: order.shipping_cost,
            customer_email: order.guest_email,
            user_id: order.user_id,
            items: orderItems,
            shipping_address: order.shipping_address,
            created_at: new Date().toISOString()
          }
        })
      });

      if (webhookResponse.ok) {
        const webhookResult = await webhookResponse.json();
        console.log('✅ Webhook triggered successfully:', webhookResult);
      } else {
        console.error('❌ Webhook failed:', await webhookResponse.text());
      }
    } catch (webhookError) {
      console.error('❌ Webhook error:', webhookError.message);
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('Order ID:', order.id);
    console.log('Order Number:', order.order_number);
    console.log('Total Amount:', order.total_amount);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testCheckoutProcess();