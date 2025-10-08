"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import {
  ShoppingBag,
  Users,
  DollarSign,
  Package,
  TrendingUp,
  LogOut,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Product {
  id: string
  name: string
  description: string
  price: number
  thumbnail_url: string
  brand_id?: string
  in_stock: boolean
  created_at: string
}

interface Order {
  id: string
  user_id: string | null
  guest_email: string | null
  total_amount: number
  status: string
  payment_status: string
  order_number: string
  created_at: string
}

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeProducts: 0
  })
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const { user, isAdmin, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && isAdmin) {
      loadDashboardData()
    } else if (!loading && (!user || !isAdmin)) {
      setDashboardLoading(false)
    }
  }, [user, isAdmin, loading])



  const loadDashboardData = async () => {
    try {
      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (productsError) throw productsError

      // Load recent orders for display
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (ordersError) throw ordersError

      // Get all orders for accurate stats
      const { data: allOrdersData, error: allOrdersError } = await supabase
        .from('orders')
        .select('total_amount')

      if (allOrdersError) throw allOrdersError

      setProducts(productsData || [])
      setOrders(ordersData || [])

      // Calculate stats from real data
      const totalProducts = productsData?.length || 0
      const activeProducts = productsData?.filter(p => p.in_stock).length || 0
      const totalOrders = allOrdersData?.length || 0
      const totalRevenue = allOrdersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      setStats({
        totalProducts,
        totalOrders,
        totalRevenue,
        activeProducts
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setDashboardLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/admin/login")
  }

  const handleViewSite = () => {
    window.open("/", "_blank")
  }



  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <div className="w-full">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-black">Admin Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Manage your fashion e-commerce store</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={handleViewSite} className="border-gray-200 hover:bg-gray-50 flex-1 sm:flex-none text-xs sm:text-sm">
                <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">View Site</span>
                <span className="sm:hidden">View</span>
              </Button>
              <Button onClick={handleLogout} className="bg-yellow-500 hover:bg-yellow-600 text-black flex-1 sm:flex-none text-xs sm:text-sm">
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/90 shadow-lg border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-black">Total Products</CardTitle>
                <Package className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">{stats.totalProducts}</div>
                <p className="text-xs text-gray-600">
                  {stats.activeProducts} in stock
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/90 shadow-lg border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-black">Total Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">{stats.totalOrders}</div>
                <p className="text-xs text-gray-600">
                  Total orders placed
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/90 shadow-lg border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-black">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">₦{stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <p className="text-xs text-gray-600">
                  Total revenue earned
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/90 shadow-lg border-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-black">Average Order</CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-black">
                  ₦{stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </div>
                <p className="text-xs text-gray-600">
                  Average order value
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Products Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-white/90 shadow-lg border-0">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm sm:text-base text-black">Products</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-gray-600">Manage your product catalog</CardDescription>
                  </div>
                  <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs sm:text-sm w-full sm:w-auto">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Add Product</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {products.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                          {product.thumbnail_url ? (
                            <img 
                              src={product.thumbnail_url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs sm:text-sm text-black truncate">{product.name}</p>
                          <p className="text-xs text-gray-600">ID: {product.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2">
                        <Badge variant={product.in_stock ? "default" : "secondary"} className={`text-xs ${product.in_stock ? "bg-green-400 text-black" : ""}`}>
                          {product.in_stock ? "In Stock" : "Out"}
                        </Badge>
                        <span className="font-medium text-xs sm:text-sm text-black">₦{product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Orders Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-white/90 shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-sm sm:text-base text-black">Recent Orders</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-600">Latest customer orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm text-black truncate">
                          {order.guest_email || `Order #${order.order_number}`}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <Badge variant={order.status === "completed" ? "default" : "secondary"} className={`text-xs ${order.status === "completed" ? "bg-green-400 text-black" : ""}`}>
                          {order.status}
                        </Badge>
                        <span className="font-medium text-xs sm:text-sm text-black">₦{order.total_amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      </div>
    </div>
  )
}