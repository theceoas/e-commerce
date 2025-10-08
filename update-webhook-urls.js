const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Please check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateWebhookUrls() {
  try {
    console.log('🔄 Updating webhook URLs to use local test endpoint...');
    
    // Get all webhooks
    const { data: webhooks, error: fetchError } = await supabase
      .from('webhook_configs')
      .select('*');
      
    if (fetchError) {
      console.error('❌ Error fetching webhooks:', fetchError);
      return;
    }
    
    console.log(`📋 Found ${webhooks.length} webhooks to update`);
    
    // Update each webhook to use our local test endpoint
    for (const webhook of webhooks) {
      const newUrl = `http://localhost:3001/api/test-webhook`;
      
      console.log(`🔄 Updating ${webhook.event_type} webhook from:`);
      console.log(`   Old: ${webhook.url}`);
      console.log(`   New: ${newUrl}`);
      
      const { error: updateError } = await supabase
        .from('webhook_configs')
        .update({ 
          url: newUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', webhook.id);
        
      if (updateError) {
        console.error(`❌ Error updating webhook ${webhook.id}:`, updateError);
      } else {
        console.log(`✅ Updated ${webhook.event_type} webhook successfully`);
      }
    }
    
    console.log('🎉 All webhook URLs updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating webhook URLs:', error);
  }
}

updateWebhookUrls();