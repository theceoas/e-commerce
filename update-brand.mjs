// Script to update "Others" brand to "Favorite Things"
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateBrandName() {
    try {
        console.log('Updating "Others" brand to "Favorite Things"...');

        const { data, error } = await supabase
            .from('brands')
            .update({ name: 'Favorite Things' })
            .ilike('name', 'others')
            .select();

        if (error) {
            console.error('Error updating brand:', error);
            process.exit(1);
        }

        console.log('Successfully updated brand:', data);
        console.log(`Updated ${data?.length || 0} record(s)`);
    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

updateBrandName();
