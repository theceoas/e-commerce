"use client"

import { createContext, useContext } from "react"

// Create context for sidebar state
export const SidebarContext = createContext<{
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

// Export useSidebar as a separate utility function
export const useSidebar = () => useContext(SidebarContext)