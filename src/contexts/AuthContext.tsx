"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

interface AuthContextType {
  user: (User & { role?: string }) | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  updateProfile: (data: any) => Promise<any>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { role?: string }) | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if user is admin based on role only
  const isAdmin = user?.role === 'admin'

  // Function to fetch user profile and role from database
  const fetchUserProfile = async (userId: string) => {
    try {
      // First try to find by user_id
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // If not found by user_id, try to find by id (for admin accounts)
      if (error && error.code === 'PGRST116') {
        const { data: dataById, error: errorById } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        data = dataById;
        error = errorById;
      }

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (!mounted) return;

        if (error) {
          // Clear any invalid session data
          await supabase.auth.signOut()
          setSession(null)
          setUser(null)
        } else {
          setSession(session)
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id)
            if (mounted) {
              setUser({ ...session.user, role: profile?.role || 'customer' })
            }
          } else {
            setUser(null)
          }
        }
      } catch (error) {
        if (mounted) {
          // Clear any corrupted session data
          await supabase.auth.signOut()
          setSession(null)
          setUser(null)
        }
      }
      if (mounted) {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED' && !session) {
          await supabase.auth.signOut()
          setSession(null)
          setUser(null)
          setLoading(false)
          return
        }

        setSession(session)

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          if (mounted) {
            setUser({ ...session.user, role: profile?.role || 'customer' })
          }

          // Don't create profile here - signUp() function handles it with all required data
          // (removed SIGNED_UP handler to prevent profile creation without first/last names)
        } else {
          if (mounted) {
            setUser(null)
          }
        }

        if (mounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false;
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, userData?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData?.firstName,
          last_name: userData?.lastName,
          phone: userData?.phone,
          role: 'customer' // SECURITY: Always 'customer' for public signups
        }
      }
    })

    if (error) return { error }

    // Profile is now created automatically by the database trigger 'on_auth_user_created'
    // This prevents race conditions and 409 Conflict errors
    if (data.user) {
      console.log('User created successfully. Profile should be created by DB trigger.');
    }

    return { error: null }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const updateProfile = async (profileData: any) => {
    if (!user) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('users')
      .update(profileData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAdmin,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}