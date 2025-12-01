import { createBrowserClient } from '@supabase/ssr'

/**
 * Singleton Supabase client
 * All pages share the SAME client instance to prevent auth conflicts
 */
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export const createClient = () => {
    // Return existing instance if already created
    if (supabaseInstance) {
        return supabaseInstance
    }

    // Create new instance only once
    supabaseInstance = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    return supabaseInstance
}
