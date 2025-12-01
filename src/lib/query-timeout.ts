// Utility function to wrap Supabase queries with timeout protection
// This prevents pages from hanging forever when queries take too long

import { toast } from 'sonner';

/**
 * Wraps a Supabase query with a timeout to prevent infinite loading states
 * 
 * @param queryFn - The async function that executes the Supabase query
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 10000 = 10 seconds)
 * @param onTimeout - Optional callback to run if timeout occurs
 * @returns The query result or throws an error
 * 
 * @example
 * const { data, error } = await withQueryTimeout(
 *   () => supabase.from('products').select('*').limit(50),
 *   10000
 * );
 */
export async function withQueryTimeout<T>(
    queryFn: () => Promise<T>,
    timeoutMs: number = 10000,
    onTimeout?: () => void
): Promise<T> {
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Query timeout after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        // Race between the query and the timeout
        const result = await Promise.race([queryFn(), timeoutPromise]);
        return result;
    } catch (error) {
        // Check if it's a timeout error
        if (error instanceof Error && error.message.includes('Query timeout')) {
            console.error('Supabase query timed out:', error);

            // Call the onTimeout callback if provided
            if (onTimeout) {
                onTimeout();
            } else {
                // Default behavior: show error toast
                toast.error('Request is taking too long. Please try again or contact support.');
            }
        }

        // Re-throw the error so calling code can handle it
        throw error;
    }
}

/**
 * Higher-order function that wraps a data fetching function with timeout protection
 * Useful for wrapping entire fetch functions that have multiple queries
 * 
 * @param fetchFn - The async function that fetches data
 * @param setLoading - Loading state setter function
 * @param timeoutMs - Maximum time to wait in milliseconds
 * 
 * @example
 * const loadProducts = withLoadingTimeout(
 *   async () => {
 *     const { data } = await supabase.from('products').select('*');
 *     setProducts(data);
 *   },
 *   setLoading,
 *   15000
 * );
 */
export function withLoadingTimeout(
    fetchFn: () => Promise<void>,
    setLoading: (loading: boolean) => void,
    timeoutMs: number = 15000
): () => Promise<void> {
    return async () => {
        setLoading(true);

        try {
            await withQueryTimeout(fetchFn, timeoutMs, () => {
                // Ensure loading is set to false on timeout
                setLoading(false);
            });
        } catch (error) {
            console.error('Error in data fetching:', error);
            // Ensure loading state is reset even on error
            setLoading(false);

            // Show user-friendly error message
            if (!(error instanceof Error && error.message.includes('Query timeout'))) {
                toast.error('Failed to load data. Please try again.');
            }
        } finally {
            // Double guarantee that loading is always set to false
            setLoading(false);
        }
    };
}

/**
 * Example usage in a component:
 * 
 * const loadOrders = async () => {
 *   try {
 *     const result = await withQueryTimeout(
 *       () => supabase
 *         .from('orders')
 *         .select('*')
 *         .order('created_at', { ascending: false })
 *         .range(0, 49),
 *       10000 // 10 second timeout
 *     );
 *     
 *     if (result.error) throw result.error;
 *     setOrders(result.data);
 *   } catch (error) {
 *     console.error('Failed to load orders:', error);
 *   } finally {
 *     setLoading(false);
 *   }
 * };
 */
