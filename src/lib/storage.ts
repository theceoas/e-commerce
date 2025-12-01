import { supabase } from './supabase'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export async function uploadBrandImage(
  file: File,
  brandId?: string,
  supabaseClient?: any
): Promise<UploadResult> {
  try {
    // Use provided client or fall back to default
    const client = supabaseClient || supabase

    // Generate a unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${brandId || Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `brands/${fileName}`

    // Upload file to Supabase Storage
    const { data, error } = await client.storage
      .from('brand-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: urlData } = client.storage
      .from('brand-images')
      .getPublicUrl(data.path)

    return {
      success: true,
      url: urlData.publicUrl
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

export async function deleteBrandImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/')
    const filePath = pathParts.slice(-2).join('/') // Get 'brands/filename.ext'

    const { error } = await supabase.storage
      .from('brand-images')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

export function getImageUrl(path: string): string {
  const { data } = supabase.storage
    .from('brand-images')
    .getPublicUrl(path)

  return data.publicUrl
}

export async function uploadProductImages(files: File[], productId?: string): Promise<UploadResult[]> {
  const results: UploadResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${productId || Date.now()}-${i}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `products/${fileName}`

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        results.push({ success: false, error: error.message })
        continue
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path)

      results.push({
        success: true,
        url: urlData.publicUrl
      })
    } catch (error) {
      console.error('Upload error:', error)
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      })
    }
  }

  return results
}

export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/')
    const filePath = pathParts.slice(-2).join('/') // Get 'products/filename.ext'

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}