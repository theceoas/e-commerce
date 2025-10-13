'use client'

import { Skeleton } from "@/components/ui/skeleton"

export function BrandSkeleton() {
  return (
    <div className="relative group">
      <Skeleton className="w-full h-48 sm:h-56 md:h-64 rounded-lg" />
      <Skeleton className="absolute top-4 left-4 w-16 h-6 rounded" />
    </div>
  )
}

export function BrandGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12 max-w-5xl mx-auto px-4">
      {Array.from({ length: count }).map((_, i) => (
        <BrandSkeleton key={i} />
      ))}
    </div>
  )
}