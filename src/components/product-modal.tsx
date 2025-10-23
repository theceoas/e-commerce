'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Heart, X, Share2, Copy, Check, ArrowLeft, ArrowRight, ShoppingCart } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import Image from 'next/image'
import { toast } from 'sonner'

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
  
  const { addToCart } = useCart()

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
      setCurrentImageLoading(true)
      
      if (typeof window !== 'undefined') {
        const url = `${window.location.origin}${window.location.pathname}?product=${product.id}`
        setShareUrl(url)
      }
    }
  }, [product])

  // Preload images for better performance
  useEffect(() => {
    if (images.length > 0 && isOpen) {
      // Preload all images immediately when modal opens
      images.forEach((src, index) => {
        if (index === 0) return // Skip first image as it's already loading
        
        const img = new window.Image()
        img.onload = () => {
          setImagesLoaded(prev => new Set(prev).add(index))
        }
        img.onerror = () => {
          console.warn(`Failed to preload image: ${src}`)
        }
        // Set high priority for next image, normal for others
        img.fetchPriority = index === 1 ? 'high' : 'auto'
        img.src = src
      })
    }
  }, [images, isOpen])

  // Update loading state when image changes
  useEffect(() => {
    setCurrentImageLoading(true)
  }, [selectedImageIndex])

  // Preload adjacent images when navigating
  useEffect(() => {
    if (images.length > 1 && isOpen) {
      const prevIndex = selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1
      const nextIndex = selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0
      
      // Preload previous image
      if (!imagesLoaded.has(prevIndex) && prevIndex !== selectedImageIndex) {
        const img = new window.Image()
        img.onload = () => {
          setImagesLoaded(prev => new Set(prev).add(prevIndex))
        }
        img.src = images[prevIndex]
      }
      
      // Preload next image
      if (!imagesLoaded.has(nextIndex) && nextIndex !== selectedImageIndex) {
        const img = new window.Image()
        img.onload = () => {
          setImagesLoaded(prev => new Set(prev).add(nextIndex))
        }
        img.src = images[nextIndex]
      }
    }
  }, [selectedImageIndex, images, isOpen, imagesLoaded])

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
      if (direction === 'next') {
        return prev < images.length - 1 ? prev + 1 : 0
      } else {
        return prev > 0 ? prev - 1 : images.length - 1
      }
    })
  }, [images.length])

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
      await addToCart(product.id, 1, selectedSize || undefined)
      toast.success(`${product.name} added to cart!`)
      
      // Also call the optional onAddToCart prop for backward compatibility
      onAddToCart?.(product)
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Failed to add item to cart. Please try again.')
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
                <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <Image
                src={images[selectedImageIndex] || '/images/placeholder.jpg'}
                alt={product.name}
                width={800}
                height={800}
                className="max-w-full max-h-full object-contain transition-all duration-300 shadow-2xl select-none"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={selectedImageIndex === 0}
                loading={selectedImageIndex === 0 ? 'eager' : 'lazy'}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                onLoad={() => setCurrentImageLoading(false)}
                onLoadStart={() => setCurrentImageLoading(true)}
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
                {product.has_active_discount && product.discounted_price ? (
                  <>
                    <p className="text-xl md:text-3xl lg:text-4xl font-bold text-red-600">₦{product.discounted_price.toLocaleString()}</p>
                    <p className="text-sm md:text-xl text-gray-500 line-through">₦{product.price.toLocaleString()}</p>
                    <Badge variant="destructive" className="text-xs md:text-sm">
                      {product.discount_percentage 
                        ? `${product.discount_percentage}% OFF`
                        : `₦${product.discount_amount?.toLocaleString()} OFF`
                      }
                    </Badge>
                  </>
                ) : (
                  <p className="text-xl md:text-3xl lg:text-4xl font-bold text-blue-600">₦{product.price.toLocaleString()}</p>
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
                  {product.sizes.map((sizeOption) => (
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
                      {sizeOption.size}
                      {sizeOption.stock === 0 && (
                        <div className="text-xs mt-1">Out of Stock</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Status */}
            <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${product.in_stock ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-sm md:text-lg font-medium ${product.in_stock ? 'text-green-600' : 'text-red-600'}`}>
                {product.in_stock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
          </div>

          {/* Fixed Action Buttons at Bottom */}
          <div className="p-4 md:p-6 border-t bg-white space-y-3 md:space-y-4">
            <Button
              onClick={handleAddToCart}
              disabled={!product.in_stock || (product.sizes && product.sizes.length > 0 && !selectedSize) || isAddingToCart}
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