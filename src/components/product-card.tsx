'use client'

import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Heart, Plus } from 'lucide-react'
import { Product } from '@/lib/supabase'
import { useCallback } from 'react'

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
  // Optimize click handlers with useCallback
  const handleProductClick = useCallback(() => {
    onProductClick?.(product)
  }, [onProductClick, product])

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCart(product)
  }, [onAddToCart, product])

  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite?.(product.id)
  }, [onToggleFavorite, product.id])

  return (
    <div 
      className="group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
      onClick={handleProductClick}
    >
      <div className="relative overflow-hidden rounded-lg">
        <Image
          src={product.image_url || '/placeholder-product.jpg'}
          alt={product.name}
          width={300}
          height={533}
          className="w-full aspect-[9/16] object-cover transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          loading="lazy"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        />
        
        {/* Discount Badge Overlay */}
        {product.has_active_discount && (
          <div className="absolute top-1 sm:top-2 left-1 sm:left-2 z-10">
            <Badge variant="destructive" className="text-xs font-bold shadow-lg px-1 sm:px-2 py-0.5 sm:py-1">
              {product.discount_percentage 
                ? `${product.discount_percentage}% OFF`
                : `₦${product.discount_amount?.toLocaleString()} OFF`
              }
            </Badge>
          </div>
        )}
        
        {!product.in_stock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-xs sm:text-sm">Out of Stock</Badge>
          </div>
        )}
        
        <Button
          size="sm"
          className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0 shadow-lg transition-all duration-200"
          onClick={handleAddToCart}
          disabled={!product.in_stock}
        >
          <Plus className="w-3 h-3 sm:w-5 sm:h-5" />
        </Button>
        
        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1 sm:top-2 right-1 sm:right-2 h-6 w-6 sm:h-8 sm:w-8 p-0 bg-white/80 hover:bg-white transition-all duration-200"
            onClick={handleToggleFavorite}
          >
            <Heart 
              className={`h-3 w-3 sm:h-4 sm:w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
            />
          </Button>
        )}
      </div>
      
      <div className="mt-2 sm:mt-4">
        <h3 className="font-semibold text-black mb-1 sm:mb-2 text-xs sm:text-sm line-clamp-2">{product.name}</h3>
        <div className="space-y-1">
          {product.has_active_discount && product.discounted_price ? (
            <>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <p className="font-bold text-sm sm:text-lg lg:text-xl text-red-600">
                  ₦{product.discounted_price.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 line-through">
                  ₦{product.price.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-green-600 font-medium">
                  Save ₦{(product.price - product.discounted_price).toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <p className="font-bold text-sm sm:text-lg lg:text-xl text-blue-600">
              ₦{product.price.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}