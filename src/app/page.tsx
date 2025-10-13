"use client"

import { useState, useEffect, Suspense, lazy } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  ShoppingBag,
  Home,
  Heart,
  ArrowRight,
  Mail,
  Phone,
  Instagram,
  Twitter,
  Facebook,
  Plus,
  User,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import Image from "next/image"

// Lazy load the ProductModal component
const ProductModal = lazy(() => import("@/components/product-modal").then(module => ({ default: module.ProductModal })))

import { useAuth } from "@/contexts/AuthContext"

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
  in_stock: boolean
  brand_id: string
  featured: boolean
  created_at: string
  discount_percentage?: number
  discount_amount?: number
  discount_start_date?: string
  discount_end_date?: string
  discount_active?: boolean
  discounted_price?: number
  has_active_discount?: boolean
}

interface FallbackProduct {
  name: string
  price: string
  image: string
  discount_percentage?: number
  discount_amount?: number
  discount_start_date?: string
  discount_end_date?: string
  discount_active?: boolean
  discounted_price?: number
  has_active_discount?: boolean
}

const frames = [
  {
    id: "welcome",
    title: "Welcome",
    component: "WelcomeFrame",
  },
  {
    id: "kiowa",
    title: "Kiowa",
    component: "KiowaFrame",
  },
  {
    id: "omege",
    title: "OmogeByIfy",
    component: "OmegeFrame",
  },
  {
    id: "minime",
    title: "MiniMe",
    component: "MiniMeFrame",
  },
  {
    id: "others",
    title: "Others",
    component: "OthersFrame",
  },
  {
    id: "footer",
    title: "Connect",
    component: "FooterFrame",
  },
]

