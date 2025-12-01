'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from "sonner"

const supabase = createClient()
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Trash2, Edit, Plus, Package, MapPin, Heart, User, LogOut, Eye, Settings } from 'lucide-react'

interface Order {
  id: any
  order_number: any
  created_at: any
  status: any
  total_amount: any
  order_items: {
    id: any
    quantity: any
    size: any
    unit_price: any
    total_price: any
    products: {
      name: any
      image_url: any
    }[]
  }[]
}

interface Address {
  id: any
  type: any
  first_name: any
  last_name: any
  address_line_1: any
  address_line_2?: any
  city: any
  state: any
  postal_code: any
  country: any
  is_default: any
}

interface WishlistItem {
  id: any
  product_id: any
  products: {
    name: any
    price: any
    image_url: any
    brand_id: any
    brands: {
      name: any
    }[]
  }[]
}

interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  date_of_birth?: string
}

export default function AccountPage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState('orders')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
      return
    }
    if (user) {
      fetchUserData()
    }
  }, [user, loading, router])

  const fetchUserData = async () => {
    if (!user) return

    setLoadingData(true)
    try {
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Fetch orders - check both user_id and guest_email to capture all orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          status,
          total_amount,
          order_items (
            id,
            quantity,
            size,
            unit_price,
            total_price,
            products (
              name,
              image_url
            )
          )
        `)
        .or(`user_id.eq.${user.id},guest_email.eq.${user.email}`)
        .order('created_at', { ascending: false })

      // Fetch addresses
      const { data: addressesData } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })

      // Fetch wishlist
      const { data: wishlistData } = await supabase
        .from('wishlist')
        .select(`
          id,
          product_id,
          products (
            name,
            price,
            image_url,
            brand_id,
            brands (
              name
            )
          )
        `)
        .eq('user_id', user.id)

      // Set the data with proper type handling
      setOrders(ordersData || [])
      setAddresses(addressesData || [])
      setWishlist(wishlistData || [])
      setProfile(profileData)
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        toast.error('Error updating password: ' + error.message)
      } else {
        toast.success('Password updated successfully')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (error) {
      toast.error('Error updating password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
              <p className="text-gray-600 mt-2">
                Manage your orders, wishlist, and account settings
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm border border-gray-200">
            <TabsTrigger
              value="orders"
              className="flex items-center gap-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-white"
            >
              <Package className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="addresses"
              className="flex items-center gap-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-white"
            >
              <MapPin className="h-4 w-4" />
              Addresses
            </TabsTrigger>
            <TabsTrigger
              value="wishlist"
              className="flex items-center gap-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-white"
            >
              <Heart className="h-4 w-4" />
              Wishlist
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-white"
            >
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>
                  View and track your recent orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No orders found</p>
                    <Button
                      className="mt-4"
                      onClick={() => router.push('/')}
                    >
                      Start Shopping
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card key={order.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-semibold">Order #{order.order_number}</h3>
                              <p className="text-sm text-gray-600">
                                Placed on {formatDate(order.created_at)}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                              <p className="text-lg font-semibold mt-1">
                                {formatPrice(order.total_amount)}
                              </p>
                            </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="space-y-3">
                            {order.order_items.map((item) => (
                              <div key={item.id} className="flex items-center gap-4">
                                <img
                                  src={item.products[0]?.image_url || '/placeholder.jpg'}
                                  alt={item.products[0]?.name || 'Product'}
                                  className="w-16 h-16 object-cover rounded-md"
                                />
                                <div className="flex-1">
                                  <h4 className="font-medium">{item.products[0]?.name || 'Unknown Product'}</h4>
                                  <p className="text-sm text-gray-600">
                                    Size: {item.size} • Qty: {item.quantity}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold">
                                    {formatPrice(item.total_price)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end mt-4">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Saved Addresses</CardTitle>
                    <CardDescription>
                      Manage your shipping and billing addresses
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Address
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No addresses saved</p>
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Address
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {addresses.map((address) => (
                      <Card key={address.id} className="relative">
                        <CardContent className="p-4">
                          {address.is_default && (
                            <Badge className="absolute top-2 right-2 bg-green-100 text-green-800">
                              Default
                            </Badge>
                          )}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {address.type}
                              </Badge>
                            </div>
                            <div>
                              <p className="font-semibold">
                                {address.first_name} {address.last_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {address.address_line_1}
                              </p>
                              {address.address_line_2 && (
                                <p className="text-sm text-gray-600">
                                  {address.address_line_2}
                                </p>
                              )}
                              <p className="text-sm text-gray-600">
                                {address.city}, {address.state} {address.postal_code}
                              </p>
                              <p className="text-sm text-gray-600">
                                {address.country}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <CardTitle>My Wishlist</CardTitle>
                <CardDescription>
                  Items you've saved for later
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : wishlist.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Your wishlist is empty</p>
                    <Button
                      className="mt-4"
                      onClick={() => router.push('/')}
                    >
                      Browse Products
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {wishlist.map((item) => (
                      <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="relative">
                            <img
                              src={item.products[0]?.image_url || '/placeholder.jpg'}
                              alt={item.products[0]?.name || 'Product'}
                              className="w-full h-48 object-cover rounded-md mb-4"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-semibold line-clamp-2">
                              {item.products[0]?.name || 'Unknown Product'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {item.products[0]?.brands?.[0]?.name || 'Unknown Brand'}
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {formatPrice(item.products[0]?.price || 0)}
                            </p>
                          </div>
                          <Button className="w-full mt-4">
                            Add to Cart
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <CardTitle>Welcome, {profile?.first_name || 'User'}!</CardTitle>
                <CardDescription>
                  Manage your personal information and account settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <Input
                      type="text"
                      value={profile?.first_name || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                      className="bg-white"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <Input
                      type="text"
                      value={profile?.last_name || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                      className="bg-white"
                      placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <Input
                      type="tel"
                      value={profile?.phone || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                      className="bg-white"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={async () => {
                      if (!profile || !user) return;

                      try {
                        const { error } = await supabase
                          .from('profiles')
                          .update({
                            first_name: profile.first_name,
                            last_name: profile.last_name,
                            phone: profile.phone
                          })
                          .eq('user_id', user.id);

                        if (error) throw error;
                        toast.success('Profile updated successfully');
                      } catch (error: any) {
                        console.error('Error updating profile:', error);
                        toast.error('Failed to update profile: ' + error.message);
                      }
                    }}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    Save Changes
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full"
                      />
                    </div>
                    <Button
                      onClick={handlePasswordChange}
                      disabled={passwordLoading || !newPassword || !confirmPassword}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      {passwordLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}