'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Heart, X, Share2, Copy, Check, ArrowLeft, ArrowRight, ShoppingCart } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
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

export function ProductModal({
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
  
  const { addToCart } = useCart()

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (product && typeof window !== 'undefined') {
      const url = `${window.location.origin}${window.location.pathname}?product=${product.id}`
      setShareUrl(url)
    }
  }, [product])

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Define images array safely
  const images = product ? [product.thumbnail_url, ...(product.additional_images || [])].filter(Boolean) : []

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
    if (e.key === 'ArrowLeft' && images.length > 1) {
      setSelectedImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)
    }
    if (e.key === 'ArrowRight' && images.length > 1) {
      setSelectedImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, images.length])

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
      
      {/* Full Screen Modal */}
      <div className="fixed inset-0 z-50 flex">
        {/* Massive Image Section - Takes up most of the screen */}
        <div className="flex-1 relative bg-white flex items-center justify-center">
          {/* Main Image Display - Full Height */}
          <div className="relative w-full h-full flex items-center justify-center p-8">
            <img
              src={images[selectedImageIndex] || '/images/placeholder.jpg'}
              alt={product.name}
              className="max-w-full max-h-full object-contain transition-all duration-500 shadow-2xl"
            />
            
            {!product.in_stock && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <Badge variant="destructive" className="text-3xl px-8 py-4 font-bold">Out of Stock</Badge>
              </div>
            )}
            
            {/* Large Image Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)
                  }}
                  className="absolute left-8 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-4 shadow-2xl transition-all duration-200 hover:scale-110"
                >
                  <ArrowLeft className="w-8 h-8 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)
                  }}
                  className="absolute right-8 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-4 shadow-2xl transition-all duration-200 hover:scale-110"
                >
                  <ArrowRight className="w-8 h-8 text-white" />
                </button>
              </>
            )}
            
            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-lg font-medium">
                {selectedImageIndex + 1} / {images.length}
              </div>
            )}
          </div>
          
          {/* Large Thumbnail Gallery at Bottom */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-gray-200">
              {images.map((image, index) => (
                <button
                  key={`thumb-${index}-${image.substring(image.lastIndexOf('/') + 1, image.lastIndexOf('/') + 21)}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex(index)
                  }}
                  className={`w-16 h-20 lg:w-20 lg:h-24 rounded-xl overflow-hidden border-3 transition-all duration-200 ${
                    selectedImageIndex === index 
                      ? 'border-blue-500 shadow-2xl scale-110' 
                      : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Sidebar */}
        <div 
          className="w-96 lg:w-[480px] bg-white flex flex-col h-full overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Close and Share */}
          <div className="p-6 border-b bg-white sticky top-0 z-10">
            <div className="flex justify-between items-start mb-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 leading-tight">{product.name}</h1>
              <div className="flex items-center gap-3">
                {product.has_active_discount && product.discounted_price ? (
                  <>
                    <p className="text-3xl lg:text-4xl font-bold text-red-600">₦{product.discounted_price.toLocaleString()}</p>
                    <p className="text-xl text-gray-500 line-through">₦{product.price.toLocaleString()}</p>
                    <Badge variant="destructive" className="text-sm">
                      {product.discount_percentage 
                        ? `${product.discount_percentage}% OFF`
                        : `₦${product.discount_amount?.toLocaleString()} OFF`
                      }
                    </Badge>
                  </>
                ) : (
                  <p className="text-3xl lg:text-4xl font-bold text-blue-600">₦{product.price.toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 p-6 space-y-8">
            {product.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-lg">Description</h3>
                <p className="text-gray-600 leading-relaxed text-base">{product.description}</p>
              </div>
            )}

            {product.category && (
              <div>
                <Badge variant="secondary" className="text-sm px-3 py-1">{product.category}</Badge>
              </div>
            )}

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 text-lg">Size</h3>
                <div className="grid grid-cols-3 gap-3">
                  {product.sizes.map((sizeOption) => (
                    <button
                      key={sizeOption.size}
                      onClick={() => setSelectedSize(sizeOption.size)}
                      disabled={sizeOption.stock === 0}
                      className={`px-4 py-3 border-2 rounded-lg transition-all font-medium ${
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
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${product.in_stock ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-lg font-medium ${product.in_stock ? 'text-green-600' : 'text-red-600'}`}>
                {product.in_stock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
          </div>

          {/* Fixed Action Buttons at Bottom */}
          <div className="p-6 border-t bg-white space-y-4">
            <Button
              onClick={handleAddToCart}
              disabled={!product.in_stock || (product.sizes && product.sizes.length > 0 && !selectedSize) || isAddingToCart}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isAddingToCart ? (
                <>
                  <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </>
              )}
            </Button>
            
            {onToggleFavorite && (
              <Button
                variant="outline"
                onClick={() => onToggleFavorite(product.id)}
                className="w-full py-4 text-lg font-semibold rounded-lg border-2 hover:shadow-md transition-all"
              >
                <Heart 
                  className={`w-5 h-5 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
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