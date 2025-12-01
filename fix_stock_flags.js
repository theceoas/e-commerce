const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProductStockFlags() {
    console.log('Starting to fix product stock flags...\n');

    // Get all products
    const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id, name, in_stock, sizes');

    if (fetchError) {
        console.error('Error fetching products:', fetchError);
        return;
    }

    console.log(`Found ${products.length} products\n`);

    let fixedCount = 0;
    const fixes = [];

    for (const product of products) {
        const hasStockInSizes = product.sizes && Array.isArray(product.sizes) &&
            product.sizes.some(size => (size.stock || 0) > 0);

        const shouldBeInStock = hasStockInSizes;

        if (product.in_stock !== shouldBeInStock) {
            fixes.push({
                id: product.id,
                name: product.name,
                currentInStock: product.in_stock,
                shouldBeInStock: shouldBeInStock,
                sizes: product.sizes
            });
        }
    }

    console.log(`Found ${fixes.length} products needing correction:\n`);

    for (const fix of fixes) {
        console.log(`- ${fix.name}:`);
        console.log(`  Current in_stock: ${fix.currentInStock}`);
        console.log(`  Should be: ${fix.shouldBeInStock}`);
        console.log(`  Sizes: ${JSON.stringify(fix.sizes)}\n`);

        const { error: updateError } = await supabase
            .from('products')
            .update({ in_stock: fix.shouldBeInStock })
            .eq('id', fix.id);

        if (updateError) {
            console.error(`Error updating ${fix.name}:`, updateError);
        } else {
            fixedCount++;
        }
    }

    console.log(`\n✅ Fixed ${fixedCount} products`);
}

fixProductStockFlags();
