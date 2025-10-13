'use client'

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function ProductSkeleton() {
  return (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-0">
        <div className="relative overflow-hidden rounded-lg">
          {/* Image skeleton */}
          <Skeleton className="w-full aspect-[9/16] object-cover" />
          
          {/* Content skeleton */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4 bg-white/20" />
              <Skeleton className="h-3 w-1/2 bg-white/20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProductGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  )
}