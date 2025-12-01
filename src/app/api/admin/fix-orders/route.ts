import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  try {
    // This endpoint fixes orders that violate the user_id/guest_email constraint
    console.log('Starting orders constraint fix...');

    // First, get all orders that might violate the constraint
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, user_id, guest_email, user_email')
      .or('and(user_id.is.null,guest_email.is.null),and(user_id.not.is.null,guest_email.not.is.null)');

    if (fetchError) {
      console.error('Error fetching problematic orders:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    console.log(`Found ${orders?.length || 0} orders that need fixing`);

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders need fixing',
        fixed: 0
      });
    }

    let fixedCount = 0;
    const errors = [];

    for (const order of orders) {
      try {
        let updateData: any = {};

        if (order.user_id && order.guest_email) {
          // Both are set, prioritize user_id and clear guest_email
          updateData.guest_email = null;
          console.log(`Fixing order ${order.id}: clearing guest_email (has user_id)`);
        } else if (!order.user_id && !order.guest_email) {
          // Neither is set, set guest_email from user_email or default
          updateData.guest_email = order.user_email || 'legacy@guest.com';
          console.log(`Fixing order ${order.id}: setting guest_email to ${updateData.guest_email}`);
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', order.id);

          if (updateError) {
            console.error(`Error updating order ${order.id}:`, updateError);
            errors.push({ orderId: order.id, error: updateError.message });
          } else {
            fixedCount++;
            console.log(`Successfully fixed order ${order.id}`);
          }
        }
      } catch (error) {
        console.error(`Unexpected error fixing order ${order.id}:`, error);
        errors.push({ orderId: order.id, error: 'Unexpected error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} orders`,
      fixed: fixedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Unexpected error in fix-orders API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}