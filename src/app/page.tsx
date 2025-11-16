"use client"

import { useState, useEffect } from "react"
import dynamic from 'next/dynamic'
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
  Search,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import Image from "next/image"
import { ProductGridSkeleton } from "@/components/product-skeleton"
import { BrandGridSkeleton } from "@/components/brand-skeleton"
import { useBrands, useFeaturedProducts, supabaseCache } from "@/hooks/useSupabaseCache"
import { useNavigationCache } from "@/hooks/useNavigationCache"
import { DevImageSpeed } from "@/components/dev-image-speed"
import { preloadImages } from "@/hooks/useImagePreloader"

// Lazy load the ProductModal component
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

import { useAuth } from "@/contexts/AuthContext"

// Utility function for generating section IDs
const getSectionId = (brandName: string) => {
  const lowerName = brandName.toLowerCase().replace(/\s+/g, '')
  return lowerName.replace(/[^a-z0-9]/g, '')
}

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
    title: "FavoriteThings",
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
            {/* Search Button */}
            <motion.button
              onClick={() => window.location.href = '/search'}
              className="w-12 h-12 bg-black rounded-full flex items-center justify-center hover:bg-black/80 transition-all duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Search Products"
            >
              <Search className="w-5 h-5 text-yellow-400" />
            </motion.button>
            
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
            <Link href="/search">
              <Button size="sm" variant="ghost" className="text-black hover:bg-black/10 p-2">
                <Search className="w-4 h-4" />
              </Button>
            </Link>
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
            className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4"
          >
            Three distinct brands. One unified vision of contemporary Nigerian fashion.
          </motion.p>

          {/* Search Button - Visible on all screen sizes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mb-8 sm:mb-12"
          >
            <Link href="/search">
              <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <Search className="w-5 h-5 mr-2" />
                Search Products
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12 max-w-5xl mx-auto px-4"
          >
            {loading ? (
              <BrandGridSkeleton count={3} />
            ) : (
              brands.filter(brand => brand.is_active).slice(0, 3).map((brand, index) => {
              const badgeColors = [
                "bg-yellow-400 text-black",
                "bg-red-400 text-white", 
                "bg-green-400 text-black"
              ]
              
              const scrollToSection = (sectionId: string) => {
                requestAnimationFrame(() => {
                  const element = document.getElementById(sectionId)
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' })
                  }
                })
              }

              // Map brand names to section IDs dynamically
              
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
                    priority={index === 0}
                    fetchPriority={index === 0 ? "high" : "auto"}
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
                // Find the first brand section to scroll to
                const firstBrand = brands.find(brand => brand.is_active)
                if (firstBrand) {
                  const sectionId = getSectionId(firstBrand.name)
                  const element = document.getElementById(sectionId)
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' })
                  }
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
  // Find brand dynamically by checking if it matches any of the expected patterns
  const kiowaData = brands.find(brand => {
    const name = brand.name.toLowerCase()
    return name === 'kiowa' || name.includes('kiowa')
  })
  
  const { data: featuredProductsData, loading, error } = useFeaturedProducts(kiowaData?.id || '')
  const featuredProducts = featuredProductsData || []

  // Preload product images when they're loaded
  useEffect(() => {
    if (featuredProducts.length > 0) {
      const imageUrls = featuredProducts
        .slice(0, 4) // Preload first 4 products
        .map(p => p.thumbnail_url)
        .filter(Boolean)
      
      if (imageUrls.length > 0) {
        preloadImages(imageUrls).catch(() => {})
      }
    }
  }, [featuredProducts])

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
            <ProductGridSkeleton count={4} />
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
                    onMouseEnter={() => {
                      // Preload main product image and additional images on hover
                      if (product.thumbnail_url) {
                        const img = new window.Image()
                        img.src = product.thumbnail_url
                      }
                      if (product.additional_images && product.additional_images.length > 0) {
                        product.additional_images.forEach((src: string, index: number) => {
                          const img = new window.Image()
                          img.fetchPriority = index <= 1 ? 'high' : 'auto'
                          img.src = src
                        })
                      }
                    }}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                       <Image
                         src={product.thumbnail_url || '/placeholder-product.jpg'}
                         alt={product.name}
                         width={300}
                         height={533}
                         className={`w-full aspect-[3/4] sm:aspect-[9/16] object-cover transition-transform duration-500 ${!product.in_stock ? 'opacity-60' : ''}`}
                         sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                         priority={index < 4}
                         loading={index < 4 ? "eager" : "lazy"}
                         placeholder="blur"
                         blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                       />
                       {product.has_active_discount && (
                         <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg z-10">
                           {product.discount_percentage ? `${product.discount_percentage}% OFF` : `₦${product.discount_amount?.toLocaleString()} OFF`}
                         </div>
                       )}
                       {!product.in_stock && (
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                           <Badge variant="destructive" className="text-xs font-bold">
                             Out of Stock
                           </Badge>
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
          ) : null}
        </motion.div>
      </div>
    </div>
  )
}

function OmegeFrame({ brands, onProductClick }: { brands: Brand[]; onProductClick: (product: any) => void }) {
  // Find brand dynamically by checking multiple patterns
  const omegeData = brands.find(brand => {
    const name = brand.name.toLowerCase()
    return name.includes('omoge') || name.includes('ify') || name === 'omogebyify'
  })
  
  const { data: featuredProductsData, loading, error } = useFeaturedProducts(omegeData?.id || '')
  const featuredProducts = featuredProductsData || []

  // Preload product images when they're loaded
  useEffect(() => {
    if (featuredProducts.length > 0) {
      const imageUrls = featuredProducts
        .slice(0, 4) // Preload first 4 products
        .map(p => p.thumbnail_url)
        .filter(Boolean)
      
      if (imageUrls.length > 0) {
        preloadImages(imageUrls).catch(() => {})
      }
    }
  }, [featuredProducts])

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
            <ProductGridSkeleton count={4} />
          ) : featuredProducts.length > 0 && (
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
                    onMouseEnter={() => {
                      // Preload main product image and additional images on hover
                      if (product.thumbnail_url) {
                        const img = new window.Image()
                        img.src = product.thumbnail_url
                      }
                      if (product.additional_images && product.additional_images.length > 0) {
                        product.additional_images.forEach((src: string, index: number) => {
                          const img = new window.Image()
                          img.fetchPriority = index <= 1 ? 'high' : 'auto'
                          img.src = src
                        })
                      }
                    }}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                       <Image
                         src={product.thumbnail_url || '/placeholder-product.jpg'}
                         alt={product.name}
                         width={300}
                         height={533}
                         className={`w-full aspect-[3/4] sm:aspect-[9/16] object-cover transition-transform duration-500 ${!product.in_stock ? 'opacity-60' : ''}`}
                         sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                         priority={index < 4}
                         loading={index < 4 ? "eager" : "lazy"}
                         placeholder="blur"
                         blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                       />
                       {product.has_active_discount && (
                         <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg z-10">
                           {product.discount_percentage ? `${product.discount_percentage}% OFF` : `₦${product.discount_amount?.toLocaleString()} OFF`}
                         </div>
                       )}
                       {!product.in_stock && (
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                           <Badge variant="destructive" className="text-xs font-bold">
                             Out of Stock
                           </Badge>
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
          )}
        </motion.div>
      </div>
    </div>
  )
}

function MiniMeFrame({ brands, onProductClick }: { brands: Brand[]; onProductClick: (product: any) => void }) {
  // Find brand dynamically
  const miniMeData = brands.find(brand => {
    const name = brand.name.toLowerCase()
    return name.includes('minime') || name === 'minime' || name.includes('mini me')
  })
  
  const { data: featuredProductsData, loading, error } = useFeaturedProducts(miniMeData?.id || '')
  const featuredProducts = featuredProductsData || []

  // Preload product images when they're loaded
  useEffect(() => {
    if (featuredProducts.length > 0) {
      const imageUrls = featuredProducts
        .slice(0, 4) // Preload first 4 products
        .map(p => p.thumbnail_url)
        .filter(Boolean)
      
      if (imageUrls.length > 0) {
        preloadImages(imageUrls).catch(() => {})
      }
    }
  }, [featuredProducts])

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
              <Image
                src={miniMeData.image_url}
                alt={`${miniMeData.name} Hero`}
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
            <ProductGridSkeleton count={4} />
          ) : featuredProducts.length > 0 && (
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
                    onMouseEnter={() => {
                      // Preload main product image and additional images on hover
                      if (product.thumbnail_url) {
                        const img = new window.Image()
                        img.src = product.thumbnail_url
                      }
                      if (product.additional_images && product.additional_images.length > 0) {
                        product.additional_images.forEach((src: string, index: number) => {
                          const img = new window.Image()
                          img.fetchPriority = index <= 1 ? 'high' : 'auto'
                          img.src = src
                        })
                      }
                    }}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                       <img
                         src={product.thumbnail_url}
                         alt={product.name}
                         className={`w-full aspect-[9/16] object-cover transition-transform duration-500 ${!product.in_stock ? 'opacity-60' : ''}`}
                         style={{ aspectRatio: '9/16' }}
                       />
                       {product.has_active_discount && (
                         <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg z-10">
                           {product.discount_percentage ? `${product.discount_percentage}% OFF` : `₦${product.discount_amount?.toLocaleString()} OFF`}
                         </div>
                       )}
                       {!product.in_stock && (
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                           <Badge variant="destructive" className="text-xs font-bold">
                             Out of Stock
                           </Badge>
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
          )}
        </motion.div>
      </div>
    </div>
  )
}

function OthersFrame({ brands, onProductClick }: { brands: Brand[]; onProductClick: (product: any) => void }) {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  // Use the first brand passed in (for dynamic rendering) - this will be the FavoriteThings brand
  const othersData = brands.length === 1 ? brands[0] : brands.find(brand => 
    brand.name.toLowerCase().includes('favoritethings') || brand.name.toLowerCase().includes('favorite')
  )

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      if (!othersData) {
        setLoading(false)
        return
      }
      
      
      try {
        // First, try to get featured products (including out of stock)
        let { data, error } = await supabase
          .from('products_with_discounts')
          .select('*')
          .eq('brand_id', othersData.id)
          .eq('featured', true)
          .limit(3)
          .order('created_at', { ascending: false })

        if (error) throw error
        
        
        // If no featured products, fall back to showing any products (including out of stock)
        if (!data || data.length === 0) {
          
          const fallbackResult = await supabase
            .from('products_with_discounts')
            .select('*')
            .eq('brand_id', othersData.id)
            .limit(3)
            .order('created_at', { ascending: false })
          
          if (fallbackResult.error) throw fallbackResult.error
          
          data = fallbackResult.data || []
        }
        
        setFeaturedProducts(data || [])
      } catch (error) {
        console.error('[OthersFrame] Error fetching products:', error)
        setFeaturedProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedProducts()
  }, [othersData])

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
            <ProductGridSkeleton count={4} />
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
                    onMouseEnter={() => {
                      // Preload main product image and additional images on hover
                      if (product.thumbnail_url) {
                        const img = new window.Image()
                        img.src = product.thumbnail_url
                      }
                      if (product.additional_images && product.additional_images.length > 0) {
                        product.additional_images.forEach((src: string, index: number) => {
                          const img = new window.Image()
                          img.fetchPriority = index <= 1 ? 'high' : 'auto'
                          img.src = src
                        })
                      }
                    }}
                  >
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        className={`w-full aspect-[9/16] object-cover transition-transform duration-500 ${!product.in_stock ? 'opacity-60' : ''}`}
                      />
                      {product.has_active_discount && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg z-10">
                          {product.discount_percentage ? `${product.discount_percentage}% OFF` : `₦${product.discount_amount?.toLocaleString()} OFF`}
                        </div>
                      )}
                      {!product.in_stock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                          <Badge variant="destructive" className="text-xs font-bold">
                            Out of Stock
                          </Badge>
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
          ) : null}
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
  const { data: brandsData, loading: brandsLoading } = useBrands()
  const brands = brandsData || []
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Handle cache clearing on navigation
  useNavigationCache()

  // Prefetch ProductModal chunk to avoid runtime chunk load errors
  useEffect(() => {
    import("@/components/product-modal")
  }, [])

  // Don't invalidate cache on page load - let it use cached data for faster loading
  // Cache will be invalidated naturally when TTL expires or on navigation

  useEffect(() => {
    // Preload critical product images when brands are loaded
    if (brands.length > 0 && !brandsLoading) {
      // Preload brand images
      const brandImages = brands
        .filter(brand => brand.is_active && brand.image_url)
        .slice(0, 3)
        .map(brand => brand.image_url)
      
      if (brandImages.length > 0) {
        preloadImages(brandImages).catch(() => {})
      }
    }
  }, [brands, brandsLoading])

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
    <div className="relative min-h-screen">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full bg-yellow-400 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <span className="text-yellow-400 font-bold text-sm">FT</span>
            </div>
            <span className="text-black font-bold text-lg">Favorite Things</span>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Search Button */}
            <Link href="/search">
              <Button size="sm" className="bg-black hover:bg-gray-800 text-yellow-400 p-2">
                <Search className="w-4 h-4" />
              </Button>
            </Link>
            
            {/* Login/Account Button */}
            <Button 
              size="sm" 
              onClick={handleAccountClick}
              className="bg-black hover:bg-gray-800 text-yellow-400 px-3 py-2"
            >
              <User className="w-4 h-4 mr-1" />
              {user ? 'Account' : 'Login'}
            </Button>
          </div>
        </div>
      </header>

      <FixedIdentityPanel onAccountClick={handleAccountClick} user={user} />

      {/* Main Content Area */}
      <div className="lg:ml-20 relative pt-16 lg:pt-0">
        {/* Welcome Section */}
        <section id="welcome" className="scroll-mt-20">
          <WelcomeFrame brands={brands} loading={brandsLoading} />
        </section>

        {/* Brand Sections - Dynamic rendering */}
        {!brandsLoading && brands.filter(brand => brand.is_active).map((brand) => {
          const sectionId = getSectionId(brand.name)
          const brandName = brand.name.toLowerCase()
          
          // Determine which frame component to use based on brand characteristics
          if (brandName.includes('kiowa') || brandName === 'kiowa') {
            return (
              <section key={brand.id} id={sectionId} className="scroll-mt-20">
                <KiowaFrame brands={brands} onProductClick={handleProductClick} />
              </section>
            )
          } else if (brandName.includes('omoge') || brandName.includes('ify')) {
            return (
              <section key={brand.id} id={sectionId} className="scroll-mt-20">
                <OmegeFrame brands={brands} onProductClick={handleProductClick} />
              </section>
            )
          } else if (brandName.includes('minime') || brandName.includes('mini me')) {
            return (
              <section key={brand.id} id={sectionId} className="scroll-mt-20">
                <MiniMeFrame brands={brands} onProductClick={handleProductClick} />
              </section>
            )
          } else {
            // For all other brands (including FavoriteThings), use OthersFrame but pass the specific brand
            return (
              <section key={brand.id} id={sectionId} className="scroll-mt-20">
                <OthersFrame brands={[brand]} onProductClick={handleProductClick} />
              </section>
            )
          }
        }).filter(Boolean)}

        {/* Footer Section */}
        <section id="footer" className="scroll-mt-20">
          <FooterFrame />
        </section>
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
