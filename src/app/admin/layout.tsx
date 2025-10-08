"use client"

import { useEffect, useState, createContext, useContext } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import AdminSidebar from "@/components/admin-sidebar"

// Create context for sidebar state
const SidebarContext = createContext<{
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}>({
  isCollapsed: false,
  setIsCollapsed: () => {}
})

export const useSidebar = () => useContext(SidebarContext)

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Don't redirect if we're already on the login page
  const isLoginPage = pathname === "/admin/login"

  // Determine active section based on pathname
  const getActiveSection = () => {
    if (pathname === "/admin") return "dashboard"
    if (pathname.startsWith("/admin/orders")) return "orders"
    if (pathname.startsWith("/admin/products")) return "products"
    if (pathname.startsWith("/admin/brands")) return "brands"
    if (pathname.startsWith("/admin/customers")) return "customers"
    if (pathname.startsWith("/admin/promotions")) return "promotions"
    if (pathname.startsWith("/admin/settings")) return "settings"
    return "dashboard"
  }

  useEffect(() => {
    if (!loading && (!user || !isAdmin) && !isLoginPage) {
      router.push("/admin/login")
    }
  }, [user, isAdmin, loading, router, isLoginPage])

  // Show loading while checking auth state (but not on login page)
  if (loading && !isLoginPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  // If on login page, render without authentication check
  if (isLoginPage) {
    return children
  }

  // Redirect if not authenticated (this should be handled by useEffect, but just in case)
  if (!user || !isAdmin) {
    return null
  }

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Fixed Sidebar */}
        <div className="fixed left-0 top-0 h-full z-40">
          <AdminSidebar 
            activeSection={getActiveSection()}
            isCollapsed={isCollapsed} 
            setIsCollapsed={setIsCollapsed} 
          />
        </div>
        
        {/* Main Content Area */}
        <div 
          className={`transition-all duration-300 min-h-screen ${
            isCollapsed ? 'ml-[80px]' : 'ml-[280px]'
          }`}
        >
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  )
}