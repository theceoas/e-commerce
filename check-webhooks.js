const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ysubkmcyeqosjybogvyq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdWJrbWN5ZXFvc2p5Ym9ndnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjk5NDYsImV4cCI6MjA3MzkwNTk0Nn0._KUlofWqNHlr3LEMFx6UXHCOhQNh0CKze1eNls9eM1U';

const supabase = createClient(supabaseUrl, supabaseKey);

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
        console.log(`  - Event: ${webhook.event}, URL: ${webhook.url}, Active: ${webhook.is_active}`);
      });
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkWebhooks();