const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProduct() {
    // Check from products table directly
    console.log('\n=== Checking from products table ===');
    const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, in_stock, sizes')
        .ilike('name', '%obi%')
        .limit(1)
        .single();

    if (productError) {
        console.error('Error fetching from products:', productError);
    } else {
        console.log('Product data:', JSON.stringify(productData, null, 2));
    }

    // Check from products_with_discounts view
    console.log('\n=== Checking from products_with_discounts view ===');
    const { data: viewData, error: viewError } = await supabase
        .from('products_with_discounts')
        .select('id, name, in_stock, sizes')
        .ilike('name', '%obi%')
        .limit(1)
        .single();

    if (viewError) {
        console.error('Error fetching from view:', viewError);
    } else {
        console.log('View data:', JSON.stringify(viewData, null, 2));
    }
}

checkProduct();
