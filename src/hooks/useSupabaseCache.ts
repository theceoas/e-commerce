'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

class SupabaseCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Invalidate all keys matching a pattern
  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

const cache = new SupabaseCache()

export function useSupabaseCache<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: {
    ttl?: number
    enabled?: boolean
    refetchOnMount?: boolean
  } = {}
) {
  const { ttl = 5 * 60 * 1000, enabled = true, refetchOnMount = false } = options
  
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return

    try {
      setLoading(true)
      setError(null)

      // Check cache first unless forcing refresh
      if (!forceRefresh) {
        const cachedData = cache.get<T>(key)
        if (cachedData) {
          setData(cachedData)
          setLoading(false)
          return cachedData
        }
      }

      // Fetch fresh data
      const result = await queryFn()
      
      // Cache the result
      cache.set(key, result, ttl)
      setData(result)
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      console.error(`Cache fetch error for key "${key}":`, error)
    } finally {
      setLoading(false)
    }
  }, [key, queryFn, ttl, enabled])

  const refetch = useCallback(() => fetchData(true), [fetchData])

  const invalidate = useCallback(() => {
    cache.invalidate(key)
  }, [key])

  useEffect(() => {
    if (refetchOnMount || !cache.get(key)) {
      fetchData()
    } else {
      // Use cached data immediately
      const cachedData = cache.get<T>(key)
      if (cachedData) {
        setData(cachedData)
        setLoading(false)
      }
    }
  }, [key, fetchData, refetchOnMount])

  return {
    data,
    loading,
    error,
    refetch,
    invalidate
  }
}

// Specific hooks for common queries
export function useBrands() {
  return useSupabaseCache(
    'brands',
    async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error
      return data || []
    },
    { ttl: 10 * 60 * 1000 } // 10 minutes for brands
  )
}

export function useFeaturedProducts(brandId: string) {
  return useSupabaseCache(
    `featured-products-${brandId}`,
    async () => {
      const { data, error } = await supabase
        .from('products_with_discounts')
        .select('*')
        .eq('brand_id', brandId)
        .eq('featured', true)
        .eq('in_stock', true)
        .limit(3)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    { 
      ttl: 3 * 60 * 1000, // 3 minutes for products
      enabled: !!brandId 
    }
  )
}

export function useBrandProducts(brandSlug: string) {
  return useSupabaseCache(
    `brand-products-${brandSlug}`,
    async () => {
      const { data: brand, error: brandError } = await supabase
        .from('brands')
        .select('id')
        .ilike('name', `%${brandSlug.replace('-', ' ')}%`)
        .single()

      if (brandError) throw brandError

      const { data: products, error: productsError } = await supabase
        .from('products_with_discounts')
        .select('*')
        .eq('brand_id', brand.id)
        .eq('in_stock', true)
        .order('created_at', { ascending: false })

      if (productsError) throw productsError
      return products || []
    },
    { 
      ttl: 3 * 60 * 1000, // 3 minutes for products
      enabled: !!brandSlug 
    }
  )
}

// Export cache instance for manual operations
export { cache as supabaseCache }