'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Heart, X, Share2, Copy, Check, ArrowLeft, ArrowRight, ShoppingCart } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import Image from 'next/image'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface Product {
  id: string
  name: string
  description: string
  price: number
  thumbnail_url: string
  additional_images?: string[]
  category?: string
  in_stock: boolean
  brand_id?: string
  created_at?: string
  featured?: boolean
  sizes?: Array<{
    size: string
    stock: number
    price?: number // Optional price per size (for MiniMe brand)
  }>
  discount_percentage?: number
  discount_amount?: number
  discount_start_date?: string
  discount_end_date?: string
  discount_active?: boolean
  discounted_price?: number
  has_active_discount?: boolean
}

interface ProductModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart?: (product: Product) => void
  onToggleFavorite?: (productId: string) => void
  isFavorite?: boolean
}

// Helper function to calculate if product has stock
const hasAvailableStock = (product: Product | null) => {
  if (!product || !product.sizes || product.sizes.length === 0) {
    return false;
  }
  return product.sizes.some((size: any) => size.stock > 0);
};

export default function ProductModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onToggleFavorite,
  isFavorite = false
}: ProductModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set())
  const [currentImageLoading, setCurrentImageLoading] = useState(true)
  const [isMiniMeBrand, setIsMiniMeBrand] = useState(false)
  
  const { addToCart } = useCart()

  // Calculate if product has available stock
  const isInStock = hasAvailableStock(product);

  // Fetch brand info to check if it's MiniMe
  useEffect(() => {
    const fetchBrandInfo = async () => {
      if (product?.brand_id) {
        try {
          const { data, error } = await supabase
            .from('brands')
            .select('name')
            .eq('id', product.brand_id)
            .single()
          
          if (!error && data) {
            const brandName = data.name.toLowerCase()
            const isMiniMe = brandName.includes('minime') || brandName.includes('mini me') || brandName === 'minime'
            setIsMiniMeBrand(isMiniMe)
            console.log('[ProductModal] Brand:', data.name, 'isMiniMe:', isMiniMe)
          }
        } catch (error) {
          console.error('Error fetching brand info:', error)
        }
      } else {
        setIsMiniMeBrand(false)
      }
    }
    fetchBrandInfo()
  }, [product?.brand_id])

  // Calculate price based on selected size (for MiniMe products)
  const displayPrice = useMemo(() => {
    if (!product) return null
    
    // Always start with product price as fallback
    const baseProductPrice = product.price || 0
    let priceToUse = baseProductPrice
    
    // Check if any sizes have prices - don't wait for brand detection
    // This is important because brand check is async and might not be ready initially
    if (product.sizes && product.sizes.length > 0) {
      // If a size is selected, prioritize that size's price
      if (selectedSize) {
        const sizeInfo = product.sizes.find(s => s.size === selectedSize)
        console.log('[ProductModal] displayPrice calculation:', {
          selectedSize,
          sizeInfo,
          sizePrice: sizeInfo?.price,
          baseProductPrice,
          isMiniMeBrand,
          allSizes: product.sizes?.map(s => ({ size: s.size, price: (s as any).price }))
        })
        if (sizeInfo && (sizeInfo as any).price !== undefined && (sizeInfo as any).price !== null && (sizeInfo as any).price > 0) {
          priceToUse = (sizeInfo as any).price
          console.log('[ProductModal] ✅ Using size-specific price:', priceToUse, 'for size:', selectedSize)
        } else if (baseProductPrice === 0) {
          // If selected size has no price and base is 0, try to find any size with price
          const sizeWithPrice = product.sizes.find((s: any) => {
            const price = (s as any).price
            return price !== undefined && price !== null && price > 0
          })
          if (sizeWithPrice) {
            priceToUse = (sizeWithPrice as any).price
            console.log('[ProductModal] Using fallback size price:', priceToUse, 'from size:', sizeWithPrice.size)
          }
        }
      } else {
        // No size selected yet - if base price is 0, try to find first size with price
        if (baseProductPrice === 0) {
          const sizeWithPrice = product.sizes.find((s: any) => {
            const price = (s as any).price
            return price !== undefined && price !== null && price > 0
          })
          if (sizeWithPrice) {
            priceToUse = (sizeWithPrice as any).price
            console.log('[ProductModal] No size selected, using first available size price:', priceToUse, 'from size:', sizeWithPrice.size)
          }
        }
      }
    }
    
    // Apply discount if applicable
    if (product.has_active_discount && priceToUse > 0) {
      let discount = 0
      if (product.discount_percentage) {
        discount = priceToUse * (product.discount_percentage / 100)
      } else if (product.discount_amount) {
        discount = product.discount_amount
      }
      return Math.max(0, priceToUse - discount)
    }
    
    return priceToUse
  }, [product, selectedSize, isMiniMeBrand])

  // Calculate base price for discount display (before discount)
  const basePrice = useMemo(() => {
    if (!product) return null
    
    const baseProductPrice = product.price || 0
    
    // If product has size-based pricing (MiniMe)
    if (product.sizes && isMiniMeBrand) {
      // If a size is selected, use that size's price
      if (selectedSize) {
        const sizeInfo = product.sizes.find(s => s.size === selectedSize)
        if (sizeInfo && (sizeInfo as any).price !== undefined && (sizeInfo as any).price !== null && (sizeInfo as any).price > 0) {
          return (sizeInfo as any).price
        }
        // If selected size doesn't have price, try fallback
        if (baseProductPrice === 0 && product.sizes && product.sizes.length > 0) {
          const sizeWithPrice = product.sizes.find((s: any) => s.price && s.price > 0)
          if (sizeWithPrice) {
            return (sizeWithPrice as any).price
          }
        }
      } else {
        // No size selected - try to find first size with price
        if (baseProductPrice === 0 && product.sizes && product.sizes.length > 0) {
          const sizeWithPrice = product.sizes.find((s: any) => s.price && s.price > 0)
          if (sizeWithPrice) {
            return (sizeWithPrice as any).price
          }
        }
      }
    }
    
    return baseProductPrice
  }, [product, selectedSize, isMiniMeBrand])

  // Calculate discounted price for size-based pricing
  const discountedPrice = useMemo(() => {
    if (!product || !product.has_active_discount) return null
    
    const priceToDiscount = basePrice || 0
    if (priceToDiscount <= 0) return null
    
    let discount = 0
    
    if (product.discount_percentage) {
      discount = priceToDiscount * (product.discount_percentage / 100)
    } else if (product.discount_amount) {
      discount = product.discount_amount
    }
    
    return Math.max(0, priceToDiscount - discount)
  }, [product, basePrice])

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  // Memoize images array to prevent unnecessary recalculations
  const images = useMemo(() => 
    product ? [product.thumbnail_url, ...(product.additional_images || [])].filter(Boolean) : [],
    [product]
  )

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setSelectedImageIndex(0)
      setSelectedSize('')
      setImagesLoaded(new Set())
      
      // Debug: Log product price info
      console.log('[ProductModal] Product loaded:', {
        name: product.name,
        price: product.price,
        hasPrice: !!product.price,
        brand_id: product.brand_id,
        sizes: product.sizes,
        sizesWithPrices: product.sizes?.map((s: any) => ({ 
          size: s.size, 
          stock: s.stock, 
          price: (s as any).price,
          hasPrice: (s as any).price !== undefined && (s as any).price !== null
        }))
      })
      
      if (typeof window !== 'undefined') {
        const url = `${window.location.origin}${window.location.pathname}?product=${product.id}`
        setShareUrl(url)
      }
    }
  }, [product])

  // Preload all images aggressively when modal opens
  useEffect(() => {
    if (images.length > 0 && isOpen) {
      // Preload all images immediately when modal opens with high priority
      images.forEach((src: string, index: number) => {
        const img = new window.Image()
        img.onload = () => {
          setImagesLoaded(prev => new Set(prev).add(index))
        }
        img.onerror = () => {
          // Still mark as "loaded" to prevent blocking
          setImagesLoaded(prev => new Set(prev).add(index))
        }
        // Set high priority for all images in modal
        img.fetchPriority = 'high'
        img.loading = 'eager'
        img.src = src
      })
      
      // Also preload using link rel="preload" for better browser optimization
      images.forEach((src: string, index: number) => {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'image'
        link.href = src
        link.fetchPriority = 'high'
        document.head.appendChild(link)
        
        // Clean up after a delay
        setTimeout(() => {
          if (document.head.contains(link)) {
            document.head.removeChild(link)
          }
        }, 10000)
      })
    }
  }, [images, isOpen])

  // Update loading state when image changes - but don't block modal
  useEffect(() => {
    // Only show loading spinner if image isn't already loaded
    const isLoaded = imagesLoaded.has(selectedImageIndex)
    setCurrentImageLoading(!isLoaded)
    
    // If not loaded, give it a short timeout before showing spinner (prevents flash)
    if (!isLoaded) {
      const timer = setTimeout(() => {
        setCurrentImageLoading(true)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setCurrentImageLoading(false)
    }
  }, [selectedImageIndex, imagesLoaded])

  // Aggressively preload adjacent images when navigating
  useEffect(() => {
    if (images.length > 1 && isOpen) {
      const prevIndex = selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1
      const nextIndex = selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0
      
      // Preload previous and next images with high priority
      const indicesToPreload = [prevIndex, nextIndex]
      indicesToPreload.forEach((index) => {
        if (index !== selectedImageIndex && images[index]) {
          const img = new window.Image()
          img.fetchPriority = 'high'
          img.loading = 'eager'
          img.onload = () => {
            setImagesLoaded(prev => new Set(prev).add(index))
          }
          img.onerror = () => {
            setImagesLoaded(prev => new Set(prev).add(index))
          }
          img.src = images[index]
        }
      })
    }
  }, [selectedImageIndex, images, isOpen])

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      requestAnimationFrame(() => {
        document.body.style.overflow = 'hidden'
      })
    } else {
      requestAnimationFrame(() => {
        document.body.style.overflow = 'unset'
      })
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Optimized navigation functions with useCallback
  const navigateToImage = useCallback((direction: 'prev' | 'next') => {
    if (images.length <= 1) return
    
    setSelectedImageIndex(prev => {
      const newIndex = direction === 'next' 
        ? (prev < images.length - 1 ? prev + 1 : 0)
        : (prev > 0 ? prev - 1 : images.length - 1)
      
      // Preload the target image immediately before switching
      if (images[newIndex] && !imagesLoaded.has(newIndex)) {
        const img = new window.Image()
        img.fetchPriority = 'high'
        img.loading = 'eager'
        img.src = images[newIndex]
        img.onload = () => {
          setImagesLoaded(prevLoaded => new Set(prevLoaded).add(newIndex))
        }
        img.onerror = () => {
          setImagesLoaded(prevLoaded => new Set(prevLoaded).add(newIndex))
        }
      }
      
      return newIndex
    })
  }, [images, imagesLoaded])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
    if (e.key === 'ArrowLeft' && images.length > 1) {
      navigateToImage('prev')
    }
    if (e.key === 'ArrowRight' && images.length > 1) {
      navigateToImage('next')
    }
  }, [images.length, navigateToImage, onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Optimized touch handlers with useCallback
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd || images.length <= 1) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      navigateToImage('next')
    } else if (isRightSwipe) {
      navigateToImage('prev')
    }
  }, [touchStart, touchEnd, images.length, navigateToImage])

  // Now we can safely return early after all hooks are called
  if (!product || !isOpen) return null

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} - ₦${product.price.toLocaleString()}`,
          url: shareUrl,
        })
      } catch (error) {
        // Fallback to copy to clipboard
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const handleAddToCart = async () => {
    if (!product) return
    
    setIsAddingToCart(true)
    try {
      // Calculate size-specific price if applicable
      let sizePrice: number | undefined = undefined
      if (selectedSize && product.sizes && isMiniMeBrand) {
        const sizeInfo = product.sizes.find(s => s.size === selectedSize)
        console.log('[ProductModal] handleAddToCart - Size info:', {
          selectedSize,
          sizeInfo,
          sizePrice: sizeInfo?.price,
          isMiniMeBrand,
          allSizes: product.sizes
        })
        if (sizeInfo?.price !== undefined && sizeInfo.price !== null && sizeInfo.price > 0) {
          sizePrice = sizeInfo.price
          console.log('[ProductModal] Using size price for cart:', sizePrice)
        } else {
          // For MiniMe, if no size price, use base product price
          sizePrice = product.price > 0 ? product.price : undefined
          console.log('[ProductModal] No size price, using base price:', sizePrice)
        }
      } else if (isMiniMeBrand && !selectedSize) {
        throw new Error('Please select a size before adding to cart')
      }
      
      // Validate price before adding to cart
      const finalPrice = sizePrice !== undefined ? sizePrice : product.price
      if (finalPrice === 0 || finalPrice === undefined || finalPrice === null) {
        throw new Error('Product price is not set. Please contact support.')
      }
      
      await addToCart(product.id, 1, selectedSize || undefined, sizePrice)
      toast.success(`${product.name} added to cart!`)
      
      // Also call the optional onAddToCart prop for backward compatibility
      onAddToCart?.(product)
    } catch (error: any) {
      console.error('Error adding to cart:', error)
      toast.error(error.message || 'Failed to add item to cart. Please try again.')
    } finally {
      setIsAddingToCart(false)
    }
  }

  return (
    <>
      {/* Full Screen Overlay */}
      <div 
        className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Mobile-Optimized Modal */}
      <div className="fixed inset-0 z-50 flex flex-col md:flex-row overflow-hidden">
        {/* Close Button - Mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-60 bg-black/20 hover:bg-black/30 backdrop-blur-sm rounded-full p-2 md:hidden"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Image Section - Responsive */}
        <div className="flex-1 relative bg-white flex items-center justify-center overflow-hidden">
          {/* Main Image Display */}
          <div 
            className="relative w-full h-full flex items-center justify-center p-4 md:p-8"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="relative">
              {currentImageLoading && (
                <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <Image
                key={`${product.id}-${selectedImageIndex}`}
                src={images[selectedImageIndex] || '/images/placeholder.jpg'}
                alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                width={800}
                height={800}
                className="max-w-full max-h-full object-contain transition-opacity duration-200 shadow-2xl select-none"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={true}
                loading="eager"
                quality={90}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                onLoad={() => {
                  setCurrentImageLoading(false)
                  setImagesLoaded(prev => new Set(prev).add(selectedImageIndex))
                }}
                onError={() => {
                  setCurrentImageLoading(false)
                  setImagesLoaded(prev => new Set(prev).add(selectedImageIndex))
                }}
              />
            </div>
            
            {!product.in_stock && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <Badge variant="destructive" className="text-lg md:text-3xl px-4 py-2 md:px-8 md:py-4 font-bold">Out of Stock</Badge>
              </div>
            )}
            
            {/* Image Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigateToImage('prev')
                  }}
                  className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 md:p-4 shadow-2xl transition-all duration-200 hover:scale-110"
                >
                  <ArrowLeft className="w-4 h-4 md:w-8 md:h-8 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigateToImage('next')
                  }}
                  className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 md:p-4 shadow-2xl transition-all duration-200 hover:scale-110"
                >
                  <ArrowRight className="w-4 h-4 md:w-8 md:h-8 text-white" />
                </button>
              </>
            )}
            
            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 md:px-4 md:py-2">
                <span className="text-white text-xs md:text-sm font-medium">
                  {selectedImageIndex + 1} / {images.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Product Details Section - Mobile Optimized */}
        <div className="w-full md:w-96 lg:w-[28rem] bg-white border-t md:border-t-0 md:border-l border-gray-200 flex flex-col max-h-[60vh] md:max-h-full overflow-y-auto">
          {/* Header with Close and Share */}
          <div className="p-4 md:p-6 border-b bg-white sticky top-0 z-10">
            <div className="flex justify-between items-start mb-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              
              <div className="flex gap-1 md:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
                >
                  <Share2 className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
                >
                  {copied ? <Check className="w-3 h-3 md:w-4 md:h-4 text-green-600" /> : <Copy className="w-3 h-3 md:w-4 md:h-4" />}
                  <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            </div>
            
            <div>
              <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 leading-tight">{product.name}</h1>
              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                {(() => {
                  // Always use product.price as the base - it's always available from the product object
                  const productPrice = product.price || 0
                  
                  // Get calculated prices - prefer displayPrice/basePrice, but fallback to productPrice
                  const calculatedDisplayPrice = (displayPrice !== null && displayPrice !== undefined && displayPrice >= 0) 
                    ? displayPrice 
                    : productPrice
                  const calculatedBasePrice = (basePrice !== null && basePrice !== undefined && basePrice >= 0)
                    ? basePrice
                    : productPrice
                  
                  // Final prices to display - use calculated if > 0, otherwise try to find a size price
                  let finalPrice = calculatedDisplayPrice
                  let finalBasePrice = calculatedBasePrice
                  
                  // If price is 0, check if any size has a price (don't wait for brand detection)
                  // This handles MiniMe products even if brand check hasn't completed
                  if (finalPrice === 0 && product.sizes && product.sizes.length > 0) {
                    const sizeWithPrice = product.sizes.find((s: any) => {
                      const price = (s as any).price
                      return price !== undefined && price !== null && price > 0
                    })
                    if (sizeWithPrice) {
                      finalPrice = (sizeWithPrice as any).price
                      finalBasePrice = finalPrice
                      console.log('[ProductModal] Using size price as fallback:', finalPrice, 'from size:', sizeWithPrice.size)
                    }
                  }
                  
                  // Also check if sizes have prices even when calculatedDisplayPrice > 0 but we should prefer size prices for MiniMe
                  if (isMiniMeBrand && product.sizes && product.sizes.length > 0 && selectedSize) {
                    const selectedSizeInfo = product.sizes.find((s: any) => s.size === selectedSize)
                    if (selectedSizeInfo && (selectedSizeInfo as any).price && (selectedSizeInfo as any).price > 0) {
                      finalPrice = (selectedSizeInfo as any).price
                      finalBasePrice = finalPrice
                      console.log('[ProductModal] Using selected size price:', finalPrice, 'for size:', selectedSize)
                    }
                  }
                  
                  // Debug log
                  console.log('[ProductModal] Price display calculation:', {
                    productPrice,
                    displayPrice,
                    basePrice,
                    calculatedDisplayPrice,
                    calculatedBasePrice,
                    finalPrice,
                    finalBasePrice,
                    hasDiscount: product.has_active_discount,
                    discountedPrice,
                    isMiniMeBrand,
                    selectedSize,
                    allSizes: product.sizes?.map(s => ({ size: s.size, price: (s as any).price }))
                  })
                  
                  // Always show price, even if it's 0
                  if (product.has_active_discount && discountedPrice) {
                    return (
                      <>
                        <p className="text-xl md:text-3xl lg:text-4xl font-bold text-red-600">
                          ₦{finalPrice.toLocaleString()}
                        </p>
                        <p className="text-sm md:text-xl text-gray-500 line-through">
                          ₦{finalBasePrice.toLocaleString()}
                        </p>
                        <Badge variant="destructive" className="text-xs md:text-sm">
                          {product.discount_percentage 
                            ? `${product.discount_percentage}% OFF`
                            : `₦${product.discount_amount?.toLocaleString()} OFF`
                          }
                        </Badge>
                      </>
                    )
                  } else {
                    return (
                      <p className="text-xl md:text-3xl lg:text-4xl font-bold text-blue-600">
                        ₦{finalPrice.toLocaleString()}
                      </p>
                    )
                  }
                })()}
                {isMiniMeBrand && selectedSize && product.sizes && (
                  <p className="text-xs md:text-sm text-gray-500">
                    {product.sizes.find(s => s.size === selectedSize)?.price !== undefined 
                      ? `Price for size ${selectedSize}`
                      : `Base price (size ${selectedSize})`
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-8">
            {product.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 md:mb-3 text-base md:text-lg">Description</h3>
                <p className="text-gray-600 leading-relaxed text-sm md:text-base">{product.description}</p>
              </div>
            )}

            {product.category && (
              <div>
                <Badge variant="secondary" className="text-xs md:text-sm px-2 md:px-3 py-1">{product.category}</Badge>
              </div>
            )}

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 md:mb-4 text-base md:text-lg">Size</h3>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {product.sizes.map((sizeOption) => {
                    const sizePriceValue = isMiniMeBrand && (sizeOption as any).price !== undefined && (sizeOption as any).price !== null && (sizeOption as any).price > 0
                      ? (sizeOption as any).price
                      : product.price
                    const sizeDisplayPrice = product.has_active_discount && product.discounted_price
                      ? product.discounted_price
                      : sizePriceValue
                    
                    return (
                      <button
                        key={sizeOption.size}
                        onClick={() => setSelectedSize(sizeOption.size)}
                        disabled={sizeOption.stock === 0}
                        className={`px-2 md:px-4 py-2 md:py-3 border-2 rounded-lg transition-all font-medium text-sm md:text-base ${
                          selectedSize === sizeOption.size
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                            : sizeOption.stock === 0
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border-gray-300 hover:border-gray-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{sizeOption.size}</span>
                          {/* Show price if size has a price (check directly, don't wait for brand detection) */}
                          {(sizeOption as any).price !== undefined && (sizeOption as any).price !== null && (sizeOption as any).price > 0 && (
                            <span className="text-xs mt-1 font-semibold">₦{sizeDisplayPrice.toLocaleString()}</span>
                          )}
                          {sizeOption.stock === 0 && (
                            <div className="text-xs mt-1">Out of Stock</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stock Status */}
            <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${isInStock ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-sm md:text-lg font-medium ${isInStock ? 'text-green-600' : 'text-red-600'}`}>
                {isInStock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
          </div>

          {/* Fixed Action Buttons at Bottom */}
          <div className="p-4 md:p-6 border-t bg-white space-y-3 md:space-y-4">
            <Button
              onClick={handleAddToCart}
              disabled={!isInStock || (product.sizes && product.sizes.length > 0 && !selectedSize) || isAddingToCart}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 md:py-4 text-base md:text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isAddingToCart ? (
                <>
                  <div className="w-4 h-4 md:w-5 md:h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Add to Cart
                </>
              )}
            </Button>
            
            {onToggleFavorite && (
              <Button
                variant="outline"
                onClick={() => onToggleFavorite(product.id)}
                className="w-full py-3 md:py-4 text-base md:text-lg font-semibold rounded-lg border-2 hover:shadow-md transition-all"
              >
                <Heart 
                  className={`w-4 h-4 md:w-5 md:h-5 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                />
                {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}