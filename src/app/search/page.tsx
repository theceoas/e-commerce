'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, ArrowLeft, Grid, List } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ProductGridSkeleton } from '@/components/product-skeleton'
import { useCart } from '@/contexts/CartContext'
import { toast } from 'sonner'

// Lazy load the ProductModal component
const ProductModal = dynamic(
  () => import('@/components/product-modal'),
  { 
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }
)

interface Product {
  id: string
  name: string
  description: string
  price: number
  thumbnail_url: string
  additional_images?: string[]
  in_stock: boolean
  brand_id?: string
  created_at?: string
  featured?: boolean
  discount_percentage?: number
  discount_amount?: number
  discount_start_date?: string
  discount_end_date?: string
  discount_active?: boolean
  discounted_price?: number
  has_active_discount?: boolean
  sizes?: Array<{
    size: string
    stock: number
  }>
}

interface Brand {
  id: string
  name: string
  image_url: string
  description: string
  display_order: number
  is_active: boolean
}

export default function SearchPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'price-low' | 'price-high'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  
  const router = useRouter()
  const { addToCart } = useCart()

  // Prefetch ProductModal chunk to avoid runtime load errors
  useEffect(() => {
    const prefetch = () => import('@/components/product-modal')
    prefetch().catch(() => {})
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Fetch products and brands in parallel (including out of stock products)
      const [productsResult, brandsResult] = await Promise.all([
        supabase
          .from('products_with_discounts')
          .select(`
            id, name, description, price, thumbnail_url, additional_images, 
            in_stock, brand_id, featured, created_at, sizes,
            discount_percentage, discount_amount, discount_start_date, 
            discount_end_date, discount_active, discounted_price, has_active_discount
          `)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('brands')
          .select('id, name, image_url, description, display_order, is_active')
          .eq('is_active', true)
          .order('display_order')
      ])

      if (productsResult.error) throw productsResult.error
      if (brandsResult.error) throw brandsResult.error

      setProducts(productsResult.data || [])
      setBrands(brandsResult.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBrand = selectedBrand === 'all' || product.brand_id === selectedBrand
    return matchesSearch && matchesBrand
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'price-low':
        const priceA = a.has_active_discount ? a.discounted_price || a.price : a.price
        const priceB = b.has_active_discount ? b.discounted_price || b.price : b.price
        return priceA - priceB
      case 'price-high':
        const priceA2 = a.has_active_discount ? a.discounted_price || a.price : a.price
        const priceB2 = b.has_active_discount ? b.discounted_price || b.price : b.price
        return priceB2 - priceA2
      case 'newest':
      default:
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    }
  })

  const getBrandName = (brandId?: string) => {
    if (!brandId) return 'Unknown Brand'
    const brand = brands.find(b => b.id === brandId)
    return brand?.name || 'Unknown Brand'
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setIsProductModalOpen(true)
  }

  const handleAddToCart = (product: Product) => {
    addToCart(product.id, 1)
    toast.success(`${product.name} added to cart`)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="h-8 bg-yellow-200 rounded w-48 animate-pulse mb-4"></div>
            <div className="h-4 bg-yellow-200 rounded w-64 animate-pulse"></div>
          </div>
          <ProductGridSkeleton count={12} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2 border-yellow-400 text-yellow-600 hover:bg-yellow-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Search Products</h1>
            <p className="text-gray-600 mt-1">Discover all our amazing products</p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm border-0 shadow-xl ring-1 ring-yellow-200">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-yellow-600" />
                <Input
                  placeholder="Search for products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm border-yellow-200 focus:border-yellow-400 focus:ring-yellow-400 bg-yellow-50/50"
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {/* Brand Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-yellow-600" />
                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                      <SelectTrigger className="w-[180px] border-yellow-200 bg-yellow-50/50">
                        <SelectValue placeholder="All Brands" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        {brands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Filter */}
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[180px] border-yellow-200 bg-yellow-50/50">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="name">Name A-Z</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'border-yellow-200 text-yellow-600 hover:bg-yellow-50'}`}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'border-yellow-200 text-yellow-600 hover:bg-yellow-50'}`}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
            {searchTerm && ` for "${searchTerm}"`}
            {selectedBrand !== 'all' && ` in ${getBrandName(selectedBrand)}`}
          </p>
        </div>

        {/* Products Grid/List */}
        {filteredProducts.length > 0 ? (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6"
              : "space-y-4"
          }>
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                {viewMode === 'grid' ? (
                  <Card 
                    className="group cursor-pointer transition-all duration-300 hover:shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden ring-1 ring-yellow-100 hover:ring-yellow-300"
                    onClick={() => handleProductClick(product)}
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
                    <CardContent className="p-0">
                      <div className="relative overflow-hidden">
                        <Image
                          src={product.thumbnail_url}
                          alt={product.name}
                          width={300}
                          height={400}
                          className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        
                        {/* Discount Badge */}
                        {product.has_active_discount && (
                          <Badge className="absolute top-2 left-2 bg-red-500 text-white">
                            {product.discount_percentage ? `${product.discount_percentage}% OFF` : `₦${product.discount_amount} OFF`}
                          </Badge>
                        )}

                        {/* Featured Badge */}
                        {product.featured && (
                          <Badge className="absolute top-2 right-2 bg-[#FFDC00] text-black">
                            Featured
                          </Badge>
                        )}

                        {/* Product Info Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                          <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="text-white/80 text-xs mb-2 line-clamp-1">
                            {getBrandName(product.brand_id)}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              {product.has_active_discount ? (
                                <>
                                  <span className="text-white font-bold text-sm">
                                    {formatPrice(product.discounted_price || product.price)}
                                  </span>
                                  <span className="text-white/60 text-xs line-through">
                                    {formatPrice(product.price)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-white font-bold text-sm">
                                  {formatPrice(product.price)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card 
                    className="cursor-pointer transition-all duration-300 hover:shadow-lg border-0 bg-white/90 backdrop-blur-sm ring-1 ring-yellow-100 hover:ring-yellow-300"
                    onClick={() => handleProductClick(product)}
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
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="relative w-24 h-24 flex-shrink-0">
                          <Image
                            src={product.thumbnail_url}
                            alt={product.name}
                            fill
                            className="object-cover rounded-lg"
                          />
                          {product.has_active_discount && (
                            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                              {product.discount_percentage ? `${product.discount_percentage}%` : `₦${product.discount_amount}`}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {product.name}
                              </h3>
                              <p className="text-sm text-gray-600 mb-1">
                                {getBrandName(product.brand_id)}
                              </p>
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {product.description}
                              </p>
                            </div>
                            <div className="flex flex-col items-end ml-4">
                              {product.has_active_discount ? (
                                <>
                                  <span className="font-bold text-gray-900">
                                    {formatPrice(product.discounted_price || product.price)}
                                  </span>
                                  <span className="text-sm text-gray-500 line-through">
                                    {formatPrice(product.price)}
                                  </span>
                                </>
                              ) : (
                                <span className="font-bold text-gray-900">
                                  {formatPrice(product.price)}
                                </span>
                              )}
                              {product.featured && (
                                <Badge className="mt-1 bg-[#FFDC00] text-black text-xs">
                                  Featured
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              <Button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedBrand('all')
                }}
                variant="outline"
                className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false)
            setSelectedProduct(null)
          }}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  )
}