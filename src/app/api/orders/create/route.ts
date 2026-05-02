import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CLIENT_ID } from '@/lib/config'

interface CartItemPayload {
  product_id: string
  quantity: number
  size?: string
  size_price?: number | null
  product?: {
    price: number
    has_active_discount?: boolean
    discounted_price?: number
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      orderData,
      items,
      appliedPromotion,
      discountAmount,
    } = await req.json()

    if (!orderData || !items?.length) {
      return NextResponse.json({ error: 'Missing order data or items' }, { status: 400 })
    }

    // Generate unique order number server-side
    const now = new Date()
    const day = now.getDate().toString().padStart(2, '0')
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const ms = now.getMilliseconds().toString().padStart(3, '0')
    const dateStr = `${day}${month}`

    const { data: existingOrders } = await supabaseAdmin
      .from('orders')
      .select('order_number')
      .like('order_number', `KI-${dateStr}-%`)
      .order('order_number', { ascending: false })
      .limit(1)

    let counter = 1
    if (existingOrders && existingOrders.length > 0) {
      const match = existingOrders[0].order_number.match(/KI-\d{4}-(\d{3})/)
      if (match) counter = parseInt(match[1], 10) + 1
    }
    const orderNumber = `KI-${dateStr}-${counter.toString().padStart(3, '0')}-${ms}`

    // Insert order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({ ...orderData, client_id: CLIENT_ID, order_number: orderNumber })
      .select()
      .single()

    if (orderError) {
      console.error('Order insert error:', orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // Insert order items
    const orderItems = (items as CartItemPayload[]).map(item => {
      const basePrice = item.size_price != null ? item.size_price : (item.product?.price || 0)
      const effectivePrice =
        item.product?.has_active_discount && item.product?.discounted_price
          ? item.product.discounted_price
          : basePrice
      return {
        client_id: CLIENT_ID,
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        size: item.size,
        price: basePrice,
        unit_price: effectivePrice,
        total_price: effectivePrice * item.quantity,
      }
    })

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Order items insert error:', itemsError)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // Reduce stock via RPC (SECURITY DEFINER, bypasses RLS)
    const rpcItems = (items as CartItemPayload[]).map(item => ({
      product_id: item.product_id,
      size: item.size,
      quantity: item.quantity,
    }))
    const { error: stockError } = await supabaseAdmin.rpc('reduce_stock', { items: rpcItems })
    if (stockError) {
      console.error('Stock reduction error (non-fatal):', stockError)
    }

    // Record promotion usage
    if (appliedPromotion && orderData.user_id) {
      const { error: promoError } = await supabaseAdmin.from('promotion_usage').insert({
        promotion_id: appliedPromotion.promotionId,
        user_id: orderData.user_id,
        order_id: order.id,
        discount_amount: discountAmount,
      })
      if (promoError) console.error('Promotion usage error (non-fatal):', promoError)
    }

    return NextResponse.json({ orderId: order.id, orderNumber: order.order_number })
  } catch (err: any) {
    console.error('Create order error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
