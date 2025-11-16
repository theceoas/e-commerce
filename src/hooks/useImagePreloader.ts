'use client'

import { useEffect, useRef } from 'react'

/**
 * Hook to preload images when they're about to enter the viewport
 * This improves perceived performance by loading images before they're needed
 */
export function useImagePreloader(imageUrls: string[], enabled: boolean = true) {
  const preloadedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled || imageUrls.length === 0) return

    // Preload images that are likely to be viewed soon
    const preloadImages = () => {
      imageUrls.forEach((url) => {
        if (!url || preloadedRef.current.has(url)) return

        const img = new window.Image()
        img.src = url
        img.loading = 'eager'
        img.fetchPriority = 'high'
        preloadedRef.current.add(url)
      })
    }

    // Preload immediately for critical images
    preloadImages()

    // Use Intersection Observer for lazy preloading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            if (img.src && !preloadedRef.current.has(img.src)) {
              const preloadImg = new window.Image()
              preloadImg.src = img.src
              preloadImg.loading = 'eager'
              preloadedRef.current.add(img.src)
            }
          }
        })
      },
      {
        rootMargin: '200px', // Start loading 200px before image enters viewport
        threshold: 0.01,
      }
    )

    // Observe all images on the page
    const images = document.querySelectorAll('img[data-preload]')
    images.forEach((img) => observer.observe(img))

    return () => {
      observer.disconnect()
    }
  }, [imageUrls, enabled])
}

/**
 * Preload a single image immediately
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve()
      return
    }

    const img = new window.Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
    img.loading = 'eager'
    img.fetchPriority = 'high'
  })
}

/**
 * Preload multiple images in parallel
 */
export async function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(urls.map((url) => preloadImage(url).catch(() => {})))
}

