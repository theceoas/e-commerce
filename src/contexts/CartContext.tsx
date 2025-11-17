'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { validatePromotionCode, PromotionApplication, PromotionValidationResult } from '@/lib/promotions';

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  size?: string;
  size_price?: number; // Price for the specific size (for MiniMe products)
  product?: {
    id: string;
    name: string;
    price: number;
    thumbnail_url: string;
    brand_id: string;
    discount_percentage?: number;
    discount_amount?: number;
    discount_active?: boolean;
    discount_start_date?: string;
    discount_end_date?: string;
    discounted_price?: number;
    has_active_discount?: boolean;
  };
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  appliedPromotion: PromotionApplication | null;
  promotionLoading: boolean;
  addToCart: (productId: string, quantity: number, size?: string, sizePrice?: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getCartCount: () => number;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getFinalTotal: () => number;
  applyPromotionCode: (code: string) => Promise<PromotionValidationResult>;
  removePromotionCode: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedPromotion, setAppliedPromotion] = useState<PromotionApplication | null>(null);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const { user } = useAuth();

  // Generate session ID for guest users
  const getSessionId = () => {
    let sessionId = localStorage.getItem('cart_session_id');
    if (!sessionId) {
      sessionId = 'guest_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cart_session_id', sessionId);
    }
    return sessionId;
  };

  // Load cart items
  const loadCart = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('cart_items')
        .select(`
          *,
          size_price,
          product:products_with_discounts(
            id,
            name,
            price,
            thumbnail_url,
            brand_id,
            discount_percentage,
            discount_amount,
            discount_active,
            discount_start_date,
            discount_end_date,
            discounted_price,
            has_active_discount
          )
        `);

      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        query = query.eq('session_id', getSessionId());
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load cart when user changes or component mounts
  useEffect(() => {
    loadCart();
  }, [user]);

  const addToCart = async (productId: string, quantity: number, size?: string, sizePrice?: number) => {
    try {
      // Fetch product stock info to validate before adding
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, in_stock, sizes')
        .eq('id', productId)
        .single();

      if (productError) {
        throw new Error('Failed to fetch product for cart');
      }

      if (!productData?.in_stock) {
        throw new Error('This product is currently out of stock');
      }

      // If product has sizes, ensure a valid size and stock
      const hasSizes = Array.isArray(productData?.sizes) && productData.sizes.length > 0;
      if (hasSizes) {
        if (!size) {
          throw new Error('Please select a size before adding to cart');
        }
        const sizeInfo = productData.sizes.find((s: any) => s.size === size);
        if (!sizeInfo) {
          throw new Error('Selected size is not available for this product');
        }
        if ((sizeInfo.stock ?? 0) <= 0) {
          throw new Error('Selected size is out of stock');
        }
      }

      // Check if item already exists in cart
      const existingItem = items.find(
        item => item.product_id === productId && item.size === size
      );

      if (existingItem) {
        // Validate against available stock when increasing quantity
        const targetQty = existingItem.quantity + quantity;
        if (hasSizes) {
          const sizeInfo = productData.sizes.find((s: any) => s.size === size);
          const available = sizeInfo ? (sizeInfo.stock ?? 0) : 0;
          if (targetQty > available) {
            throw new Error(`Only ${available} items available for size ${size}`);
          }
        }
        // Update quantity
        await updateQuantity(existingItem.id, targetQty);
        return;
      }

      // Add new item
      const cartData: any = {
        product_id: productId,
        quantity,
        size,
      };

      // Store size-specific price if provided (for MiniMe products)
      if (sizePrice !== undefined && sizePrice !== null) {
        cartData.size_price = sizePrice;
      }

      if (user) {
        cartData.user_id = user.id;
      } else {
        cartData.session_id = getSessionId();
      }

      const { data, error } = await supabase
        .from('cart_items')
        .insert(cartData)
        .select(`
          *,
          size_price,
          product:products_with_discounts(
            id,
            name,
            price,
            thumbnail_url,
            brand_id,
            discount_percentage,
            discount_amount,
            discount_active,
            discount_start_date,
            discount_end_date,
            discounted_price,
            has_active_discount
          )
        `)
        .single();

      if (error) throw error;

      setItems(prev => [...prev, data]);
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    try {
      // Validate quantity against stock before updating
      const cartItem = items.find(i => i.id === itemId);
      if (cartItem) {
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('id, in_stock, sizes')
          .eq('id', cartItem.product_id)
          .single();

        if (productError) {
          throw new Error('Failed to fetch product for update');
        }

        if (!productData?.in_stock) {
          throw new Error('This product is currently out of stock');
        }

        const hasSizes = Array.isArray(productData?.sizes) && productData.sizes.length > 0;
        if (hasSizes) {
          if (!cartItem.size) {
            throw new Error('Size is required to update quantity');
          }
          const sizeInfo = productData.sizes.find((s: any) => s.size === cartItem.size);
          const available = sizeInfo ? (sizeInfo.stock ?? 0) : 0;
          if (available <= 0) {
            throw new Error('Selected size is out of stock');
          }
          if (quantity > available) {
            throw new Error(`Only ${available} items available for size ${cartItem.size}`);
          }
        }
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      let query = supabase.from('cart_items').delete();

      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        query = query.eq('session_id', getSessionId());
      }

      const { error } = await query;

      if (error) throw error;

      setItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => {
      // Use size-specific price if available (for MiniMe products), otherwise use product price
      const basePrice = item.size_price !== undefined && item.size_price !== null 
        ? item.size_price 
        : (item.product?.price || 0);
      
      // Apply discount if applicable
      const price = item.product?.has_active_discount && item.product?.discounted_price 
        ? item.product.discounted_price 
        : basePrice;
      
      return total + price * item.quantity;
    }, 0);
  };

  const getCartCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  const getSubtotal = () => {
    return getCartTotal();
  };

  const getDiscountAmount = () => {
    return appliedPromotion?.discountAmount || 0;
  };

  const getFinalTotal = () => {
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    return Math.max(0, subtotal - discount);
  };

  const applyPromotionCode = async (code: string): Promise<PromotionValidationResult> => {
    if (!user) {
      return {
        isValid: false,
        error: 'You must be logged in to use promotion codes'
      };
    }

    setPromotionLoading(true);
    
    try {
      const cartItemsForValidation = items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.product?.price || 0,
        brand_id: item.product?.brand_id
      }));

      const result = await validatePromotionCode(
        code,
        user.id,
        cartItemsForValidation,
        getSubtotal()
      );

      if (result.isValid && result.promotion && result.discountAmount !== undefined) {
        setAppliedPromotion({
          code: result.promotion.code,
          promotionId: result.promotion.id,
          discountAmount: result.discountAmount,
          discountType: result.promotion.discount_type,
          discountValue: result.promotion.discount_value
        });
      }

      return result;
    } catch (error) {
      console.error('Error applying promotion code:', error);
      return {
        isValid: false,
        error: 'Error applying promotion code'
      };
    } finally {
      setPromotionLoading(false);
    }
  };

  const removePromotionCode = () => {
    setAppliedPromotion(null);
  };

  const value = {
    items,
    loading,
    appliedPromotion,
    promotionLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    getSubtotal,
    getDiscountAmount,
    getFinalTotal,
    applyPromotionCode,
    removePromotionCode,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}