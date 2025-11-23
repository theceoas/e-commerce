export function isSupabaseUrl(url?: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.hostname.endsWith('.supabase.co')
  } catch {
    return false
  }
}

export function pickImageSrc(primary?: string, fallback?: string): string {
  if (primary && primary.trim().length > 0) return primary
  return fallback || '/images/placeholder.jpg'
}