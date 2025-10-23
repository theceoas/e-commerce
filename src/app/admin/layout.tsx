"use client"

import { useEffect, useState } from "react"
import dynamic from 'next/dynamic'
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { SidebarContext, useSidebar } from "@/contexts/SidebarContext"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

// Loading component for AdminSidebar
function AdminSidebarSkeleton() {
  return (
    <div className="w-[280px] h-full bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-lg animate-pulse">
      <div className="p-6">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Replace React.lazy with next/dynamic to avoid chunk load issues
const AdminSidebar = dynamic(() => import("@/components/admin-sidebar"), {
  ssr: false,
  loading: () => <AdminSidebarSkeleton />,
})

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Auth redirect guard: always call hooks; skip redirect on login route
  useEffect(() => {
    if (loading) return // Don't redirect while loading
    if (pathname === '/admin/login') return // Allow login to render

    if (!user || user.role !== 'admin') {
      router.replace('/admin/login')
    }
  }, [user, loading, router, pathname])

  // Allow public login page to render inside admin segment
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render admin content if not authenticated
  if (!user || user.role !== 'admin') {
    return null
  }

  const getActiveSection = () => {
    if (pathname === '/admin') return 'dashboard'
    if (pathname.startsWith('/admin/products')) return 'products'
    if (pathname.startsWith('/admin/orders')) return 'orders'
    if (pathname.startsWith('/admin/customers')) return 'customers'
    if (pathname.startsWith('/admin/brands')) return 'brands'
    if (pathname.startsWith('/admin/promotions')) return 'promotions'
    if (pathname.startsWith('/admin/settings')) return 'settings'
    return 'dashboard'
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