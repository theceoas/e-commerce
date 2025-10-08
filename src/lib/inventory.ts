import { supabase } from './supabase';

interface InventoryHistoryEntry {
  product_id: string;
  size: string;
  change_type: 'adjustment' | 'sale' | 'restock' | 'return';
  quantity_before: number;
  quantity_after: number;
  quantity_changed: number;
  reason?: string;
  user_id?: string;
  order_id?: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  size?: string;
  product?: {
    id: string;
    name: string;
    price: number;
    thumbnail_url: string;
    brand_id: string;
  };
}

export interface StockReductionResult {
  success: boolean
  error?: string
  insufficientStock?: Array<{
    productId: string
    productName: string
    size: string
    requested: number
    available: number
  }>
}

/**
 * Reduces stock for multiple products when an order is placed
 * @param items Array of cart items with product_id, quantity, and size
 * @param orderId Optional order ID for tracking
 * @returns Promise<StockReductionResult>
 */
export async function reduceStock(items: CartItem[], orderId?: string): Promise<StockReductionResult> {
  try {
    // First, check if we have sufficient stock for all items
    const stockCheck = await checkStockAvailability(items)
    if (!stockCheck.success) {
      return stockCheck
    }

    // Process stock reduction for each product
    for (const item of items) {
      // Skip items without size (shouldn't happen in normal flow)
      if (!item.size) {
        throw new Error(`No size specified for product ${item.product_id}`)
      }

      const { error } = await reduceProductStock(item.product_id, item.size, item.quantity, orderId)
      if (error) {
        throw new Error(`Failed to reduce stock for product ${item.product_id}: ${error}`)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Stock reduction error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Checks if sufficient stock is available for all items
 * @param items Array of cart items
 * @returns Promise<StockReductionResult>
 */
export async function checkStockAvailability(items: CartItem[]): Promise<StockReductionResult> {
  try {
    const insufficientStock: StockReductionResult['insufficientStock'] = []

    for (const item of items) {
      // Skip items without size
      if (!item.size) {
        throw new Error(`No size specified for product ${item.product_id}`)
      }

      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, sizes')
        .eq('id', item.product_id)
        .single()

      if (error) {
        throw new Error(`Failed to fetch product ${item.product_id}: ${error.message}`)
      }

      if (!product.sizes || !Array.isArray(product.sizes)) {
        throw new Error(`Product ${item.product_id} has invalid sizes data`)
      }

      const sizeData = product.sizes.find((s: any) => s.size === item.size)
      if (!sizeData) {
        throw new Error(`Size ${item.size} not found for product ${product.name}`)
      }

      if (sizeData.stock < item.quantity) {
        insufficientStock.push({
          productId: item.product_id,
          productName: product.name,
          size: item.size,
          requested: item.quantity,
          available: sizeData.stock
        })
      }
    }

    if (insufficientStock.length > 0) {
      return {
        success: false,
        error: 'Insufficient stock for some items',
        insufficientStock
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Stock availability check error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Logs inventory history changes
 * @param entry - The inventory history entry to log
 * @returns Promise with error if any
 */
async function logInventoryHistory(entry: InventoryHistoryEntry): Promise<{ error?: string }> {
  try {
    const { error } = await supabase
      .from('inventory_history')
      .insert(entry);

    if (error) {
      console.error('Error logging inventory history:', error);
      return { error: error.message };
    }

    return {};
  } catch (error) {
    console.error('Error logging inventory history:', error);
    return { error: 'Failed to log inventory history' };
  }
}

/**
 * Reduces stock for a specific product and size
 * @param productId - The product ID
 * @param size - The size to reduce stock for
 * @param quantity - The quantity to reduce
 * @returns Promise with error if any
 */
async function reduceProductStock(productId: string, size: string, quantity: number, orderId?: string): Promise<{ error?: string }> {
  try {
    // Get current product data
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('sizes')
      .eq('id', productId)
      .single()

    if (fetchError) {
      return { error: fetchError.message }
    }

    if (!product.sizes || !Array.isArray(product.sizes)) {
      return { error: 'Invalid sizes data' }
    }

    // Find current stock for the size
    const sizeData = product.sizes.find((s: any) => s.size === size)
    if (!sizeData) {
      return { error: `Size ${size} not found` }
    }
    const currentStock = sizeData.stock

    // Update the specific size stock
    const updatedSizes = product.sizes.map((s: any) => {
      if (s.size === size) {
        return {
          ...s,
          stock: Math.max(0, s.stock - quantity)
        }
      }
      return s
    })

    // Update the product in the database
    const { error: updateError } = await supabase
      .from('products')
      .update({ sizes: updatedSizes })
      .eq('id', productId)

    if (updateError) {
      return { error: updateError.message }
    }

    // Log inventory history
    await logInventoryHistory({
      product_id: productId,
      size: size,
      change_type: 'sale',
      quantity_before: currentStock,
      quantity_after: Math.max(0, currentStock - quantity),
      quantity_changed: -quantity,
      reason: orderId ? `Order placed: ${orderId}` : 'Stock reduction',
      order_id: orderId
    })

    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Restores stock for items (useful for order cancellations)
 * @param items Array of cart items to restore stock for
 * @returns Promise<StockReductionResult>
 */
export async function restoreStock(items: CartItem[]): Promise<StockReductionResult> {
  try {
    for (const item of items) {
      // Skip items without size
      if (!item.size) {
        throw new Error(`No size specified for product ${item.product_id}`)
      }

      const { error } = await restoreProductStock(item.product_id, item.size, item.quantity)
      if (error) {
        throw new Error(`Failed to restore stock for product ${item.product_id}: ${error}`)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Stock restoration error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Restores stock for a specific product and size
 * @param productId Product ID
 * @param size Product size
 * @param quantity Quantity to restore
 * @returns Promise with error if any
 */
async function restoreProductStock(productId: string, size: string | undefined, quantity: number): Promise<{ error?: string }> {
  if (!size) {
    return { error: 'Size is required' }
  }
  try {
    // Get current product data
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('sizes')
      .eq('id', productId)
      .single()

    if (fetchError) {
      return { error: fetchError.message }
    }

    if (!product.sizes || !Array.isArray(product.sizes)) {
      return { error: 'Invalid sizes data' }
    }

    // Update the specific size stock
    const updatedSizes = product.sizes.map((s: any) => {
      if (s.size === size) {
        return {
          ...s,
          stock: s.stock + quantity
        }
      }
      return s
    })

    // Update the product in the database
    const { error: updateError } = await supabase
      .from('products')
      .update({ sizes: updatedSizes })
      .eq('id', productId)

    if (updateError) {
      return { error: updateError.message }
    }

    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}