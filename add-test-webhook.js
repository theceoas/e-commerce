const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Please check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addTestWebhook() {
  console.log('🔧 Adding test webhook for purchase event...');
  
  try {
    const { data, error } = await supabase
      .from('webhook_configs')
      .insert([
        {
          event_type: 'purchase',
          url: 'https://webhook.site/test-endpoint',
          is_active: true
        }
      ])
      .select();
      
    if (error) {
      console.error('❌ Error adding webhook:', error);
      return;
    }
    
    console.log('✅ Test webhook added successfully:', JSON.stringify(data, null, 2));
    
    // Verify it was added
    const { data: webhooks, error: fetchError } = await supabase
      .from('webhook_configs')
      .select('*');
      
    if (fetchError) {
      console.error('❌ Error fetching webhooks:', fetchError);
      return;
    }
    
    console.log('📋 All webhooks now:', JSON.stringify(webhooks, null, 2));
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

addTestWebhook();