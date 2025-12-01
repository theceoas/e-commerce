'use client'

import { useState, useMemo } from 'react'
import { ProductCard } from './product-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Filter } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { type Product } from '@/lib/supabase'

const supabase = createClient()

interface ProductGridProps {
  products: Product[]
  onAddToCart: (product: Product) => void
  onToggleFavorite?: (productId: string) => void
  favorites?: string[]
}

export function ProductGrid({
  products,
  onAddToCart,
  onToggleFavorite,
  favorites = []
}: ProductGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'newest'>('newest')

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)))
    return cats.sort()
  }, [products])

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = !selectedCategory || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'price':
          return a.price - b.price
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

    return filtered
  }, [products, searchTerm, selectedCategory, sortBy])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search and Filters */}
      <div className="space-y-3 sm:space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="text-xs sm:text-sm"
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="text-xs sm:text-sm"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm text-muted-foreground">Sort by:</span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={sortBy === 'newest' ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy('newest')}
              className="text-xs sm:text-sm"
            >
              Newest
            </Button>
            <Button
              variant={sortBy === 'name' ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy('name')}
              className="text-xs sm:text-sm"
            >
              Name
            </Button>
            <Button
              variant={sortBy === 'price' ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy('price')}
              className="text-xs sm:text-sm"
            >
              Price
            </Button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.includes(product.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 sm:py-12">
          <p className="text-muted-foreground text-sm">No products found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}