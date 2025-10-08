'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ShoppingCart, Menu, Heart, User, X, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface HeaderProps {
  cartItemsCount: number
  onCartClick: () => void
}

export function Header({ cartItemsCount, onCartClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMenuOpen(false)
  }

  const handleAccountClick = () => {
    router.push('/auth')
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const navItems = [
    { label: 'Home', id: 'hero' },
    { label: 'About', id: 'about' },
    { label: 'Contact', id: 'contact' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black backdrop-blur supports-[backdrop-filter]:bg-black/95">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            {/* Logo placeholder - replace with your actual logo */}
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#FFDC00] rounded flex items-center justify-center">
              <span className="text-black font-bold text-xs sm:text-sm">L</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-[#FFDC00] truncate">Favorite Things</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-sm font-medium text-[#FFDC00] transition-colors hover:text-yellow-300"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Account, Cart and Mobile Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Account/Login Button */}
            {loading ? (
              <div className="w-16 sm:w-20 h-8 bg-gray-700 animate-pulse rounded"></div>
            ) : user ? (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAccountClick}
                  className="flex items-center gap-1 sm:gap-2 border-[#FFDC00] hover:bg-[#FFDC00] text-[#FFDC00] hover:text-black font-medium px-2 sm:px-3"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Account</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-1 sm:gap-2 border-[#FFDC00] hover:bg-[#FFDC00] text-[#FFDC00] hover:text-black font-medium px-2 sm:px-3"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAccountClick}
                className="flex items-center gap-1 sm:gap-2 border-[#FFDC00] hover:bg-[#FFDC00] text-[#FFDC00] hover:text-black font-medium px-2 sm:px-3"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </Button>
            )}

            {/* Cart Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onCartClick}
              className="relative border-[#FFDC00] hover:bg-[#FFDC00] text-[#FFDC00] hover:text-black px-2 sm:px-3"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartItemsCount > 0 && (
                <Badge
                  className="absolute -top-2 -right-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 text-xs bg-[#FFDC00] text-black hover:bg-yellow-300 flex items-center justify-center"
                >
                  {cartItemsCount > 99 ? '99+' : cartItemsCount}
                </Badge>
              )}
            </Button>

            {/* Mobile Menu */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden border-[#FFDC00] text-[#FFDC00] hover:bg-[#FFDC00] hover:text-black">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-black border-l border-gray-800">
                <nav className="flex flex-col space-y-4 mt-8">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="text-left text-lg font-medium text-[#FFDC00] transition-colors hover:text-yellow-300"
                    >
                      {item.label}
                    </button>
                  ))}
                  
                  {/* Mobile Account/Login Button */}
                  <div className="mt-6 pt-4 border-t border-gray-800">
                    {loading ? (
                      <div className="w-full h-10 bg-gray-700 animate-pulse rounded"></div>
                    ) : user ? (
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            handleAccountClick()
                            setIsMenuOpen(false)
                          }}
                          className="w-full text-left text-lg font-medium transition-colors hover:text-yellow-300 flex items-center gap-2 text-[#FFDC00]"
                        >
                          <User className="h-5 w-5" />
                          Account
                        </button>
                        <button
                          onClick={() => {
                            handleSignOut()
                            setIsMenuOpen(false)
                          }}
                          className="w-full text-left text-lg font-medium transition-colors hover:text-yellow-300 flex items-center gap-2 text-[#FFDC00]"
                        >
                          <LogOut className="h-5 w-5" />
                          Sign Out
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          handleAccountClick()
                          setIsMenuOpen(false)
                        }}
                        className="w-full text-left text-lg font-medium transition-colors hover:text-yellow-300 flex items-center gap-2 text-[#FFDC00]"
                      >
                        <User className="h-5 w-5" />
                        Login
                      </button>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}