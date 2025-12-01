import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import BrandContent from '@/components/brand-content'
import { Metadata } from 'next'

// Generate metadata for the page
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const brandName = slug.replace(/-/g, ' ')

  const { data: brand } = await supabase
    .from('brands')
    .select('name, description, image_url')
    .ilike('name', `%${brandName}%`)
    .eq('is_active', true)
    .single()

  if (!brand) {
    return {
      title: 'Brand Not Found',
    }
  }

  return {
    title: `${brand.name} | Favorite Things`,
    description: brand.description,
    openGraph: {
      images: [brand.image_url],
    },
  }
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // Handle "Others" -> "FavoriteThings" mapping
  let searchSlug = slug
  if (slug.toLowerCase() === 'favoritethings' || slug.toLowerCase() === 'favorite-things') {
    // If user navigates to "favoritethings", we might need to look up "others" in DB if it hasn't been renamed there yet
    // Or if the user wants to rename it in the UI, we can check for both.
    // For now, let's assume we search for the slug as is, but if it fails, we try "others"
  }

  let brandName = slug.replace(/-/g, ' ')

  // Special case: if slug is 'favoritethings', check if we need to map it
  if (slug.toLowerCase() === 'favoritethings') {
    brandName = 'FavoriteThings'
  }

  // Fetch brand
  let { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('*')
    .ilike('name', `%${brandName}%`)
    .eq('is_active', true)
    .single()

  // Fallback: If "FavoriteThings" not found, try "Others" (legacy name)
  if (!brand && (slug.toLowerCase() === 'favoritethings' || slug.toLowerCase() === 'favorite-things')) {
    const { data: fallbackBrand, error: fallbackError } = await supabase
      .from('brands')
      .select('*')
      .ilike('name', '%others%')
      .eq('is_active', true)
      .single()

    if (fallbackBrand) {
      brand = fallbackBrand
      // Override name for display
      brand.name = 'Favorite Things'
    }
  }

  if (brandError && !brand) {
    console.error('Error fetching brand:', brandError)
    notFound()
  }

  if (!brand) {
    notFound()
  }

  // Fetch products
  const { data: products, error: productsError } = await supabase
    .from('products_with_discounts')
    .select('*')
    .eq('brand_id', brand.id)
    .order('created_at', { ascending: false })

  if (productsError) {
    console.error('Error fetching products:', productsError)
  }

  return <BrandContent brand={brand} initialProducts={products || []} />
}