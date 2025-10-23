'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabaseCache } from './useSupabaseCache'

/**
 * Hook to manage cache invalidation during navigation
 * Clears cache when navigating between admin and public pages
 */
export function useNavigationCache() {
  const pathname = usePathname()

  useEffect(() => {
    // Track navigation patterns that might cause cache issues
    const isAdminPage = pathname.startsWith('/admin')
    const isHomePage = pathname === '/'
    const isBrandPage = pathname.startsWith('/brands/')
    
    // Store the current page type in sessionStorage
    const previousPageType = sessionStorage.getItem('currentPageType')
    const currentPageType = isAdminPage ? 'admin' : 'public'
    
    // If switching between admin and public pages, clear cache
    if (previousPageType && previousPageType !== currentPageType) {
      console.log(`Navigation detected: ${previousPageType} -> ${currentPageType}`)
      console.log('Clearing cache due to navigation between admin and public pages')
      supabaseCache.clearOnNavigation()
      
      // Also invalidate specific cache patterns
      supabaseCache.invalidatePattern('brands')
      supabaseCache.invalidatePattern('products')
    }
    
    // Update the current page type
    sessionStorage.setItem('currentPageType', currentPageType)
    
    // Log cache stats for debugging
    const stats = supabaseCache.getStats()
    console.log('Cache stats after navigation:', stats)
    
  }, [pathname])
}