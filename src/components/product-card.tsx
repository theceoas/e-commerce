'use client'

import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Heart, Plus } from 'lucide-react'
import { Product } from '@/lib/supabase'
import { useCallback, useState, useEffect } from 'react'

// Helper function to calculate if product has stock
const hasAvailableStock = (product: any) => {
  if (!product || !product.sizes || product.sizes.length === 0) {
    return false;
  }
  return product.sizes.some((size: any) => size.stock > 0);
};

interface ProductCardProps {
  product: Product & {
    thumbnail_url?: string
    additional_images?: string[]
    sizes?: Array<{
      size: string
      stock: number
    }>
    has_active_discount?: boolean
    discount_percentage?: number
    discount_amount?: number
    discounted_price?: number
  }
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
  const [isLoading, setIsLoading] = useState(false)
  const [imagesPreloaded, setImagesPreloaded] = useState(false)
  
  // Calculate if product has available stock
  const isInStock = hasAvailableStock(product);

  // Preload images for modal when hovering over card
  const preloadImages = useCallback(() => {
    if (imagesPreloaded) return;
    
    const imagesToPreload = [
      product.thumbnail_url || product.image_url,
      ...(product.additional_images || [])
    ].filter(Boolean);

    imagesToPreload.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
    
    setImagesPreloaded(true);
  }, [product.thumbnail_url, product.image_url, product.additional_images, imagesPreloaded]);

  // Optimize click handlers with useCallback
  const handleProductClick = useCallback(() => {
    // Ensure images are preloaded before opening modal
    if (!imagesPreloaded) {
      preloadImages();
    }
    onProductClick?.(product)
  }, [onProductClick, product, imagesPreloaded, preloadImages])

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLoading(true)
    onAddToCart(product)
    setTimeout(() => setIsLoading(false), 1000) // Reset loading state
  }, [onAddToCart, product])

  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite?.(product.id)
  }, [onToggleFavorite, product.id])

  return (
    <div 
      className="group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
      onClick={handleProductClick}
      onMouseEnter={preloadImages}
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
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
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
        
        {/* Out of Stock Badge */}
        {!isInStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-xs sm:text-sm">Out of Stock</Badge>
          </div>
        )}
        
        <Button
          size="sm"
          className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0 shadow-lg transition-all duration-200"
          onClick={handleAddToCart}
          disabled={!isInStock || isLoading}
        >
          <Plus className="w-3 h-3 sm:w-5 sm:h-5" />
        </Button>
      </div>
      
      <div className="p-2 sm:p-4">
        <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 sm:mb-2 line-clamp-2">{product.name}</h3>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {product.has_active_discount ? (
              <>
                <span className="text-lg sm:text-xl font-bold text-green-600">
                  ₦{product.discounted_price?.toLocaleString()}
                </span>
                <span className="text-xs sm:text-sm text-gray-500 line-through">
                  ₦{product.price.toLocaleString()}
                </span>
              </>
            ) : (
              <span className="text-lg sm:text-xl font-bold text-gray-900">
                ₦{product.price.toLocaleString()}
              </span>
            )}
          </div>
          
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
              className="p-1 sm:p-2 hover:bg-gray-100"
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductCard