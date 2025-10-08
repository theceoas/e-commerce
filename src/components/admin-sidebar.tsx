"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ShoppingBag,
  Users,
  Package,
  Tag,
  Settings,
  Bell,
  Home,
  ChevronLeft,
  ChevronRight,
  Star
} from "lucide-react"

interface AdminSidebarProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
  newOrdersCount?: number
  isCollapsed?: boolean
  setIsCollapsed?: (collapsed: boolean) => void
  isMobile?: boolean
  onMobileClose?: () => void
}

export default function AdminSidebar({ 
  activeSection = "dashboard", 
  onSectionChange,
  newOrdersCount = 3,
  isCollapsed = false,
  setIsCollapsed,
  isMobile = false,
  onMobileClose
}: AdminSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  
  // Use external state if provided, otherwise use internal state
  const collapsed = setIsCollapsed ? isCollapsed : internalCollapsed
  const toggleCollapsed = setIsCollapsed || setInternalCollapsed
  const router = useRouter()

  const navigationItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      description: "Overview and analytics",
      route: "/admin"
    },
    {
      id: "orders",
      label: "Orders",
      icon: ShoppingBag,
      description: "Manage customer orders",
      badge: newOrdersCount > 0 ? newOrdersCount : undefined,
      route: "/admin/orders"
    },
    {
      id: "products",
      label: "Products",
      icon: Package,
      description: "Upload and manage products",
      route: "/admin/products"
    },
    {
      id: "brands",
      label: "Brands",
      icon: Star,
      description: "Manage brand thumbnails",
      route: "/admin/brands"
    },
    {
      id: "customers",
      label: "Customers",
      icon: Users,
      description: "Customer management",
      route: "/admin/customers"
    },
    {
      id: "promotions",
      label: "Promotions & Discounts",
      icon: Tag,
      description: "Manage promos and discounts",
      route: "/admin/promotions"
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      description: "Webhooks, emails & configuration",
      route: "/admin/settings"
    }
  ]

  const handleSectionClick = (sectionId: string) => {
    const item = navigationItems.find(nav => nav.id === sectionId)
    if (item?.route) {
      router.push(item.route)
    }
    if (onSectionChange) {
      onSectionChange(sectionId)
    }
    // Close mobile menu when navigation item is clicked
    if (isMobile && onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0, width: isMobile ? 280 : (collapsed ? 80 : 280) }}
      transition={{ duration: 0.3 }}
      className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-lg flex-shrink-0"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {(!collapsed || isMobile) && (
              <div className="flex items-center space-x-3">
                {/* Logo placeholder - replace with your actual logo */}
                <div className="w-8 h-8 bg-[#FFDC00] rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-black font-bold text-sm">FT</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black">Admin Panel</h2>
                  <p className="text-sm text-gray-600">Manage your store</p>
                </div>
              </div>
            )}
            {collapsed && !isMobile && (
              <div className="w-8 h-8 bg-[#FFDC00] rounded flex items-center justify-center">
                <span className="text-black font-bold text-sm">FT</span>
              </div>
            )}
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCollapsed(!collapsed)}
                className="hover:bg-gray-100"
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            
            return (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start h-auto p-3 ${
                    isActive 
                      ? "bg-[#FFDC00] hover:bg-[#FFDC00]/90 text-black" 
                      : "hover:bg-gray-100 text-gray-700"
                  } ${collapsed && !isMobile ? "px-3" : ""}`}
                  onClick={() => handleSectionClick(item.id)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {item.badge && (
                        <Badge 
                          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    {(!collapsed || isMobile) && (
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs opacity-70">{item.description}</div>
                      </div>
                    )}
                  </div>
                </Button>
              </motion.div>
            )
          })}
        </div>

        {/* Notifications Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            {(!collapsed || isMobile) && (
              <h3 className="text-sm font-medium text-gray-700">Notifications</h3>
            )}
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-500" />
              {newOrdersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0">
                  {newOrdersCount}
                </Badge>
              )}
            </div>
          </div>
          
          {(!collapsed || isMobile) && (
            <div className="space-y-2">
              <div className="text-xs text-gray-600">
                {newOrdersCount} new orders
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs border-gray-200 hover:bg-gray-50"
              >
                View All
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}