function FixedIdentityPanel({ onAccountClick, user }: { onAccountClick: () => void; user: any }) {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }
  return (
    <>
      {/* Desktop Fixed Panel */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-20 bg-yellow-400 z-50 shadow-2xl">
        <div className="flex flex-col items-center h-full py-8">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-8 cursor-pointer"
          >
            <span className="text-yellow-400 font-bold text-lg">FT</span>
          </motion.div>

          {/* Navigation Dots */}
          <div className="flex flex-col space-y-4 mb-8">
            {frames.map((frame, index) => (
              <motion.button
                key={frame.id}
                onClick={() => scrollToSection(frame.id)}
                className="w-3 h-3 rounded-full transition-all duration-300 bg-black/30 hover:bg-black/60"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col space-y-4 mt-auto">
            {/* Account Button */}
            <motion.button
              onClick={onAccountClick}
              className="w-12 h-12 bg-black rounded-full flex items-center justify-center hover:bg-black/80 transition-all duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={user ? "Account" : "Login"}
            >
              {user ? (
                <User className="w-5 h-5 text-yellow-400" />
              ) : (
                <User className="w-5 h-5 text-yellow-400" />
              )}
            </motion.button>
            <Button size="sm" variant="ghost" className="text-black hover:bg-black/10 p-2">
              <Home className="w-5 h-5" />
            </Button>
            <Button size="sm" variant="ghost" className="text-black hover:bg-black/10 p-2">
              <ShoppingBag className="w-5 h-5" />
            </Button>
            <Button size="sm" variant="ghost" className="text-black hover:bg-black/10 p-2">
              <Heart className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Panel */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-yellow-400 z-50 shadow-lg">
        <div className="flex items-center justify-between h-full px-6">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="w-10 h-10 bg-black rounded-full flex items-center justify-center cursor-pointer"
          >
            <span className="text-yellow-400 font-bold">FT</span>
          </motion.div>

          <div className="text-black font-bold text-lg">Favorite Things</div>

          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={onAccountClick}
              className="text-black hover:bg-black/10 px-3 py-2 flex items-center gap-1"
            >
              {user ? (
                <>
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Account</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Login</span>
                </>
              )}
            </Button>
            <Button size="sm" variant="ghost" className="text-black hover:bg-black/10 p-2">
              <ShoppingBag className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Dots */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
          <div className="flex space-x-2 bg-black/80 rounded-full px-4 py-2 mt-2">
            {frames.map((frame, index) => (
              <motion.button
                key={frame.id}
                onClick={() => scrollToSection(frame.id)}
                className="w-2 h-2 rounded-full transition-all duration-300 bg-white/50"
                whileTap={{ scale: 0.8 }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function WelcomeFrame({ brands, loading }: { brands: Brand[]; loading?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white relative py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-black mb-4 sm:mb-6 leading-tight">
            Discover Nigeria's
            <br />
            <span className="text-yellow-500">Favorite Fashion</span>
            <br />
            Trio
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4"
          >
            Three distinct brands. One unified vision of contemporary Nigerian fashion.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12 max-w-5xl mx-auto px-4"
          >
            {loading ? (
              // Show loading skeletons instead of empty cards
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="relative group">
                  <div className="w-full h-64 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="absolute top-4 left-4 w-16 h-6 bg-gray-300 rounded animate-pulse"></div>
                </div>
              ))
            ) : (
              brands.filter(brand => brand.is_active).slice(0, 3).map((brand, index) => {
              const badgeColors = [
                "bg-yellow-400 text-black",
                "bg-red-400 text-white", 
                "bg-green-400 text-black"
              ]
              
              const scrollToSection = (sectionId: string) => {
                const element = document.getElementById(sectionId)
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                }
              }

              // Map brand names to section IDs
              const getSectionId = (brandName: string) => {
                const lowerName = brandName.toLowerCase()
                
                if (lowerName === 'kiowa') return 'kiowa'
                if (lowerName.includes('omoge') || lowerName.includes('ify')) return 'omege'
                if (lowerName.includes('minime') || lowerName === 'minime') return 'minime'
                
                return lowerName
              }
              
              return (
                <motion.div 
                  key={brand.id} 
                  className="relative group cursor-pointer"
                  onClick={() => scrollToSection(getSectionId(brand.name))}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Image
                    src={brand.image_url}
                    alt={`${brand.name} Preview`}
                    width={400}
                    height={256}
                    className="w-full h-48 sm:h-56 md:h-64 object-cover rounded-lg shadow-lg group-hover:shadow-2xl transition-all duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all duration-300 flex items-center justify-center">
                    <span className="text-white font-semibold text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Explore {brand.name}
                    </span>
                  </div>
                  <Badge className={`absolute top-4 left-4 ${badgeColors[index % badgeColors.length]}`}>
                    {brand.name}
                  </Badge>
                </motion.div>
              )
            })
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="px-4"
          >
            <Button
              size="lg"
              className="bg-black text-white hover:bg-yellow-400 hover:text-black transition-all duration-300 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full"
              onClick={() => {
                const element = document.getElementById('kiowa')
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            >
              Explore Our Brands
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-32 h-32 bg-yellow-400 rounded-full" />
        <div className="absolute bottom-32 right-32 w-24 h-24 bg-black rounded-full" />
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-yellow-400 rounded-full" />
      </div>
    </div>
  )
}

function KiowaFrame({ brands, onProductClick }: { brands: Brand[]; onProductClick: (product: any) => void }) {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  const kiowaData = brands.find(brand => brand.name.toLowerCase() === 'kiowa')

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      if (!kiowaData) return
      
      try {
        const { data, error } = await supabase
          .from('products_with_discounts')
          .select('*')
          .eq('brand_id', kiowaData.id)
          .eq('featured', true)
          .eq('in_stock', true)
          .limit(3)
          .order('created_at', { ascending: false })

        if (error) throw error
        setFeaturedProducts(data || [])
      } catch (error) {
        console.error('Error fetching featured products:', error)
        setFeaturedProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedProducts()
  }, [kiowaData])

  // Fallback hardcoded products
  const fallbackProducts = [
    {
      name: "Structured Blazer",
      price: "₦45,000",
      image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=300&h=400&fit=crop&crop=center",
    },
    { name: "Statement Dress", price: "₦38,000", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&h=400&fit=crop&crop=center" },
    { name: "Designer Bag", price: "₦32,000", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=400&fit=crop&crop=center" },
  ]

  const displayProducts = featuredProducts.length > 0 ? featuredProducts : fallbackProducts

  return (
    <div className="min-h-screen flex items-center bg-gradient-to-br from-amber-50 to-orange-50 relative py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }}>
            <Badge className="bg-yellow-400 text-black mb-4 sm:mb-6 px-3 sm:px-4 py-1 sm:py-2 text-base sm:text-lg">
              {kiowaData?.name || 'Kiowa'}
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 sm:mb-6 leading-tight">
              Bold &
              <br />
              <span className="italic font-serif">Beautiful</span>
            </h2>
            <blockquote className="text-lg sm:text-xl lg:text-2xl italic text-gray-700 mb-4 sm:mb-6 font-serif">
              "Confidence is the best accessory."
            </blockquote>
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-6 sm:mb-8 leading-relaxed max-w-lg">
              {kiowaData?.description || 'For the woman who commands attention through effortless confidence and modern sophistication.'}
            </p>
            <Link href={`/brands/${kiowaData?.name.toLowerCase().replace(/\s+/g, '-') || 'kiowa'}`}>
              <Button
                size="lg"
                className="bg-yellow-400 text-black hover:bg-black hover:text-white transition-all duration-300 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg"
              >
                View Collection
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            {kiowaData?.image_url ? (
              <Image
                src={kiowaData.image_url}
                alt={`${kiowaData.name} Hero`}
                width={800}
                height={500}
                className="w-full h-64 sm:h-80 lg:h-96 xl:h-[500px] object-cover rounded-2xl shadow-2xl"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 800px"
              />
            ) : (
              <div className="w-full h-64 sm:h-80 lg:h-96 xl:h-[500px] bg-gray-200 rounded-2xl shadow-2xl animate-pulse"></div>
            )}
          </motion.div>
        </div>

        {/* Featured Products */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 sm:mt-16"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-black mb-6 sm:mb-8 text-center">Featured Pieces</h3>
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                  className="group"
                >
                  <div 
                    className="cursor-pointer transition-all duration-300 hover:scale-105"
                    onClick={() => onProductClick(product)}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        className="w-full aspect-[9/16] object-cover transition-transform duration-500"
                      />
                      {product.has_active_discount && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg">
                          {product.discount_percentage ? `${product.discount_percentage}% OFF` : `₦${product.discount_amount?.toLocaleString()} OFF`}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <h3 className="font-semibold text-black mb-2 text-sm sm:text-base line-clamp-2">{product.name}</h3>
                      <div className="space-y-1">
                        {product.has_active_discount ? (
                          <>
                            <p className="text-yellow-600 font-bold text-base sm:text-lg">₦{product.discounted_price?.toLocaleString()}</p>
                            <p className="text-gray-500 line-through text-xs sm:text-sm">₦{product.price.toLocaleString()}</p>
                            <p className="text-green-600 text-xs font-medium">
                              You save ₦{((product.price - (product.discounted_price || 0))).toLocaleString()}
                            </p>
                          </>
                        ) : (
                          <p className="text-yellow-600 font-bold text-base sm:text-lg">₦{product.price.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {fallbackProducts.map((product, index) => (
                <motion.div
                  key={product.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                  className="group"
                >
                  <div 
                    className="cursor-pointer transition-all duration-300 hover:scale-105"
                    onClick={() => {
                      onProductClick({
                        id: product.name.toLowerCase().replace(/\s+/g, '-'),
                        name: product.name,
                        price: parseInt(product.price.replace(/[₦,]/g, '')),
                        thumbnail_url: product.image,
                        description: `Beautiful ${product.name} from Kiowa collection`,
                        in_stock: true,
                        additional_images: []
                      })
                    }}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full aspect-[9/16] object-cover transition-transform duration-500"
                      />
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <h3 className="font-semibold text-black mb-2 text-sm sm:text-base line-clamp-2">{product.name}</h3>
                      <p className="text-yellow-600 font-bold text-base sm:text-lg">{product.price}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function OmegeFrame({ brands, onProductClick }: { brands: Brand[]; onProductClick: (product: any) => void }) {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  const omegeData = brands.find(brand => 
    brand.name.toLowerCase().includes('omogebyify') || 
    brand.name.toLowerCase().includes('omoge')
  )

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      if (!omegeData) return
      
      try {
        const { data, error } = await supabase
          .from('products_with_discounts')
          .select('*')
          .eq('brand_id', omegeData.id)
          .eq('featured', true)
          .eq('in_stock', true)
          .limit(3)
          .order('created_at', { ascending: false })

        if (error) throw error
        setFeaturedProducts(data || [])
      } catch (error) {
        console.error('Error fetching featured products:', error)
        setFeaturedProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedProducts()
  }, [omegeData])

  // Fallback hardcoded products
  const fallbackProducts = [
    { name: "Silk Blouse", price: "₦42,000", image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=300&h=400&fit=crop&crop=center" },
    { name: "Midi Skirt", price: "₦35,000", image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=300&h=400&fit=crop&crop=center" },
    {
      name: "Pearl Accessories",
      price: "₦18,000",
      image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=400&fit=crop&crop=center",
    },
  ]

  const displayProducts = featuredProducts.length > 0 ? featuredProducts : fallbackProducts

  return (
    <div className="min-h-screen flex items-center bg-gradient-to-br from-red-50 to-pink-50 relative py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            className="order-2 lg:order-1 relative"
          >
            {omegeData?.image_url ? (
              <Image
                src={omegeData.image_url}
                alt={`${omegeData.name} Hero`}
                width={800}
                height={500}
                className="w-full h-64 sm:h-80 lg:h-96 xl:h-[500px] object-cover rounded-2xl shadow-2xl"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 800px"
              />
            ) : (
              <div className="w-full h-64 sm:h-80 lg:h-96 xl:h-[500px] bg-gray-200 rounded-2xl shadow-2xl animate-pulse"></div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.2 }}>
            <Badge className="bg-red-400 text-white mb-4 sm:mb-6 px-3 sm:px-4 py-1 sm:py-2 text-base sm:text-lg">
              {omegeData?.name || 'OmogeByIfy'}
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 sm:mb-6 leading-tight">
              Elegant &
              <br />
              <span className="italic font-serif">Timeless</span>
            </h2>
            <blockquote className="text-lg sm:text-xl lg:text-2xl italic text-gray-700 mb-4 sm:mb-6 font-serif">
              "Grace never goes out of style."
            </blockquote>
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-6 sm:mb-8 leading-relaxed max-w-lg">
              {omegeData?.description || 'Timeless pieces that blend classic style with contemporary flair for the sophisticated woman.'}
            </p>
            <Link href={`/brands/${omegeData?.name.toLowerCase().replace(/\s+/g, '-') || 'omogebyify'}`}>
              <Button
                size="lg"
                className="bg-red-400 text-white hover:bg-black hover:text-white transition-all duration-300 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg"
              >
                View Collection
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Featured Products */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 sm:mt-16"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-black mb-6 sm:mb-8 text-center">Featured Pieces</h3>
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400"></div>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                  className="group"
                >
                  <div 
                    className="cursor-pointer transition-all duration-300 hover:scale-105"
                    onClick={() => onProductClick(product)}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                       <img
                         src={product.thumbnail_url}
                         alt={product.name}
                         className="w-full aspect-[3/4] sm:aspect-[9/16] object-cover transition-transform duration-500"
                         style={{ aspectRatio: '9/16' }}
                       />
                       {product.has_active_discount && (
                         <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg">
                           {product.discount_percentage ? `${product.discount_percentage}% OFF` : `₦${product.discount_amount?.toLocaleString()} OFF`}
                         </div>
                       )}
                     </div>
                    <div className="mt-4">
                      <h3 className="font-semibold text-black mb-2 text-sm">{product.name}</h3>
                      <div className="space-y-1">
                        {product.has_active_discount ? (
                          <>
                            <p className="text-red-600 font-bold text-lg">₦{product.discounted_price?.toLocaleString()}</p>
                            <p className="text-gray-500 line-through text-sm">₦{product.price.toLocaleString()}</p>
                            <p className="text-green-600 text-xs font-medium">
                              You save ₦{((product.price - (product.discounted_price || 0))).toLocaleString()}
                            </p>
                          </>
                        ) : (
                          <p className="text-red-600 font-bold text-lg">₦{product.price.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {fallbackProducts.map((product, index) => (
                <motion.div
                  key={product.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                  className="group"
                >
                  <div 
                    className="cursor-pointer transition-all duration-300 hover:scale-105"
                    onClick={() => {
                      onProductClick({
                        id: product.name.toLowerCase().replace(/\s+/g, '-'),
                        name: product.name,
                        price: parseInt(product.price.replace(/[₦,]/g, '')),
                        thumbnail_url: product.image,
                        description: `Elegant ${product.name} from OmogeByIfy collection`,
                        in_stock: true,
                        additional_images: []
                      })
                    }}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                       <img
                         src={product.image}
                         alt={product.name}
                         className="w-full aspect-[3/4] sm:aspect-[9/16] object-cover transition-transform duration-500"
                         style={{ aspectRatio: '9/16' }}
                       />
                     </div>
                    <div className="mt-4">
                      <h3 className="font-semibold text-black mb-2 text-sm">{product.name}</h3>
                      <p className="text-red-600 font-bold text-lg">{product.price}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function MiniMeFrame({ brands, onProductClick }: { brands: Brand[]; onProductClick: (product: any) => void }) {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  const miniMeData = brands.find(brand => 
    brand.name.toLowerCase().includes('minime')
  )

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      if (!miniMeData) return
      
      try {
        const { data, error } = await supabase
          .from('products_with_discounts')
          .select('*')
          .eq('brand_id', miniMeData.id)
          .eq('featured', true)
          .eq('in_stock', true)
          .limit(3)
          .order('created_at', { ascending: false })

        if (error) throw error
        setFeaturedProducts(data || [])
      } catch (error) {
        console.error('Error fetching featured products:', error)
        setFeaturedProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedProducts()
  }, [miniMeData])

  // Fallback hardcoded products
  const fallbackProducts = [
    { name: "Kids Dress", price: "₦25,000", image: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=300&h=400&fit=crop&crop=center" },
    { name: "Baby Romper", price: "₦18,000", image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=300&h=400&fit=crop&crop=center" },
    { name: "Toddler Set", price: "₦32,000", image: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=300&h=400&fit=crop&crop=center" },
  ]

  const displayProducts = featuredProducts.length > 0 ? featuredProducts : fallbackProducts

  return (
    <div className="min-h-screen flex items-center bg-gradient-to-br from-yellow-50 to-orange-50 relative py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }}>
            <Badge className="bg-yellow-400 text-black mb-4 sm:mb-6 px-3 sm:px-4 py-1 sm:py-2 text-base sm:text-lg">
              {miniMeData?.name || 'MiniMe'}
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 sm:mb-6 leading-tight">
              Little Ones,
              <br />
              <span className="italic font-serif">Big Style</span>
            </h2>
            <blockquote className="text-lg sm:text-xl lg:text-2xl italic text-gray-700 mb-4 sm:mb-6 font-serif">
              "Fashion for the next generation."
            </blockquote>
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-6 sm:mb-8 leading-relaxed max-w-lg">
              {miniMeData?.description || 'Adorable and comfortable clothing designed for children who love to express their unique style.'}
            </p>
            <Link href={`/brands/${miniMeData?.name.toLowerCase().replace(/\s+/g, '-') || 'minime'}`}>
              <Button
                size="lg"
                className="bg-yellow-400 text-black hover:bg-black hover:text-white transition-all duration-300 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg"
              >
                View Collection
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            {miniMeData?.image_url ? (
              <img
                src={miniMeData.image_url}
                alt={`${miniMeData.name} Hero`}
                className="w-full h-64 sm:h-80 lg:h-96 xl:h-[500px] object-cover rounded-2xl shadow-2xl"
              />
            ) : (
              <div className="w-full h-64 sm:h-80 lg:h-96 xl:h-[500px] bg-gray-200 rounded-2xl shadow-2xl animate-pulse"></div>
            )}
          </motion.div>
        </div>

        {/* Featured Products */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 sm:mt-16"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-black mb-6 sm:mb-8 text-center">Featured Pieces</h3>
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                >
                  <div 
                    className="group cursor-pointer transition-all duration-300 hover:scale-105"
                    onClick={() => onProductClick(product)}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                       <img
                         src={product.thumbnail_url}
                         alt={product.name}
                         className="w-full aspect-[9/16] object-cover transition-transform duration-500"
                         style={{ aspectRatio: '9/16' }}
                       />
                       {product.has_active_discount && (
                         <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg">
                           {product.discount_percentage ? `${product.discount_percentage}% OFF` : `₦${product.discount_amount?.toLocaleString()} OFF`}
                         </div>
                       )}
                     </div>
                    <div className="mt-4">
                      <h3 className="font-semibold text-black mb-2 text-sm">{product.name}</h3>
                      <div className="space-y-1">
                        {product.has_active_discount ? (
                          <>
                            <p className="text-green-600 font-bold text-lg">₦{product.discounted_price?.toLocaleString()}</p>
                            <p className="text-gray-500 line-through text-sm">₦{product.price.toLocaleString()}</p>
                            <p className="text-green-600 text-xs font-medium">
                              You save ₦{((product.price - (product.discounted_price || 0))).toLocaleString()}
                            </p>
                          </>
                        ) : (
                          <p className="text-green-600 font-bold text-lg">₦{product.price.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {fallbackProducts.map((product, index) => (
                <motion.div
                  key={product.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                >
                  <div 
                    className="group cursor-pointer transition-all duration-300 hover:scale-105"
                    onClick={() => {
                      onProductClick({
                        id: product.name.toLowerCase().replace(/\s+/g, '-'),
                        name: product.name,
                        price: parseInt(product.price.replace(/[₦,]/g, '')),
                        thumbnail_url: product.image,
                        description: `Adorable ${product.name} from MiniMe collection`,
                        in_stock: true,
                        additional_images: []
                      })
                    }}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                       <img
                         src={product.image}
                         alt={product.name}
                         className="w-full aspect-[9/16] object-cover transition-transform duration-500"
                         style={{ aspectRatio: '9/16' }}
                       />
                     </div>
                    <div className="mt-4">
                      <h3 className="font-semibold text-black mb-2 text-sm">{product.name}</h3>
                      <p className="text-green-600 font-bold text-lg">{product.price}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function OthersFrame({ brands, onProductClick }: { brands: Brand[]; onProductClick: (product: any) => void }) {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  const othersData = brands.find(brand => 
    brand.name.toLowerCase().includes('others')
  )

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      if (!othersData) return
      
      try {
        const { data, error } = await supabase
          .from('products_with_discounts')
          .select('*')
          .eq('brand_id', othersData.id)
          .eq('featured', true)
          .eq('in_stock', true)
          .limit(3)
          .order('created_at', { ascending: false })

        if (error) throw error
        setFeaturedProducts(data || [])
      } catch (error) {
        console.error('Error fetching featured products:', error)
        setFeaturedProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedProducts()
  }, [othersData])

  // Fallback hardcoded products
  const fallbackProducts = [
    { name: "Statement Necklace", price: "₦15,000", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=400&fit=crop&crop=center" },
    { name: "Designer Bag", price: "₦45,000", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=400&fit=crop&crop=center" },
    { name: "Silk Scarf", price: "₦12,000", image: "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=300&h=400&fit=crop&crop=center" },
  ]

  const displayProducts = featuredProducts.length > 0 ? featuredProducts : fallbackProducts

  return (
    <div className="min-h-screen flex items-center bg-gradient-to-br from-purple-50 to-indigo-50 relative py-12 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            className="order-2 lg:order-1 relative"
          >
            {othersData?.image_url ? (
              <img
                src={othersData.image_url}
                alt={`${othersData.name} Hero`}
                className="w-full h-64 sm:h-80 lg:h-96 xl:h-[500px] object-cover rounded-2xl shadow-2xl"
              />
            ) : (
              <div className="w-full h-64 sm:h-80 lg:h-96 xl:h-[500px] bg-gray-200 rounded-2xl shadow-2xl animate-pulse"></div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.2 }}>
            <Badge className="bg-purple-400 text-white mb-4 sm:mb-6 px-3 sm:px-4 py-1 sm:py-2 text-base sm:text-lg">
              {othersData?.name || 'Others'}
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4 sm:mb-6 leading-tight">
              Unique &
              <br />
              <span className="italic font-serif">Curated</span>
            </h2>
            <blockquote className="text-lg sm:text-xl lg:text-2xl italic text-gray-700 mb-4 sm:mb-6 font-serif">
              "Discover the extraordinary."
            </blockquote>
            <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-6 sm:mb-8 leading-relaxed max-w-lg">
              {othersData?.description || 'A carefully curated selection of unique pieces and accessories that complete your perfect look.'}
            </p>
            <Link href={`/brands/${othersData?.name.toLowerCase().replace(/\s+/g, '-') || 'others'}`}>
              <Button
                size="lg"
                className="bg-purple-400 text-white hover:bg-black hover:text-white transition-all duration-300 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg"
              >
                View Collection
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Featured Products */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 sm:mt-16"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-black mb-6 sm:mb-8 text-center">Featured Pieces</h3>
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                  className="group"
                >
                  <div 
                    className="cursor-pointer transition-all duration-300 hover:scale-105"
                    onClick={() => onProductClick(product)}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        className="w-full aspect-[9/16] object-cover transition-transform duration-500"
                      />
                      {product.has_active_discount && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg">
                          {product.discount_percentage ? `${product.discount_percentage}% OFF` : `₦${product.discount_amount?.toLocaleString()} OFF`}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <h3 className="font-semibold text-black mb-2 text-sm sm:text-base line-clamp-2">{product.name}</h3>
                      <div className="space-y-1">
                        {product.has_active_discount ? (
                          <>
                            <p className="text-purple-600 font-bold text-base sm:text-lg">₦{product.discounted_price?.toLocaleString()}</p>
                            <p className="text-gray-500 line-through text-xs sm:text-sm">₦{product.price.toLocaleString()}</p>
                            <p className="text-green-600 text-xs font-medium">
                              You save ₦{((product.price - (product.discounted_price || 0))).toLocaleString()}
                            </p>
                          </>
                        ) : (
                          <p className="text-purple-600 font-bold text-base sm:text-lg">₦{product.price.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {fallbackProducts.map((product, index) => (
                <motion.div
                  key={product.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                  className="group"
                >
                  <div 
                    className="cursor-pointer transition-all duration-300 hover:scale-105"
                    onClick={() => {
                      onProductClick({
                        id: product.name.toLowerCase().replace(/\s+/g, '-'),
                        name: product.name,
                        price: parseInt(product.price.replace(/[₦,]/g, '')),
                        thumbnail_url: product.image,
                        description: `Unique ${product.name} from Others collection`,
                        in_stock: true,
                        additional_images: []
                      })
                    }}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full aspect-[9/16] object-cover transition-transform duration-500"
                      />
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <h3 className="font-semibold text-black mb-2 text-sm sm:text-base line-clamp-2">{product.name}</h3>
                      <p className="text-purple-600 font-bold text-base sm:text-lg">{product.price}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}



function FooterFrame() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black to-gray-900 text-white py-20">
      <div className="container mx-auto px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-8">
            <span className="text-black font-bold text-2xl">FT</span>
          </div>

          {/* Contact & Social */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <div className="space-y-2 text-gray-300">
                <div className="flex items-center justify-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>+234 809 990 0228</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>support@favoritethingslifestyle.com</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
              <div className="flex justify-center">
                <a 
                  href="https://www.instagram.com/favoritethingsngr?igsh=cmNvaDlhMzY0aGd4"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:text-yellow-400 hover:bg-white/10 rounded-full"
                  >
                    <Instagram className="w-5 h-5 mr-2" />
                    Follow us on Instagram
                  </Button>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <p className="text-gray-400">© 2014 Favorite Things. All rights reserved. Crafted with love in Nigeria.</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user, loading } = useAuth()
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandsLoading, setBrandsLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)


  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      setBrandsLoading(true)
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error
      setBrands(data || [])
    } catch (error) {
      console.error('Error fetching brands:', error)
    } finally {
      setBrandsLoading(false)
    }
  }

  const handleProductClick = (product: any) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleAccountClick = () => {
    if (user) {
      // User is logged in, redirect based on role
      if (user.role === 'admin') {
        window.location.href = '/admin'
      } else {
        // For customers, redirect to account page
        window.location.href = '/account'
      }
    } else {
      // User is not logged in, redirect to auth page
      window.location.href = '/auth'
    }
  }

  return (
    <div className="relative min-h-screen scroll-smooth">
      <FixedIdentityPanel onAccountClick={handleAccountClick} user={user} />

      {/* Main Content Area */}
      <div className="lg:ml-20 relative pt-16 lg:pt-0">
        {/* Welcome Section */}
        <section id="welcome" className="scroll-mt-20">
          <WelcomeFrame brands={brands} loading={brandsLoading} />
        </section>

        {/* Kiowa Section */}
        {!brandsLoading && brands.some(brand => brand.name.toLowerCase() === 'kiowa') && (
          <section id="kiowa" className="scroll-mt-20">
            <KiowaFrame brands={brands} onProductClick={handleProductClick} />
          </section>
        )}

        {/* Omege Section */}
        {!brandsLoading && brands.some(brand => 
          brand.name.toLowerCase().includes('omogebyify') || 
          brand.name.toLowerCase().includes('omoge')
        ) && (
          <section id="omege" className="scroll-mt-20">
            <OmegeFrame brands={brands} onProductClick={handleProductClick} />
          </section>
        )}

        {/* MiniMe Section */}
        {!brandsLoading && brands.some(brand => brand.name.toLowerCase().includes('minime')) && (
          <section id="minime" className="scroll-mt-20">
            <MiniMeFrame brands={brands} onProductClick={handleProductClick} />
          </section>
        )}

        {/* Others Section */}
        {!brandsLoading && (
          <section id="others" className="scroll-mt-20">
            <OthersFrame brands={brands} onProductClick={handleProductClick} />
          </section>
        )}

        {/* Footer Section */}
        <section id="footer" className="scroll-mt-20">
          <FooterFrame />
        </section>
      </div>

      {/* Product Modal */}
      <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>}>
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
      </Suspense>


    </div>
  )
}
