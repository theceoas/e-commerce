"use client"

import { useEffect, useState, createContext, useContext } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import AdminSidebar from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

// Create context for sidebar state
const SidebarContext = createContext<{
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
}>({
  isCollapsed: false,
  setIsCollapsed: () => {},
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: () => {}
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen }}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm z-50 flex items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#FFDC00] rounded flex items-center justify-center">
              <span className="text-black font-bold text-sm">FT</span>
            </div>
            <h1 className="text-lg font-bold text-black">Admin Panel</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="hover:bg-gray-100"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          fixed left-0 z-40 transition-transform duration-300
          top-16 h-[calc(100vh-4rem)] lg:top-0 lg:h-full
          lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <AdminSidebar 
            activeSection={getActiveSection()}
            isCollapsed={isCollapsed} 
            setIsCollapsed={setIsCollapsed}
            isMobile={true}
            onMobileClose={() => setIsMobileMenuOpen(false)}
          />
        </div>
        
        {/* Main Content Area */}
        <div 
          className={`transition-all duration-300 min-h-screen
            pt-16 lg:pt-0
            lg:ml-[280px] lg:${isCollapsed ? 'ml-[80px]' : 'ml-[280px]'}
          `}
        >
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  )
}