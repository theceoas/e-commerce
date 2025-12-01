import { createClient as createSupabaseClient } from '@/utils/supabase/client'

// Create client lazily - not at module load time
// This prevents initialization race conditions
export const supabase = createSupabaseClient()

// Types for our database
export interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  category: string
  in_stock: boolean
  created_at: string
  discount_percentage?: number
  discount_amount?: number
  discount_start_date?: string
  discount_end_date?: string
  discount_active?: boolean
  discounted_price?: number
  has_active_discount?: boolean
}

export interface CartItem {
  id: string
  product_id: string
  quantity: number
  product: Product
}

export interface Order {
  id: string
  user_email: string
  total_amount: number
  status: 'pending' | 'completed' | 'cancelled'
  created_at: string
  order_items: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
  product: Product
}