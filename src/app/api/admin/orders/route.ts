import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(req: NextRequest) {
  try {
    const { orderId, newStatus } = await req.json()

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'orderId and newStatus required' }, { status: 400 })
    }

    const { data: currentOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('status, guest_email, user_id, shipping_address')
      .eq('id', orderId)
      .single()

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (newStatus === 'completed') {
      updateData.payment_status = 'paid'
    }

    // Preserve user identity constraint
    if (currentOrder.user_id && !currentOrder.guest_email) {
      updateData.guest_email = null
    } else if (!currentOrder.user_id && currentOrder.guest_email) {
      updateData.user_id = null
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, previousStatus: currentOrder.status })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
