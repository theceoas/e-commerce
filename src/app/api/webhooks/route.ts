import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for webhook operations to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { event_type, data } = await request.json();

    if (!event_type) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
    }

    console.log(`Triggering webhooks for event: ${event_type}`);

    // Get all active webhooks for this event type
    const { data: webhooks, error: webhookError } = await supabaseAdmin
      .from('webhook_configs')
      .select('*')
      .eq('event_type', event_type)
      .eq('is_active', true);

    if (webhookError) {
      console.error('Error fetching webhooks:', webhookError);
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
    }

    if (!webhooks || webhooks.length === 0) {
      console.log(`No active webhooks found for event: ${event_type}`);
      return NextResponse.json({ 
        success: true, 
        message: `No active webhooks for ${event_type}`,
        triggered: 0 
      });
    }

    // Trigger all webhooks for this event
    const webhookPromises = webhooks.map(async (webhook) => {
      try {
        const payload = {
          event: event_type,
          timestamp: new Date().toISOString(),
          data: data
        };

        console.log(`Triggering webhook ${webhook.id} at ${webhook.url}`);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'FaveThings-Webhook/1.0'
          },
          body: JSON.stringify(payload),
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        return {
          webhook_id: webhook.id,
          url: webhook.url,
          status: response.status,
          success: response.ok
        };
      } catch (error) {
        console.error(`Error triggering webhook ${webhook.id}:`, error);
        return {
          webhook_id: webhook.id,
          url: webhook.url,
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    const results = await Promise.all(webhookPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Webhook trigger results:`, results);

    return NextResponse.json({
      success: true,
      event_type,
      triggered: results.length,
      successful: successCount,
      results
    });

  } catch (error) {
    console.error('Webhook trigger error:', error);
    return NextResponse.json({ 
      error: 'Failed to trigger webhooks',
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}