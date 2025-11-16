'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { CartItem } from '@/lib/supabase'

interface ShoppingCartProps {
  isOpen: boolean
  onClose: () => void
  cartItems: CartItem[]
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
  onCheckout: () => void
}

export function ShoppingCart({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}: ShoppingCartProps) {
  const totalAmount = cartItems.reduce(
    (total, item) => {
      // Use size-specific price if available (for MiniMe products), otherwise use product price
      const basePrice = (item as any).size_price !== undefined && (item as any).size_price !== null
        ? (item as any).size_price
        : item.product.price
      
      const price = item.product.has_active_discount && item.product.discounted_price 
        ? item.product.discounted_price 
        : basePrice
      
      return total + (price * item.quantity)
    },
    0
  )

  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0)

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopping Cart ({totalItems} items)
          </SheetTitle>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-4">
              Add some products to get started!
            </p>
            <Button onClick={onClose}>Continue Shopping</Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Cart Items */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative h-16 w-16 rounded-md overflow-hidden">
                      <Image
                        src={item.product.image_url || '/placeholder-product.jpg'}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <h4 className="font-medium text-sm line-clamp-1">
                        {item.product.name}
                      </h4>
                      <div className="text-sm text-muted-foreground">
                        {(() => {
                          // Use size-specific price if available
                          const basePrice = (item as any).size_price !== undefined && (item as any).size_price !== null
                            ? (item as any).size_price
                            : item.product.price
                          
                          const displayPrice = item.product.has_active_discount && item.product.discounted_price
                            ? item.product.discounted_price
                            : basePrice
                          
                          return item.product.has_active_discount && item.product.discounted_price ? (
                            <div className="flex items-center gap-2">
                              <span>₦{displayPrice.toLocaleString()} each</span>
                              <span className="line-through text-xs">₦{basePrice.toLocaleString()}</span>
                            </div>
                          ) : (
                            <span>₦{displayPrice.toLocaleString()} each</span>
                          )
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Badge variant="secondary" className="min-w-[2rem] justify-center">
                          {item.quantity}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium">
                        {(() => {
                          // Use size-specific price if available
                          const basePrice = (item as any).size_price !== undefined && (item as any).size_price !== null
                            ? (item as any).size_price
                            : item.product.price
                          
                          const price = item.product.has_active_discount && item.product.discounted_price
                            ? item.product.discounted_price
                            : basePrice
                          
                          return `₦${(price * item.quantity).toLocaleString()}`
                        })()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Cart Summary */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₦{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₦{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={onCheckout}
                  disabled={cartItems.length === 0}
                >
                  Checkout
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={onClose}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}