import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export interface PromotionValidationResult {
  isValid: boolean
  promotion?: any
  error?: string
  discountAmount?: number
}

export interface CartItem {
  id: string
  product_id: string
  quantity: number
  price: number
  brand_id?: string
}

export interface PromotionApplication {
  code: string
  promotionId: string
  discountAmount: number
  discountType: 'percentage' | 'fixed_amount'
  discountValue: number
}

/**
 * Validates a promotion code and calculates discount
 */
export async function validatePromotionCode(
  code: string,
  userId: string,
  cartItems: CartItem[],
  subtotal: number
): Promise<PromotionValidationResult> {
  try {
    // Fetch the promotion
    const { data: promotion, error: promotionError } = await supabase
      .from('promotions')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (promotionError || !promotion) {
      return {
        isValid: false,
        error: 'Invalid promotion code'
      }
    }

    // Check if promotion has started
    const now = new Date()
    const startsAt = new Date(promotion.starts_at)
    if (now < startsAt) {
      return {
        isValid: false,
        error: 'This promotion has not started yet'
      }
    }

    // Check if promotion has expired
    if (promotion.expires_at) {
      const expiresAt = new Date(promotion.expires_at)
      if (now > expiresAt) {
        return {
          isValid: false,
          error: 'This promotion has expired'
        }
      }
    }

    // Check if promotion has reached usage limit
    if (promotion.usage_limit && promotion.used_count >= promotion.usage_limit) {
      return {
        isValid: false,
        error: 'This promotion has reached its usage limit'
      }
    }

    // Check user usage limit
    const { data: userUsage, error: usageError } = await supabase
      .from('promotion_usage')
      .select('*')
      .eq('promotion_id', promotion.id)
      .eq('user_id', userId)

    if (usageError) {
      console.error('Error checking user usage:', usageError)
      return {
        isValid: false,
        error: 'Error validating promotion'
      }
    }

    if (userUsage && userUsage.length >= promotion.max_uses_per_user) {
      return {
        isValid: false,
        error: 'You have already used this promotion the maximum number of times'
      }
    }

    // Check minimum order amount
    if (subtotal < promotion.minimum_order_amount) {
      return {
        isValid: false,
        error: `Minimum order amount of ₦${promotion.minimum_order_amount.toLocaleString()} required`
      }
    }

    // Check if promotion applies to cart items
    const applicableItems = await getApplicableItems(promotion, cartItems)
    if (applicableItems.length === 0) {
      return {
        isValid: false,
        error: 'This promotion does not apply to any items in your cart'
      }
    }

    // Calculate discount
    const discountAmount = calculateDiscount(promotion, applicableItems, subtotal)

    return {
      isValid: true,
      promotion,
      discountAmount
    }
  } catch (error) {
    console.error('Error validating promotion:', error)
    return {
      isValid: false,
      error: 'Error validating promotion code'
    }
  }
}

/**
 * Gets items that the promotion applies to
 */
async function getApplicableItems(promotion: any, cartItems: CartItem[]): Promise<CartItem[]> {
  if (promotion.applies_to === 'all') {
    return cartItems
  }

  if (promotion.applies_to === 'brand' && promotion.brand_id) {
    // Get products for the specific brand
    const { data: brandProducts, error } = await supabase
      .from('products')
      .select('id')
      .eq('brand_id', promotion.brand_id)

    if (error || !brandProducts) {
      return []
    }

    const brandProductIds = brandProducts.map(p => p.id)
    return cartItems.filter(item => brandProductIds.includes(item.product_id))
  }

  if (promotion.applies_to === 'product' && promotion.product_id) {
    return cartItems.filter(item => item.product_id === promotion.product_id)
  }

  return []
}

/**
 * Calculates the discount amount
 */
function calculateDiscount(promotion: any, applicableItems: CartItem[], subtotal: number): number {
  const applicableSubtotal = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  let discountAmount = 0

  if (promotion.discount_type === 'percentage') {
    discountAmount = (applicableSubtotal * promotion.discount_value) / 100

    // Apply maximum discount limit if set
    if (promotion.maximum_discount_amount && discountAmount > promotion.maximum_discount_amount) {
      discountAmount = promotion.maximum_discount_amount
    }
  } else if (promotion.discount_type === 'fixed_amount') {
    discountAmount = promotion.discount_value

    // Don't exceed the applicable subtotal
    if (discountAmount > applicableSubtotal) {
      discountAmount = applicableSubtotal
    }
  }

  // Don't exceed the total subtotal
  if (discountAmount > subtotal) {
    discountAmount = subtotal
  }

  return Math.round(discountAmount * 100) / 100 // Round to 2 decimal places
}

/**
 * Records promotion usage
 */
export async function recordPromotionUsage(
  promotionId: string,
  userId: string,
  orderId: string,
  discountAmount: number
): Promise<boolean> {
  try {
    // Record the usage
    const { error: usageError } = await supabase
      .from('promotion_usage')
      .insert([{
        promotion_id: promotionId,
        user_id: userId,
        order_id: orderId,
        discount_amount: discountAmount
      }])

    if (usageError) {
      console.error('Error recording promotion usage:', usageError)
      return false
    }

    // Increment the used count
    const { error: updateError } = await supabase
      .rpc('increment_promotion_usage', { promotion_id: promotionId })

    if (updateError) {
      console.error('Error incrementing promotion usage:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error recording promotion usage:', error)
    return false
  }
}

/**
 * Gets user's promotion usage history
 */
export async function getUserPromotionUsage(userId: string) {
  try {
    const { data, error } = await supabase
      .from('promotion_usage')
      .select(`
        *,
        promotions(code, name, discount_type, discount_value),
        orders(order_number, total_amount, created_at)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user promotion usage:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching user promotion usage:', error)
    return []
  }
}