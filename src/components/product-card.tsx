'use client'

import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Heart, Plus } from 'lucide-react'
import { Product } from '@/lib/supabase'

interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product) => void
  onToggleFavorite?: (productId: string) => void
  isFavorite?: boolean
  onProductClick?: (product: Product) => void
}

export function ProductCard({ 
  product, 
  onAddToCart, 
  onToggleFavorite, 
  isFavorite = false,
  onProductClick
}: ProductCardProps) {
  return (
    <div 
      className="group cursor-pointer transition-all duration-300 hover:scale-105"
      onClick={() => {
        onProductClick?.(product)
      }}
    >
      <div className="relative overflow-hidden rounded-lg">
        <Image
          src={product.image_url || '/placeholder-product.jpg'}
          alt={product.name}
          width={300}
          height={533}
          className="w-full aspect-[9/16] object-cover transition-transform duration-500"
          style={{ aspectRatio: '9/16' }}
        />
        
        {/* Discount Badge Overlay */}
        {product.has_active_discount && (
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="destructive" className="text-xs font-bold shadow-lg">
              {product.discount_percentage 
                ? `${product.discount_percentage}% OFF`
                : `₦${product.discount_amount?.toLocaleString()} OFF`
              }
            </Badge>
          </div>
        )}
        
        {!product.in_stock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
        <Button
          size="sm"
          className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 p-0 shadow-lg"
          onClick={(e) => {
            e.stopPropagation()
            onAddToCart(product)
          }}
          disabled={!product.in_stock}
        >
          <Plus className="w-5 h-5" />
        </Button>
        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(product.id)
            }}
          >
            <Heart 
              className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
            />
          </Button>
        )}
      </div>
      
      <div className="mt-4">
        <h3 className="font-semibold text-black mb-2 text-sm">{product.name}</h3>
        <div className="space-y-1">
          {product.has_active_discount && product.discounted_price ? (
            <>
              <div className="flex items-center gap-2">
                <p className="font-bold text-xl text-red-600">
                  ₦{product.discounted_price.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 line-through">
                  ₦{product.price.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-green-600 font-medium">
                  You save ₦{(product.price - product.discounted_price).toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <p className="font-bold text-xl text-blue-600">
              ₦{product.price.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}