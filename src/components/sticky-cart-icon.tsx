'use client';

import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function StickyCartIcon() {
  const { items } = useCart();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate total items in cart
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Show/hide based on scroll position and cart content
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 100 || totalItems > 0);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, [totalItems]);

  // Animate when items are added
  useEffect(() => {
    if (totalItems > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  const handleClick = () => {
    router.push('/cart');
  };

  if (!isVisible && totalItems === 0) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
      }`}
    >
      <button
        onClick={handleClick}
        className={`
          relative bg-yellow-500 hover:bg-yellow-600 text-white p-4 rounded-full shadow-lg 
          transition-all duration-200 hover:scale-110 active:scale-95
          ${isAnimating ? 'animate-bounce' : ''}
        `}
        aria-label={`Cart with ${totalItems} items`}
      >
        <ShoppingCart className="w-6 h-6" />
        
        {/* Cart item count badge */}
        {totalItems > 0 && (
          <div
            className={`
              absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold 
              rounded-full min-w-[20px] h-5 flex items-center justify-center px-1
              transition-all duration-200
              ${isAnimating ? 'animate-pulse scale-110' : ''}
            `}
          >
            {totalItems > 99 ? '99+' : totalItems}
          </div>
        )}
        
        {/* Ripple effect on click */}
        <div className="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-20 transition-opacity duration-200" />
      </button>
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-yellow-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
          {totalItems === 0 ? 'Cart is empty' : `${totalItems} item${totalItems !== 1 ? 's' : ''} in cart`}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-yellow-800" />
        </div>
      </div>
    </div>
  );
}