import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./critical.css";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { Toaster } from "sonner";
import StickyCartIcon from "@/components/sticky-cart-icon";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FavoriteThings",
  description: "Discover and shop your favorite things from top brands. Quality products, great prices, and exceptional service.",
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/favicon.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png?v=2', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon.png?v=2', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=2',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://ysubkmcyeqosjybogvyq.supabase.co" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://ysubkmcyeqosjybogvyq.supabase.co" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <CartProvider>
            {children}
            <StickyCartIcon />
            <Toaster position="top-right" richColors />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}