'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Plus, Edit, Trash2, Copy, Eye, EyeOff, Send, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Promotion {
  id: string
  code: string
  name: string
  description: string | null
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  minimum_order_amount: number
  maximum_discount_amount: number | null
  applies_to: 'all' | 'brand' | 'product'
  brand_id: string | null
  product_id: string | null
  usage_limit: number | null
  used_count: number
  max_uses_per_user: number
  starts_at: string
  expires_at: string | null
  is_active: boolean
  created_at: string
  brands?: { name: string }
  products?: { name: string }
}

interface Brand {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  brands: { name: string }[]
}

export default function PromotionsManagement() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [webhookConfirmPromotion, setWebhookConfirmPromotion] = useState<Promotion | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: '',
    minimum_order_amount: '0',
    maximum_discount_amount: '',
    applies_to: 'all' as 'all' | 'brand' | 'product',
    brand_id: '',
    product_id: '',
    usage_limit: '',
    max_uses_per_user: '1',
    starts_at: new Date(),
    expires_at: null as Date | null,
    is_active: true
  })

  useEffect(() => {
    fetchPromotions()
    fetchBrands()
    fetchProducts()
  }, [])

  const fetchPromotions = async () => {
    try {
      // Wrap query in timeout
      const promotionsPromise = supabase
        .from('promotions')
        .select(`
          *,
          brands(name),
          products(name)
        `)
        .order('created_at', { ascending: false })

      const { data, error } = await Promise.race([
        promotionsPromise,
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), 10000)
        )
      ])

      if (error) throw error
      setPromotions(data || [])
    } catch (error) {
      console.error('Error fetching promotions:', error)
      toast.error('Failed to fetch promotions')
    } finally {
      setLoading(false)
    }
  }

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setBrands(data || [])
    } catch (error) {
      console.error('Error fetching brands:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          brands(name)
        `)
        .eq('in_stock', true)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({ ...prev, code: result }))
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      minimum_order_amount: '0',
      maximum_discount_amount: '',
      applies_to: 'all',
      brand_id: '',
      product_id: '',
      usage_limit: '',
      max_uses_per_user: '1',
      starts_at: new Date(),
      expires_at: null,
      is_active: true
    })
    setEditingPromotion(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const promotionData = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        minimum_order_amount: parseFloat(formData.minimum_order_amount),
        maximum_discount_amount: formData.maximum_discount_amount ? parseFloat(formData.maximum_discount_amount) : null,
        applies_to: formData.applies_to,
        brand_id: formData.applies_to === 'brand' ? formData.brand_id : null,
        product_id: formData.applies_to === 'product' ? formData.product_id : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        max_uses_per_user: parseInt(formData.max_uses_per_user),
        starts_at: formData.starts_at.toISOString(),
        expires_at: formData.expires_at ? formData.expires_at.toISOString() : null,
        is_active: formData.is_active
      }

      if (editingPromotion) {
        const { error } = await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editingPromotion.id)

        if (error) throw error
        toast.success('Promotion updated successfully')
      } else {
        const { data: newPromotion, error } = await supabase
          .from('promotions')
          .insert([promotionData])
          .select()
          .single()

        if (error) throw error

        // Trigger promotion_created webhook
        try {
          const webhookResponse = await fetch('/api/webhooks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event_type: 'promotion_created',
              data: {
                promotion_id: newPromotion.id,
                code: newPromotion.code,
                name: newPromotion.name,
                description: newPromotion.description,
                discount_type: newPromotion.discount_type,
                discount_value: newPromotion.discount_value,
                minimum_order_amount: newPromotion.minimum_order_amount,
                maximum_discount_amount: newPromotion.maximum_discount_amount,
                applies_to: newPromotion.applies_to,
                brand_id: newPromotion.brand_id,
                product_id: newPromotion.product_id,
                usage_limit: newPromotion.usage_limit,
                max_uses_per_user: newPromotion.max_uses_per_user,
                starts_at: newPromotion.starts_at,
                expires_at: newPromotion.expires_at,
                is_active: newPromotion.is_active,
                created_at: newPromotion.created_at
              }
            }),
          });

          if (webhookResponse.ok) {
            const webhookResult = await webhookResponse.json();
            console.log('Promotion created webhook triggered successfully:', webhookResult);
          } else {
            console.error('Failed to trigger promotion created webhook:', await webhookResponse.text());
          }
        } catch (webhookError) {
          console.error('Error triggering promotion created webhook:', webhookError);
          // Don't fail the promotion creation if webhook fails
        }

        toast.success('Promotion created successfully')
      }

      setIsDialogOpen(false)
      resetForm()
      fetchPromotions()
    } catch (error: any) {
      console.error('Error saving promotion:', error)
      if (error.code === '23505') {
        toast.error('Promotion code already exists')
      } else {
        toast.error('Failed to save promotion')
      }
    }
  }

  const handleEdit = (promotion: Promotion) => {
    setFormData({
      code: promotion.code,
      name: promotion.name,
      description: promotion.description || '',
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value.toString(),
      minimum_order_amount: promotion.minimum_order_amount.toString(),
      maximum_discount_amount: promotion.maximum_discount_amount?.toString() || '',
      applies_to: promotion.applies_to,
      brand_id: promotion.brand_id || '',
      product_id: promotion.product_id || '',
      usage_limit: promotion.usage_limit?.toString() || '',
      max_uses_per_user: promotion.max_uses_per_user.toString(),
      starts_at: new Date(promotion.starts_at),
      expires_at: promotion.expires_at ? new Date(promotion.expires_at) : null,
      is_active: promotion.is_active
    })
    setEditingPromotion(promotion)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return

    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Promotion deleted successfully')
      fetchPromotions()
    } catch (error) {
      console.error('Error deleting promotion:', error)
      toast.error('Failed to delete promotion')
    }
  }

  const toggleActive = async (promotion: Promotion) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !promotion.is_active })
        .eq('id', promotion.id)

      if (error) throw error
      toast.success(`Promotion ${!promotion.is_active ? 'activated' : 'deactivated'}`)
      fetchPromotions()
    } catch (error) {
      console.error('Error toggling promotion:', error)
      toast.error('Failed to update promotion')
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Code copied to clipboard')
  }

  const handleWebhookRequest = (promotion: Promotion) => {
    setWebhookConfirmPromotion(promotion)
  }

  const confirmWebhookTrigger = async () => {
    if (!webhookConfirmPromotion) return

    try {
      // Trigger the promotions webhook for individual promotion
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: 'promotion_created',
          data: {
            promotion: webhookConfirmPromotion,
            timestamp: new Date().toISOString(),
            triggered_by: 'admin_manual'
          }
        }),
      })

      if (response.ok) {
        toast.success(`Webhook sent for promotion: ${webhookConfirmPromotion.code}`)
      } else {
        toast.error('Failed to trigger promotion webhook')
      }
    } catch (error) {
      console.error('Error triggering webhook:', error)
      toast.error('Error triggering promotion webhook')
    } finally {
      setWebhookConfirmPromotion(null)
    }
  }

  const cancelWebhookTrigger = () => {
    setWebhookConfirmPromotion(null)
  }

  const filteredPromotions = promotions.filter(promotion =>
    promotion.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    promotion.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    promotion.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Promotions Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Create and manage discount codes for your store</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Promotion
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Promotion Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="SAVE20"
                      required
                    />
                    <Button type="button" onClick={generateCode} variant="outline">
                      Generate
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="name">Promotion Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Summer Sale"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Save 20% on all summer items"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount_type">Discount Type</Label>
                  <Select value={formData.discount_type} onValueChange={(value: 'percentage' | 'fixed_amount') => setFormData(prev => ({ ...prev, discount_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="discount_value">
                    Discount Value {formData.discount_type === 'percentage' ? '(%)' : '(₦)'}
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.discount_type === 'percentage' ? '100' : undefined}
                    value={formData.discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimum_order_amount">Minimum Order Amount (₦)</Label>
                  <Input
                    id="minimum_order_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minimum_order_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimum_order_amount: e.target.value }))}
                  />
                </div>

                {formData.discount_type === 'percentage' && (
                  <div>
                    <Label htmlFor="maximum_discount_amount">Maximum Discount Amount (₦)</Label>
                    <Input
                      id="maximum_discount_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.maximum_discount_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, maximum_discount_amount: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="applies_to">Applies To</Label>
                <Select value={formData.applies_to} onValueChange={(value: 'all' | 'brand' | 'product') => setFormData(prev => ({ ...prev, applies_to: value, brand_id: '', product_id: '' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="brand">Specific Brand</SelectItem>
                    <SelectItem value="product">Specific Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.applies_to === 'brand' && (
                <div>
                  <Label htmlFor="brand_id">Select Brand</Label>
                  <Select value={formData.brand_id} onValueChange={(value) => setFormData(prev => ({ ...prev, brand_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.applies_to === 'product' && (
                <div>
                  <Label htmlFor="product_id">Select Product</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.brands[0]?.name || 'No brand'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="usage_limit">Total Usage Limit</Label>
                  <Input
                    id="usage_limit"
                    type="number"
                    min="1"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value }))}
                    placeholder="Unlimited"
                  />
                </div>

                <div>
                  <Label htmlFor="max_uses_per_user">Max Uses Per User</Label>
                  <Input
                    id="max_uses_per_user"
                    type="number"
                    min="1"
                    value={formData.max_uses_per_user}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_uses_per_user: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.starts_at && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.starts_at ? format(formData.starts_at, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.starts_at}
                        onSelect={(date) => setFormData(prev => ({ ...prev, starts_at: date || new Date() }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>End Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.expires_at && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expires_at ? format(formData.expires_at, "PPP") : <span>No expiry</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.expires_at || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, expires_at: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-black text-white hover:bg-gray-800">
                  {editingPromotion ? 'Update' : 'Create'} Promotion
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search promotions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-md"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Promotions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promotions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Promotions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {promotions.filter(p => p.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Uses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {promotions.reduce((sum, p) => sum + p.used_count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {promotions.filter(p => p.expires_at && new Date(p.expires_at) < new Date()).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Promotions List */}
      <div className="space-y-4">
        {filteredPromotions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No promotions found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'No promotions match your search.' : 'Get started by creating your first promotion.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsDialogOpen(true)} className="bg-black text-white hover:bg-gray-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Promotion
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPromotions.map((promotion) => (
            <Card key={promotion.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{promotion.name}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono cursor-pointer hover:bg-gray-100 text-xs"
                          onClick={() => copyCode(promotion.code)}
                        >
                          {promotion.code}
                          <Copy className="w-3 h-3 ml-1" />
                        </Badge>
                        <Badge variant={promotion.is_active ? "default" : "secondary"} className="text-xs">
                          {promotion.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {promotion.expires_at && new Date(promotion.expires_at) < new Date() && (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        )}
                      </div>
                    </div>

                    {promotion.description && (
                      <p className="text-gray-600 mb-3 text-sm">{promotion.description}</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
                      <div>
                        <span className="font-medium">Discount:</span>
                        <div>
                          {promotion.discount_type === 'percentage'
                            ? `${promotion.discount_value}%`
                            : `₦${promotion.discount_value.toLocaleString()}`
                          }
                        </div>
                      </div>

                      <div>
                        <span className="font-medium">Applies to:</span>
                        <div>
                          {promotion.applies_to === 'all' && 'All Products'}
                          {promotion.applies_to === 'brand' && promotion.brands?.name}
                          {promotion.applies_to === 'product' && promotion.products?.name}
                        </div>
                      </div>

                      <div>
                        <span className="font-medium">Usage:</span>
                        <div>
                          {promotion.used_count}
                          {promotion.usage_limit ? ` / ${promotion.usage_limit}` : ' / ∞'}
                        </div>
                      </div>

                      <div>
                        <span className="font-medium">Expires:</span>
                        <div>
                          {promotion.expires_at
                            ? format(new Date(promotion.expires_at), 'MMM dd, yyyy')
                            : 'Never'
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWebhookRequest(promotion)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-1 sm:flex-none"
                      title="Send webhook for this promotion"
                    >
                      <Send className="w-4 h-4" />
                      <span className="sm:hidden ml-1">Webhook</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(promotion)}
                      className="flex-1 sm:flex-none"
                    >
                      {promotion.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span className="sm:hidden ml-1">{promotion.is_active ? 'Hide' : 'Show'}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(promotion)}
                      className="flex-1 sm:flex-none"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="sm:hidden ml-1">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(promotion.id)}
                      className="text-red-600 hover:text-red-700 flex-1 sm:flex-none"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sm:hidden ml-1">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Webhook Confirmation Dialog */}
      {webhookConfirmPromotion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Webhook Trigger</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to trigger the webhook for promotion <strong>{webhookConfirmPromotion.code}</strong>? This will send this promotion's data to the configured webhook endpoint.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={cancelWebhookTrigger}
                variant="outline"
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                onClick={confirmWebhookTrigger}
                className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}