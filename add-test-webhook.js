const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ysubkmcyeqosjybogvyq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzdWJrbWN5ZXFvc2p5Ym9ndnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjk5NDYsImV4cCI6MjA3MzkwNTk0Nn0._KUlofWqNHlr3LEMFx6UXHCOhQNh0CKze1eNls9eM1U';

const supabase = createClient(supabaseUrl, supabaseKey);

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