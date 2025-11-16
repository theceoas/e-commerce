'use client'

import { useState, useEffect } from "react"
import dynamic from 'next/dynamic'
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Star, Heart, ShoppingBag, Filter, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import Image from "next/image"
import { useParams, useSearchParams } from "next/navigation"
import { useNavigationCache } from "@/hooks/useNavigationCache"
import { supabaseCache } from "@/hooks/useSupabaseCache"

// Lazy load components for better performance
const ProductModal = dynamic(
  () => import("@/components/product-modal"),
  { 
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }
)

interface Brand {
  id: string
  name: string
  image_url: string
  description: string
  display_order: number
  is_active: boolean
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  thumbnail_url: string
  additional_images: string[]
  category: string
  in_stock: boolean
  brand_id: string
}

export default function BrandPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const [brand, setBrand] = useState<Brand | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Handle cache clearing on navigation
  useNavigationCache()

  // Prefetch ProductModal chunk to avoid runtime load errors
  useEffect(() => {
    const prefetch = () => import("@/components/product-modal")
    prefetch().catch(() => {})
  }, [])

  useEffect(() => {
    // Only invalidate cache for this specific brand to ensure fresh data
    // Don't invalidate all featured products as it affects homepage performance
    supabaseCache.invalidatePattern(`brand-products-${slug}`)
    fetchBrandAndProducts()
  }, [slug])

  // Handle shared product links
  useEffect(() => {
    const productId = searchParams.get('product')
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId)
      if (product) {
        setSelectedProduct(product)
        setIsModalOpen(true)
        // Clean up URL without refreshing the page
        const url = new URL(window.location.href)
        url.searchParams.delete('product')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [searchParams, products])

  const fetchBrandAndProducts = async () => {
    try {
      // Fetch brand by slug (convert slug back to brand name)
      const brandName = slug.replace(/-/g, ' ')
      console.log('[BrandPage] Looking for brand with name:', brandName)
      
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .ilike('name', `%${brandName}%`)
        .eq('is_active', true)
        .single()

      if (brandError) {
        console.error('[BrandPage] Error fetching brand:', brandError)
        return
      }

      console.log('[BrandPage] Found brand:', brandData)
      setBrand(brandData)

      // Fetch all products for this brand (including out of stock)
      const { data: productsData, error: productsError } = await supabase
        .from('products_with_discounts')
        .select('*')
        .eq('brand_id', brandData.id)
        .order('created_at', { ascending: false })

      if (productsError) {
        console.error('[BrandPage] Error fetching products:', productsError)
        return
      }

      console.log(`[BrandPage] Total products found: ${productsData?.length || 0}`)
      if (productsData && productsData.length > 0) {
        const inStockCount = productsData.filter(p => p.in_stock).length
        const outOfStockCount = productsData.length - inStockCount
        console.log(`[BrandPage] In stock: ${inStockCount}, Out of stock: ${outOfStockCount}`)
        
        // Preload first 8 product images for faster display
        const imageUrls = productsData
          .slice(0, 8)
          .map(p => p.thumbnail_url)
          .filter(Boolean)
        
        if (imageUrls.length > 0) {
          // Preload images in background
          Promise.all(
            imageUrls.map(url => {
              const img = new window.Image()
              img.src = url
              img.loading = 'eager'
              img.fetchPriority = 'high'
              return new Promise((resolve) => {
                img.onload = resolve
                img.onerror = resolve
              })
            })
          ).catch(() => {})
        }
      }
      console.log('[BrandPage] Products to display:', productsData)
      setProducts(productsData || [])
    } catch (error) {
      console.error('[BrandPage] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getBrandColors = (brandName: string) => {
    const name = brandName.toLowerCase()
    
    // Create a simple hash from the brand name to ensure consistent colors
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Define color schemes
    const colorSchemes = [
      {
        gradient: 'from-red-50 to-pink-50',
        badge: 'bg-red-400',
        button: 'bg-red-400 hover:bg-red-500',
        accent: 'text-red-500'
      },
      {
        gradient: 'from-blue-50 to-indigo-50',
        badge: 'bg-blue-400',
        button: 'bg-blue-400 hover:bg-blue-500',
        accent: 'text-blue-500'
      },
      {
        gradient: 'from-purple-50 to-pink-50',
        badge: 'bg-purple-400',
        button: 'bg-purple-400 hover:bg-purple-500',
        accent: 'text-purple-500'
      },
      {
        gradient: 'from-green-50 to-emerald-50',
        badge: 'bg-green-400',
        button: 'bg-green-400 hover:bg-green-500',
        accent: 'text-green-500'
      },
      {
        gradient: 'from-yellow-50 to-orange-50',
        badge: 'bg-yellow-400',
        button: 'bg-yellow-400 hover:bg-yellow-500',
        accent: 'text-yellow-600'
      },
      {
        gradient: 'from-teal-50 to-cyan-50',
        badge: 'bg-teal-400',
        button: 'bg-teal-400 hover:bg-teal-500',
        accent: 'text-teal-500'
      }
    ]
    
    // Use hash to select a color scheme
    const colorIndex = Math.abs(hash) % colorSchemes.length
    return colorSchemes[colorIndex]
  }

  const categories = [...new Set(products.map(p => p.category))]
  const filteredProducts = selectedCategory === "all" 
    ? products 
    : products.filter(p => p.category === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Brand not found</h1>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const colors = getBrandColors(brand.name)

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colors.gradient}`}>
      {/* Header */}
      <div className="container mx-auto px-6 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-black mb-4 sm:mb-6 leading-tight">
            {brand.name}
            <br />
            <span className="italic font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl">Collection</span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4">
            {brand.description}
          </p>
          <div className="w-full h-48 sm:h-64 md:h-80 lg:h-96 relative rounded-2xl overflow-hidden shadow-2xl mb-6 sm:mb-8 mx-4 sm:mx-0">
            <Image
              src={brand.image_url}
              alt={brand.name}
              fill
              className="object-cover"
              priority={brand.name.toLowerCase() === 'kiowa'}
              fetchPriority={brand.name.toLowerCase() === 'kiowa' ? "high" : "auto"}
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, (max-width: 1024px) 100vw, 100vw"
            />
          </div>
        </motion.div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap gap-2 sm:gap-4 justify-center mb-8 sm:mb-12 px-4"
          >
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              className={`text-xs sm:text-sm ${selectedCategory === "all" ? colors.button : ""}`}
              size="sm"
            >
              All Products
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={`text-xs sm:text-sm ${selectedCategory === category ? colors.button : ""}`}
                size="sm"
              >
                {category}
              </Button>
            ))}
          </motion.div>
        )}

        {/* Products Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="px-4 sm:px-0"
        >
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                >
                  <div 
                    className="group cursor-pointer transition-all duration-300 hover:scale-105"
                    onClick={() => {
                      setSelectedProduct(product)
                      setIsModalOpen(true)
                    }}
                    onMouseEnter={() => {
                      // Preload main product image and additional images on hover
                      if (product.thumbnail_url) {
                        const img = new window.Image()
                        img.src = product.thumbnail_url
                      }
                      if (product.additional_images && product.additional_images.length > 0) {
                        product.additional_images.forEach((src, index) => {
                          const img = new window.Image()
                          img.fetchPriority = index <= 1 ? 'high' : 'auto'
                          img.src = src
                        })
                      }
                    }}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                      <Image
                        src={product.thumbnail_url || '/images/placeholder.jpg'}
                        alt={product.name}
                        width={300}
                        height={533}
                        className={`w-full aspect-[9/16] object-cover transition-transform duration-500 ${!product.in_stock ? 'opacity-60' : ''}`}
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        priority={index < 8}
                        loading={index < 8 ? "eager" : "lazy"}
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                      />
                      {/* Out of Stock Overlay */}
                      {!product.in_stock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge variant="destructive" className="text-xs sm:text-sm font-bold">
                            Out of Stock
                          </Badge>
                        </div>
                      )}
                      {product.in_stock && (
                        <Button
                          size="sm"
                          className={`absolute bottom-2 sm:bottom-4 right-2 sm:right-4 ${colors.button} text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0 shadow-lg`}
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: Add to cart functionality
                            console.log('Add to cart:', product.id)
                          }}
                        >
                          <Plus className="w-3 h-3 sm:w-5 sm:h-5" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 sm:mt-4">
                      <h3 className="font-semibold text-black mb-1 sm:mb-2 text-xs sm:text-sm line-clamp-2">{product.name}</h3>
                      <p className={`font-bold text-sm sm:text-lg ${colors.accent}`}>
                        ₦{product.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-600 mb-4">No products found</h3>
              <p className="text-gray-500 text-sm sm:text-base px-4">
                {selectedCategory === "all" 
                  ? "This brand doesn't have any products yet." 
                  : `No products found in the ${selectedCategory} category.`}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedProduct(null)
        }}
        onAddToCart={(product) => {
          // TODO: Implement add to cart functionality
          console.log('Add to cart:', product.id)
        }}
      />
    </div>
  )
}