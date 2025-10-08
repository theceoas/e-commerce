const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ysubkmcyeqosjybogvyq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdWJrbWN5ZXFvc2p5Ym9ndnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjk5NDYsImV4cCI6MjA3MzkwNTk0Nn0._KUlofWqNHlr3LEMFx6UXHCOhQNh0CKze1eNls9eM1U'
);

// Generate a unique session ID for guest users
function generateSessionId() {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

async function testCompleteUserJourney() {
  try {
    console.log('🚀 Testing complete user journey...\n');

    // Step 1: Get available products
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, price, sizes, in_stock')
      .eq('in_stock', true)
      .limit(2);

    if (productError) {
      console.error('❌ Failed to fetch products:', productError.message);
      return;
    }

    if (!products || products.length === 0) {
      console.error('❌ No products available');
      return;
    }

    console.log('✅ Found products:', products.length);
    products.forEach(p => {
      console.log(`  - ${p.name}: ₦${p.price} (sizes: ${JSON.stringify(p.sizes)})`);
    });

    // Step 2: Simulate guest user adding items to cart
    const sessionId = generateSessionId();
    console.log(`\n🛒 Simulating guest cart with session: ${sessionId}`);

    const cartItems = [];
    for (const product of products) {
      const size = product.sizes && product.sizes.length > 0 ? product.sizes[0].size : null;
      
      const cartItem = {
        product_id: product.id,
        quantity: 1,
        size: size,
        session_id: sessionId,
        user_id: null
      };

      const { data: addedItem, error: cartError } = await supabase
        .from('cart_items')
        .insert(cartItem)
        .select()
        .single();

      if (cartError) {
        console.error(`❌ Failed to add ${product.name} to cart:`, cartError.message);
        continue;
      }

      cartItems.push(addedItem);
      console.log(`✅ Added ${product.name} to cart`);
    }

    if (cartItems.length === 0) {
      console.error('❌ No items in cart');
      return;
    }

    // Step 3: Verify cart contents
    const { data: cartContents, error: cartFetchError } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(
          id,
          name,
          price,
          thumbnail_url
        )
      `)
      .eq('session_id', sessionId);

    if (cartFetchError) {
      console.error('❌ Failed to fetch cart contents:', cartFetchError.message);
      return;
    }

    console.log(`\n📋 Cart contents: ${cartContents.length} items`);
    let cartTotal = 0;
    cartContents.forEach(item => {
      const itemTotal = item.product.price * item.quantity;
      cartTotal += itemTotal;
      console.log(`  - ${item.product.name} (${item.size || 'no size'}) x${item.quantity}: ₦${itemTotal}`);
    });
    console.log(`  Total: ₦${cartTotal}`);

    // Step 4: Get shipping zones
    const { data: shippingZones, error: zoneError } = await supabase
      .from('shipping_zones')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (zoneError) {
      console.error('❌ Failed to fetch shipping zones:', zoneError.message);
      return;
    }

    if (!shippingZones || shippingZones.length === 0) {
      console.error('❌ No shipping zones available');
      return;
    }

    const selectedZone = shippingZones[0];
    console.log(`\n🚚 Selected shipping zone: ${selectedZone.name} (₦${selectedZone.price})`);

    // Step 5: Simulate checkout form validation
    const checkoutForm = {
      email: 'journey-test@example.com',
      firstName: 'Journey',
      lastName: 'Test',
      address1: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      postalCode: '12345',
      phone: '+2341234567890',
      shippingZoneId: selectedZone.id
    };

    const required = ['email', 'firstName', 'lastName', 'address1', 'city', 'state', 'postalCode', 'phone', 'shippingZoneId'];
    let validationPassed = true;
    const missingFields = [];

    for (const field of required) {
      if (!checkoutForm[field]) {
        validationPassed = false;
        missingFields.push(field);
      }
    }

    if (!validationPassed) {
      console.error(`❌ Form validation failed. Missing fields: ${missingFields.join(', ')}`);
      return;
    }

    console.log('✅ Form validation passed');

    // Step 6: Generate order number
    function generateOrderNumber() {
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const dateStr = `${day}${month}`;
      const counter = Math.floor(Math.random() * 999) + 1;
      return `KI-${dateStr}-${counter.toString().padStart(3, '0')}`;
    }

    const orderNumber = generateOrderNumber();
    console.log(`\n📝 Generated order number: ${orderNumber}`);

    // Step 7: Create order
    const totalWithShipping = cartTotal + selectedZone.price;
    const orderData = {
      order_number: orderNumber,
      user_id: null,
      guest_email: checkoutForm.email,
      subtotal: cartTotal,
      total_amount: totalWithShipping,
      shipping_address: {
        first_name: checkoutForm.firstName,
        last_name: checkoutForm.lastName,
        address_line_1: checkoutForm.address1,
        city: checkoutForm.city,
        state: checkoutForm.state,
        postal_code: checkoutForm.postalCode,
        country: 'Nigeria',
        phone: checkoutForm.phone
      },
      shipping_zone_id: checkoutForm.shippingZoneId,
      shipping_cost: selectedZone.price,
      payment_status: 'paid',
      status: 'pending'
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Failed to create order:', orderError.message);
      console.error('Order data:', JSON.stringify(orderData, null, 2));
      return;
    }

    console.log(`✅ Order created successfully: ${order.id}`);

    // Step 8: Create order items
    const orderItems = cartContents.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      size: item.size,
      price: item.product.price,
      unit_price: item.product.price,
      total_price: item.product.price * item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('❌ Failed to create order items:', itemsError.message);
      return;
    }

    console.log('✅ Order items created successfully');

    // Step 9: Clear cart
    const { error: clearCartError } = await supabase
      .from('cart_items')
      .delete()
      .eq('session_id', sessionId);

    if (clearCartError) {
      console.error('❌ Failed to clear cart:', clearCartError.message);
    } else {
      console.log('✅ Cart cleared successfully');
    }

    // Step 10: Test webhook
    try {
      console.log('\n🔗 Testing webhook...');
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
            total_amount: totalWithShipping,
            customer_email: checkoutForm.email,
            test: true
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

    console.log('\n🎉 Complete user journey test PASSED!');
    console.log(`📊 Summary:`);
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Cart items: ${cartContents.length}`);
    console.log(`   - Order ID: ${order.id}`);
    console.log(`   - Order number: ${order.order_number}`);
    console.log(`   - Total amount: ₦${totalWithShipping}`);

  } catch (error) {
    console.error('❌ Journey test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testCompleteUserJourney();