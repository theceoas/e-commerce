const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Please check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkWebhooks() {
  console.log('🔍 Checking webhook configuration...');
  
  try {
    const { data: webhooks, error } = await supabase
      .from('webhook_configs')
      .select('*');
      
    if (error) {
      console.error('❌ Error fetching webhooks:', error);
      return;
    }
    
    console.log('📋 Current webhooks:', JSON.stringify(webhooks, null, 2));
    
    if (webhooks.length === 0) {
      console.log('⚠️ No webhooks found in database');
      console.log('💡 You need to add a webhook for the "purchase" event');
    } else {
      console.log(`✅ Found ${webhooks.length} webhook(s)`);
      webhooks.forEach(webhook => {
        console.log(`  - Event: ${webhook.event_type}, URL: ${webhook.url}, Active: ${webhook.is_active}`);
      });
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkWebhooks();