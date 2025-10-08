"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { MultiImageUpload } from "@/components/ui/multi-image-upload"

import {
  Package,
  Plus,
  Edit,
  Trash2,
  Upload,
  X,
  ImageIcon,
  Eye,
  AlertTriangle,
  TrendingDown,
  BarChart3,
  Settings,
  Search,
  Star
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { uploadProductImages } from "@/lib/storage"
import { toast, Toaster } from "sonner"

interface Product {
  id: string
  name: string
  description: string
  price: number
  thumbnail_url: string
  additional_images: string[]
  in_stock: boolean
  brand_id: string
  sizes: ProductSize[]
  created_at: string
  featured: boolean
  discount_percentage?: number
  discount_amount?: number
  discount_start_date?: string
  discount_end_date?: string
  discount_active?: boolean
  discounted_price?: number
  has_active_discount?: boolean
}

interface ProductSize {
  size: string
  stock: number
}

interface Brand {
  id: string
  name: string
  image_url: string
  description: string
  is_active: boolean
}

export default function ProductsManagement() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false)
  const [inventoryProduct, setInventoryProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    brand_id: '',
    in_stock: true,
    thumbnail_url: '',
    additional_images: [''],
    sizes: [{ size: '', stock: 0 }],
    featured: false,
    discount_percentage: '',
    discount_amount: '',
    discount_start_date: '',
    discount_end_date: '',
    discount_active: false
  })
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [mainImageIndex, setMainImageIndex] = useState(0)

  useEffect(() => {
    if (user) {
      fetchProducts()
      fetchBrands()
    }
  }, [user])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
      .from('products_with_discounts')
      .select('*')
      .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setBrands(data || [])
    } catch (error) {
      console.error('Error fetching brands:', error)
      toast.error('Failed to fetch brands')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      brand_id: '',
      in_stock: true,
      thumbnail_url: '',
      additional_images: [''],
      sizes: [{ size: '', stock: 0 }],
      featured: false,
      discount_percentage: '',
      discount_amount: '',
      discount_start_date: '',
      discount_end_date: '',
      discount_active: false
    })
    setSelectedImages([])
    setMainImageIndex(0)
    setEditingProduct(null)
    setIsEditDialogOpen(false)
  }

  const addSize = () => {
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, { size: '', stock: 0 }]
    }))
  }

  const removeSize = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index)
    }))
  }

  const updateSize = (index: number, field: 'size' | 'stock', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.map((size, i) => 
        i === index ? { ...size, [field]: value } : size
      )
    }))
  }

  const handleCreateProduct = async () => {
    try {
      setIsLoading(true)
      
      // Upload images first if any are selected
      let imageUrls: string[] = []
      if (selectedImages.length > 0) {
        const uploadResults = await uploadProductImages(selectedImages)
        const successfulUploads = uploadResults.filter(result => result.success)
        
        if (successfulUploads.length !== selectedImages.length) {
          toast.error('Some images failed to upload')
          return
        }
        
        imageUrls = successfulUploads.map(result => result.url!).filter(Boolean)
      }

      // Prepare product data
      const thumbnailUrl = imageUrls[mainImageIndex] || ''
      const additionalImages = imageUrls.filter((_, index) => index !== mainImageIndex)
      
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        thumbnail_url: thumbnailUrl,
        additional_images: additionalImages,
        brand_id: formData.brand_id,
        in_stock: formData.in_stock,
        sizes: formData.sizes.filter(size => size.size.trim() !== ''),
        featured: formData.featured,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : null,
        discount_start_date: formData.discount_start_date || null,
        discount_end_date: formData.discount_end_date || null,
        discount_active: formData.discount_active
      }

      const { error } = await supabase
        .from('products')
        .insert([productData])

      if (error) throw error

      toast.success('Product created successfully!')
      setIsCreateDialogOpen(false)
      resetForm()
      fetchProducts()
    } catch (error) {
      console.error('Error creating product:', error)
      toast.error('Failed to create product')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditProduct = async () => {
    if (!editingProduct) return

    try {
      setIsUploading(true)
      
      // Upload new images if any
      let uploadedImageUrls: string[] = []
      if (selectedImages.length > 0) {
        const uploadResults = await uploadProductImages(selectedImages, editingProduct.id)
        uploadedImageUrls = uploadResults
          .filter(result => result.success)
          .map(result => result.url!)
        
        if (uploadResults.some(result => !result.success)) {
          toast.error('Some images failed to upload')
        }
      }

      // Combine existing images with new uploaded images
      const existingImages = formData.additional_images.filter(img => img.trim() !== '')
      const allImages = [...existingImages, ...uploadedImageUrls]
      
      // Set thumbnail from main image if not manually set
      let thumbnailUrl = formData.thumbnail_url
      if (!thumbnailUrl && allImages.length > 0) {
        thumbnailUrl = allImages[mainImageIndex] || allImages[0]
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        thumbnail_url: thumbnailUrl,
        additional_images: allImages,
        brand_id: formData.brand_id,
        in_stock: formData.in_stock,
        sizes: formData.sizes.filter(size => size.size.trim() !== ''),
        featured: formData.featured,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : null,
        discount_start_date: formData.discount_start_date || null,
        discount_end_date: formData.discount_end_date || null,
        discount_active: formData.discount_active
      }

      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id)

      if (error) throw error

      toast.success('Product updated successfully!')
      setIsEditDialogOpen(false)
      setEditingProduct(null)
      resetForm()
      fetchProducts()
    } catch (error) {
      console.error('Error updating product:', error)
      toast.error('Failed to update product')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      // Immediately update the local state to remove the product from UI
      setProducts(prevProducts => prevProducts.filter(product => product.id !== productId))
      
      toast.success('Product deleted successfully!')
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Failed to delete product')
      // Refetch products in case of error to ensure UI is in sync
      fetchProducts()
    }
  }

  const toggleFeatured = async (productId: string, currentFeatured: boolean) => {
    try {
      const newFeaturedStatus = !currentFeatured

      const { error } = await supabase
        .from('products')
        .update({ featured: newFeaturedStatus })
        .eq('id', productId)

      if (error) throw error

      // Update local state
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, featured: newFeaturedStatus }
            : product
        )
      )
      
      toast.success(newFeaturedStatus ? 'Product marked as featured!' : 'Product removed from featured!')
    } catch (error) {
      console.error('Error toggling featured status:', error)
      toast.error('Failed to update featured status')
    }
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        thumbnail_url: product.thumbnail_url || '',
        additional_images: product.additional_images?.length > 0 ? product.additional_images : [''],
        brand_id: product.brand_id,
        in_stock: product.in_stock,
        sizes: product.sizes?.length > 0 ? product.sizes : [{ size: '', stock: 0 }],
        featured: product.featured || false,
        discount_percentage: product.discount_percentage?.toString() || '',
        discount_amount: product.discount_amount?.toString() || '',
        discount_start_date: product.discount_start_date || '',
        discount_end_date: product.discount_end_date || '',
        discount_active: product.discount_active || false
      })
    setSelectedImages([])
    setMainImageIndex(0)
    setIsEditDialogOpen(true)
  }

  const openInventoryDialog = (product: Product) => {
    setInventoryProduct(product)
    setIsInventoryDialogOpen(true)
  }

  const handleStockAdjustment = async (productId: string, sizeIndex: number, adjustment: number) => {
    try {
      if (!inventoryProduct) return

      const updatedSizes = [...inventoryProduct.sizes]
      const currentStock = updatedSizes[sizeIndex].stock
      const newStock = Math.max(0, currentStock + adjustment)
      
      updatedSizes[sizeIndex] = {
        ...updatedSizes[sizeIndex],
        stock: newStock
      }

      const { error } = await supabase
        .from('products')
        .update({ sizes: updatedSizes })
        .eq('id', productId)

      if (error) throw error

      // Update local state
      setInventoryProduct(prev => prev ? { ...prev, sizes: updatedSizes } : null)
      
      // Update products list
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, sizes: updatedSizes }
          : product
      ))

      toast.success(`Stock ${adjustment > 0 ? 'increased' : 'decreased'} successfully`)
    } catch (error) {
      console.error('Error adjusting stock:', error)
      toast.error('Failed to adjust stock')
    }
  }



  const addImageField = () => {
    setFormData(prev => ({
      ...prev,
      additional_images: [...prev.additional_images, '']
    }))
  }

  const removeImageField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additional_images: prev.additional_images.filter((_, i) => i !== index)
    }))
  }

  const updateImageField = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      additional_images: prev.additional_images.map((img, i) => i === index ? value : img)
    }))
  }

  const getBrandName = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId)
    return brand?.name || 'Unknown Brand'
  }

  // Configurable inventory thresholds
  const LOW_STOCK_THRESHOLD = 10;
  const CRITICAL_STOCK_THRESHOLD = 5;

  // Inventory tracking helper functions
  const calculateTotalStock = (product: Product) => {
    return product.sizes?.reduce((total, size) => total + (size.stock || 0), 0) || 0
  }

  const isLowStock = (product: Product) => {
    const totalStock = calculateTotalStock(product)
    return totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD && totalStock > CRITICAL_STOCK_THRESHOLD
  }

  const isCriticalStock = (product: Product) => {
    const totalStock = calculateTotalStock(product)
    return totalStock > 0 && totalStock <= CRITICAL_STOCK_THRESHOLD
  }

  const isOutOfStock = (product: Product) => {
    return calculateTotalStock(product) === 0
  }

  const getStockStatus = (product: Product) => {
    const totalStock = calculateTotalStock(product)
    if (totalStock === 0) return { status: 'out', color: 'text-red-600', bgColor: 'bg-red-50', label: 'Out of Stock' }
    if (totalStock <= CRITICAL_STOCK_THRESHOLD) return { status: 'critical', color: 'text-red-500', bgColor: 'bg-red-50', label: 'Critical Stock' }
    if (totalStock <= LOW_STOCK_THRESHOLD) return { status: 'low', color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'Low Stock' }
    if (totalStock <= 20) return { status: 'medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50', label: 'Medium Stock' }
    return { status: 'good', color: 'text-green-600', bgColor: 'bg-green-50', label: 'Good Stock' }
  }

  const groupProductsByBrand = () => {
    // Filter products based on search query
    const filteredProducts = products.filter(product => {
      const searchLower = searchQuery.toLowerCase()
      const productName = product.name.toLowerCase()
      const brandName = getBrandName(product.brand_id).toLowerCase()
      
      return productName.includes(searchLower) || brandName.includes(searchLower)
    })
    
    const grouped = filteredProducts.reduce((acc, product) => {
      const brandId = product.brand_id
      if (!acc[brandId]) {
        acc[brandId] = []
      }
      acc[brandId].push(product)
      return acc
    }, {} as Record<string, Product[]>)
    
    return Object.entries(grouped).map(([brandId, products]) => ({
      brandId,
      brandName: getBrandName(brandId),
      products
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Products Management</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">Manage your product catalog</p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-sm">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  <span className="hidden sm:inline">Add Product</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Product</DialogTitle>
                  <DialogDescription>
                    Add a new product to your catalog
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Product Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter product name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Price (₦)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter product description"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="brand">Brand</Label>
                      <Select value={formData.brand_id} onValueChange={(value: string) => setFormData(prev => ({ ...prev, brand_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Sizes & Stock</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addSize}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Size
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {formData.sizes.map((size, index) => (
                        <div key={`size-${index}-${size.size}`} className="flex items-center gap-2">
                          <Input
                            placeholder="Size (e.g., S, M, L, XL)"
                            value={size.size}
                            onChange={(e) => updateSize(index, 'size', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Stock"
                            value={size.stock}
                            onChange={(e) => updateSize(index, 'stock', parseInt(e.target.value) || 0)}
                            className="w-24"
                            min="0"
                          />
                          {formData.sizes.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeSize(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Product Images</Label>
                    <MultiImageUpload
                      onImagesSelect={(files) => setSelectedImages(prev => [...prev, ...files])}
                      currentImages={[]}
                      onImageRemove={(index) => {
                        setSelectedImages(prev => prev.filter((_, i) => i !== index))
                        if (mainImageIndex >= selectedImages.length - 1) {
                          setMainImageIndex(0)
                        }
                      }}
                      maxImages={5}
                      mainImageIndex={mainImageIndex}
                      onMainImageChange={setMainImageIndex}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="in_stock"
                      checked={formData.in_stock}
                      onChange={(e) => setFormData(prev => ({ ...prev, in_stock: e.target.checked }))}
                    />
                    <Label htmlFor="in_stock">In Stock</Label>
                  </div>

                  {/* Discount Management */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="discount_active"
                        checked={formData.discount_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount_active: e.target.checked }))}
                      />
                      <Label htmlFor="discount_active">Enable Discount</Label>
                    </div>

                    {formData.discount_active && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="discount_percentage">Discount Percentage (%)</Label>
                            <Input
                              id="discount_percentage"
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={formData.discount_percentage}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                discount_percentage: e.target.value,
                                discount_amount: '' // Clear amount when percentage is set
                              }))}
                              placeholder="0.00"
                              disabled={!!formData.discount_amount}
                            />
                          </div>
                          <div>
                            <Label htmlFor="discount_amount">Discount Amount (₦)</Label>
                            <Input
                              id="discount_amount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.discount_amount}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                discount_amount: e.target.value,
                                discount_percentage: '' // Clear percentage when amount is set
                              }))}
                              placeholder="0.00"
                              disabled={!!formData.discount_percentage}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="discount_start_date">Start Date</Label>
                            <Input
                              id="discount_start_date"
                              type="datetime-local"
                              value={formData.discount_start_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, discount_start_date: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="discount_end_date">End Date</Label>
                            <Input
                              id="discount_end_date"
                              type="datetime-local"
                              value={formData.discount_end_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, discount_end_date: e.target.value }))}
                            />
                          </div>
                        </div>

                        {(formData.discount_percentage || formData.discount_amount) && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm text-blue-700">
                              <strong>Preview:</strong> 
                              {formData.discount_percentage 
                                ? ` ${formData.discount_percentage}% off` 
                                : ` ₦${formData.discount_amount} off`}
                              {formData.price && (
                                <span>
                                  {' '}(Final price: ₦
                                  {formData.discount_percentage 
                                    ? (parseFloat(formData.price) * (1 - parseFloat(formData.discount_percentage) / 100)).toFixed(2)
                                    : (parseFloat(formData.price) - parseFloat(formData.discount_amount)).toFixed(2)
                                  })
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProduct} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Product'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search products or brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-600 mt-2">
                {groupProductsByBrand().reduce((total, brand) => total + brand.products.length, 0)} product(s) found
              </p>
            )}
          </div>

          {/* Products List by Brand */}
          <div className="space-y-8">
            {groupProductsByBrand().length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No products found' : 'No products yet'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery 
                    ? `No products match "${searchQuery}". Try a different search term.`
                    : 'Get started by adding your first product to the catalog.'
                  }
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery('')}
                    className="mr-4"
                  >
                    Clear Search
                  </Button>
                )}
                <Button onClick={() => {
                  resetForm()
                  setIsCreateDialogOpen(true)
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            ) : (
              groupProductsByBrand().map((brandGroup) => (
                <div key={brandGroup.brandId} className="space-y-4">
                  <div className="flex items-center space-x-3 pb-2 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">{brandGroup.brandName}</h2>
                    <Badge variant="secondary" className="text-xs">
                      {brandGroup.products.length} product{brandGroup.products.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {brandGroup.products.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="w-10 h-12 sm:w-12 sm:h-16 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
                              {product.thumbnail_url ? (
                                <img 
                                  src={product.thumbnail_url} 
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate text-sm">{product.name}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {product.has_active_discount && product.discounted_price ? (
                                  <>
                                    <span className="font-semibold text-red-600 text-xs sm:text-sm">₦{product.discounted_price.toLocaleString()}</span>
                                    <span className="text-xs text-gray-500 line-through">₦{product.price.toLocaleString()}</span>
                                    <Badge variant="destructive" className="text-xs">
                                      {product.discount_percentage 
                                        ? `${product.discount_percentage}% OFF`
                                        : `₦${product.discount_amount?.toLocaleString()} OFF`
                                      }
                                    </Badge>
                                  </>
                                ) : (
                                  <span className="font-semibold text-blue-600 text-xs sm:text-sm">₦{product.price.toLocaleString()}</span>
                                )}
                                {product.sizes && product.sizes.length > 0 && (
                                  <span className="text-xs text-gray-500">
                                    {product.sizes.length} size{product.sizes.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStockStatus(product).bgColor} ${getStockStatus(product).color}`}>
                                  <BarChart3 className="w-3 h-3" />
                                  <span>{calculateTotalStock(product)} in stock</span>
                                </div>
                                {isCriticalStock(product) && (
                                  <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Critical Stock</span>
                                  </div>
                                )}
                                {isLowStock(product) && (
                                  <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Low Stock</span>
                                  </div>
                                )}
                                {isOutOfStock(product) && (
                                  <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                    <TrendingDown className="w-3 h-3" />
                                    <span>Out of Stock</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => toggleFeatured(product.id, product.featured)}
                                 className={`h-7 w-7 sm:h-8 sm:w-8 p-0 ${product.featured ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                 title={product.featured ? "Remove from featured" : "Mark as featured"}
                               >
                                 <Star className={`w-3 h-3 sm:w-4 sm:h-4 ${product.featured ? 'fill-current' : ''}`} />
                               </Button>
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => openInventoryDialog(product)}
                                 className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                 title="Adjust Inventory"
                               >
                                 <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                               </Button>
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => openEditDialog(product)}
                                 className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                               >
                                 <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                               </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Product Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Price (₦)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-brand">Brand</Label>
                <Select value={formData.brand_id} onValueChange={(value: string) => setFormData(prev => ({ ...prev, brand_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Sizes & Stock</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSize}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Size
                </Button>
              </div>
              <div className="space-y-2">
                {formData.sizes.map((size, index) => (
                  <div key={`edit-size-${index}-${size.size}`} className="flex items-center gap-2">
                    <Input
                      placeholder="Size (e.g., S, M, L, XL)"
                      value={size.size}
                      onChange={(e) => updateSize(index, 'size', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Stock"
                      value={size.stock}
                      onChange={(e) => updateSize(index, 'stock', parseInt(e.target.value) || 0)}
                      className="w-24"
                      min="0"
                    />
                    {formData.sizes.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSize(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Product Images</Label>
              <MultiImageUpload
                onImagesSelect={(files) => setSelectedImages(prev => [...prev, ...files])}
                currentImages={formData.additional_images.filter(img => img.trim() !== '')}
                onImageRemove={(index) => {
                  const newImages = [...formData.additional_images]
                  newImages.splice(index, 1)
                  setFormData(prev => ({ ...prev, additional_images: newImages }))
                }}
                maxImages={5}
                mainImageIndex={mainImageIndex}
                onMainImageChange={setMainImageIndex}
                disabled={isUploading}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Upload up to 5 images. The first image will be used as the thumbnail.
              </p>
            </div>

            <div>
              <Label htmlFor="edit-thumbnail">Thumbnail URL (Optional)</Label>
              <Input
                id="edit-thumbnail"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="Leave empty to use first uploaded image"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Override the thumbnail with a custom URL if needed
              </p>
            </div>

            <div>
              <Label>Additional Image URLs</Label>
              {formData.additional_images.map((image, index) => (
                <div key={`image-${index}-${image.substring(0, 20)}`} className="flex gap-2 mt-2">
                  <Input
                    value={image}
                    onChange={(e) => updateImageField(index, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  {formData.additional_images.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeImageField(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addImageField}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Image URL
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                You can also add images via URLs in addition to uploads
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-in_stock"
                checked={formData.in_stock}
                onChange={(e) => setFormData(prev => ({ ...prev, in_stock: e.target.checked }))}
              />
              <Label htmlFor="edit-in_stock">In Stock</Label>
            </div>

            {/* Discount Management Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold">Discount Settings</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-discount_active"
                    checked={formData.discount_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_active: e.target.checked }))}
                  />
                  <Label htmlFor="edit-discount_active">Enable Discount</Label>
                </div>
              </div>

              {formData.discount_active && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-discount_percentage">Discount Percentage (%)</Label>
                      <Input
                        id="edit-discount_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.discount_percentage}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          discount_percentage: e.target.value,
                          discount_amount: '' // Clear amount when percentage is set
                        }))}
                        placeholder="0.00"
                        disabled={!!formData.discount_amount}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-discount_amount">Discount Amount (₦)</Label>
                      <Input
                        id="edit-discount_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.discount_amount}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          discount_amount: e.target.value,
                          discount_percentage: '' // Clear percentage when amount is set
                        }))}
                        placeholder="0.00"
                        disabled={!!formData.discount_percentage}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-discount_start_date">Start Date</Label>
                      <Input
                        id="edit-discount_start_date"
                        type="datetime-local"
                        value={formData.discount_start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount_start_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-discount_end_date">End Date</Label>
                      <Input
                        id="edit-discount_end_date"
                        type="datetime-local"
                        value={formData.discount_end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount_end_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  {(formData.discount_percentage || formData.discount_amount) && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Preview:</strong> 
                        {formData.discount_percentage 
                          ? ` ${formData.discount_percentage}% off` 
                          : ` ₦${formData.discount_amount} off`}
                        {formData.price && (
                          <span>
                            {' '}(Final price: ₦
                            {formData.discount_percentage 
                              ? (parseFloat(formData.price) * (1 - parseFloat(formData.discount_percentage) / 100)).toFixed(2)
                              : (parseFloat(formData.price) - parseFloat(formData.discount_amount)).toFixed(2)
                            })
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleEditProduct} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Update Product'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory Adjustment Dialog */}
      <Dialog open={isInventoryDialogOpen} onOpenChange={setIsInventoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Inventory</DialogTitle>
            <DialogDescription>
              Update stock levels for {inventoryProduct?.name}
            </DialogDescription>
          </DialogHeader>
          
          {inventoryProduct && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Total Stock:</span>
                  <span className={`text-sm font-semibold ${getStockStatus(inventoryProduct).color}`}>
                    {calculateTotalStock(inventoryProduct)} units
                  </span>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full inline-block ${getStockStatus(inventoryProduct).bgColor} ${getStockStatus(inventoryProduct).color}`}>
                  {getStockStatus(inventoryProduct).label}
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Stock by Size</Label>
                {inventoryProduct.sizes?.map((size, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium text-sm">{size.size}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStockAdjustment(inventoryProduct.id, index, -1)}
                        disabled={size.stock <= 0}
                        className="h-8 w-8 p-0"
                      >
                        -
                      </Button>
                      <span className="w-12 text-center text-sm font-medium">{size.stock}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStockAdjustment(inventoryProduct.id, index, 1)}
                        className="h-8 w-8 p-0"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsInventoryDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}