
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkView() {
    const { data, error } = await supabase
        .from('products_with_discounts')
        .select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Error checking view:', error);
    } else {
        console.log('View exists and is accessible. Count:', data);
    }
}

checkView();
