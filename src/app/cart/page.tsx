'use client';

import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Tag, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function CartPage() {
  const { 
    items, 
    loading, 
    updateQuantity, 
    removeFromCart, 
    getCartTotal, 
    getCartCount,
    appliedPromotion,
    promotionLoading,
    getSubtotal,
    getDiscountAmount,
    getFinalTotal,
    applyPromotionCode,
    removePromotionCode
  } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [promoCode, setPromoCode] = useState('');
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const handleQuantityUpdate = async (itemId: string, newQuantity: number) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));
    try {
      await updateQuantity(itemId, newQuantity);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));
    try {
      await removeFromCart(itemId);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) return;
    
    if (!user) {
      toast.error('Please sign in to use promotion codes');
      return;
    }

    const result = await applyPromotionCode(promoCode.trim());
    
    if (result.isValid) {
      toast.success('Coupon code applied successfully!');
    } else {
      toast.error(result.error || 'Failed to apply coupon code');
    }
    
    setPromoCode('');
  };

  const handleRemovePromoCode = () => {
    removePromotionCode();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-yellow-700">Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-yellow-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center text-yellow-600 hover:text-yellow-700 transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Continue Shopping
              </Link>
            </div>
            <h1 className="text-xl font-semibold text-yellow-800">Shopping Cart</h1>
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-yellow-700">{getCartCount()} items</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-24 h-24 text-yellow-300 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-yellow-800 mb-4">Your cart is empty</h2>
            <p className="text-yellow-600 mb-8">Looks like you haven't added anything to your cart yet.</p>
            <Link href="/">
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 shadow-lg">
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-yellow-200 p-6 transition-opacity ${
                    updatingItems.has(item.id) ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
                        {item.product?.thumbnail_url ? (
                          <Image
                            src={item.product.thumbnail_url}
                            alt={item.product.name || 'Product'}
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-yellow-800 truncate">
                        {item.product?.name || 'Product'}
                      </h3>
                      <p className="text-2xl font-bold text-yellow-600 mt-1">
                        {(() => {
                          // Use size-specific price if available (for MiniMe products)
                          const basePrice = (item as any).size_price !== undefined && (item as any).size_price !== null
                            ? (item as any).size_price
                            : (item.product?.price || 0)
                          
                          const price = item.product?.has_active_discount && item.product?.discounted_price
                            ? item.product.discounted_price
                            : basePrice
                          
                          return `₦${(price * item.quantity).toLocaleString()}`
                        })()}
                      </p>
                      <p className="text-sm text-yellow-500">
                        {(() => {
                          // Use size-specific price if available
                          const basePrice = (item as any).size_price !== undefined && (item as any).size_price !== null
                            ? (item as any).size_price
                            : (item.product?.price || 0)
                          
                          const price = item.product?.has_active_discount && item.product?.discounted_price
                            ? item.product.discounted_price
                            : basePrice
                          
                          return `₦${price.toLocaleString()} each`
                        })()}
                      </p>
                      {item.size && (
                        <Badge variant="outline" className="mt-2">
                          Size: {item.size}
                        </Badge>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex flex-col items-end space-y-4">
                      <div className="flex items-center space-x-2 border border-yellow-300 rounded-lg">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuantityUpdate(item.id, item.quantity - 1)}
                          disabled={updatingItems.has(item.id) || item.quantity <= 1}
                          className="h-8 w-8 p-0 hover:bg-yellow-50 text-yellow-600"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-12 text-center font-medium text-yellow-800">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
                          disabled={updatingItems.has(item.id)}
                          className="h-8 w-8 p-0 hover:bg-yellow-50 text-yellow-600"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={updatingItems.has(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-yellow-200 p-6 sticky top-8">
                <h2 className="text-lg font-semibold text-yellow-800 mb-4">Order Summary</h2>
                
                {/* Promotion Code Section */}
                {!appliedPromotion && user && (
                  <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Have a promotion code?</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="flex-1"
                        disabled={promotionLoading}
                      />
                      <Button
                        onClick={handleApplyPromoCode}
                        disabled={!promoCode.trim() || promotionLoading}
                        size="sm"
                        className="bg-yellow-500 hover:bg-yellow-600"
                      >
                        {promotionLoading ? 'Applying...' : 'Apply'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Applied Promotion Display */}
                {appliedPromotion && (
                  <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          {appliedPromotion.code} Applied
                        </span>
                      </div>
                      <Button
                        onClick={handleRemovePromoCode}
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-100"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Coupon applied successfully!
                    </p>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600">Subtotal ({getCartCount()} items)</span>
                    <span className="font-medium text-yellow-800">₦{getSubtotal().toLocaleString()}</span>
                  </div>
                  
                  {appliedPromotion && getDiscountAmount() > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Discount ({appliedPromotion.code})</span>
                      <span className="font-medium text-green-600">-₦{getDiscountAmount().toLocaleString()}</span>
                    </div>
                  )}
                  

                  <div className="border-t border-yellow-200 pt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-yellow-800">Total</span>
                      <span className="text-yellow-600">₦{getFinalTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 text-lg font-semibold shadow-lg"
                  disabled={items.length === 0}
                >
                  Proceed to Checkout
                </Button>

                <p className="text-xs text-yellow-500 text-center mt-4">
                  Secure checkout powered by industry-standard encryption
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}