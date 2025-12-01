"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Loader2, Search, Tag, Filter, Save, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Brand {
    id: string
    name: string
}

interface Product {
    id: string
    name: string
    price: number
    brand_id: string
    thumbnail_url: string
    discount_active: boolean
    discount_percentage: number | null
    discount_amount: number | null
    discounted_price?: number
}

export default function DiscountsPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [applying, setApplying] = useState(false)
    const [products, setProducts] = useState<Product[]>([])
    const [brands, setBrands] = useState<Brand[]>([])

    // Selection State
    const [selectionMode, setSelectionMode] = useState<'all' | 'brand' | 'manual'>('manual')
    const [selectedBrandId, setSelectedBrandId] = useState<string>('all')
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')

    // Discount Configuration State
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
    const [discountValue, setDiscountValue] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [productsResult, brandsResult] = await Promise.all([
                supabase
                    .from('products')
                    .select('id, name, price, brand_id, thumbnail_url, discount_active, discount_percentage, discount_amount')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('brands')
                    .select('id, name')
                    .order('name')
            ])

            if (productsResult.error) throw productsResult.error
            if (brandsResult.error) throw brandsResult.error

            setProducts(productsResult.data || [])
            setBrands(brandsResult.data || [])
        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = products.filter(product => {
        // 1. Filter by Search
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())

        // 2. Filter by Brand (if in brand mode or just filtering list)
        const matchesBrand = selectionMode === 'brand'
            ? (selectedBrandId === 'all' || product.brand_id === selectedBrandId)
            : true

        return matchesSearch && matchesBrand
    })

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = new Set(filteredProducts.map(p => p.id))
            setSelectedProductIds(allIds)
        } else {
            setSelectedProductIds(new Set())
        }
    }

    const handleSelectProduct = (productId: string, checked: boolean) => {
        const newSelected = new Set(selectedProductIds)
        if (checked) {
            newSelected.add(productId)
        } else {
            newSelected.delete(productId)
        }
        setSelectedProductIds(newSelected)
    }

    const calculateDiscountedPrice = (price: number) => {
        const value = parseFloat(discountValue)
        if (isNaN(value) || value <= 0) return price

        if (discountType === 'percentage') {
            return price - (price * (value / 100))
        } else {
            return Math.max(0, price - value)
        }
    }

    const handleApplyDiscount = async () => {
        const value = parseFloat(discountValue)
        if (isNaN(value) || value <= 0) {
            toast.error('Please enter a valid discount value')
            return
        }

        if (selectionMode === 'manual' && selectedProductIds.size === 0) {
            toast.error('Please select at least one product')
            return
        }

        if (selectionMode === 'brand' && selectedBrandId === 'all') {
            toast.error('Please select a brand')
            return
        }

        try {
            setApplying(true)

            // Determine which products to update
            let query = supabase.from('products').update({
                discount_active: true,
                discount_percentage: discountType === 'percentage' ? value : null,
                discount_amount: discountType === 'fixed' ? value : null,
                discount_start_date: startDate || null,
                discount_end_date: endDate || null
            })

            if (selectionMode === 'all') {
                // No filter, update all
            } else if (selectionMode === 'brand') {
                query = query.eq('brand_id', selectedBrandId)
            } else {
                query = query.in('id', Array.from(selectedProductIds))
            }

            const { error } = await query

            if (error) throw error

            toast.success('Discounts applied successfully!')
            fetchData() // Refresh data

            // Reset selection
            setSelectedProductIds(new Set())
        } catch (error) {
            console.error('Error applying discount:', error)
            toast.error('Failed to apply discounts')
        } finally {
            setApplying(false)
        }
    }

    const handleClearDiscounts = async () => {
        if (!confirm('Are you sure you want to remove discounts from the selected scope?')) return

        try {
            setApplying(true)

            let query = supabase.from('products').update({
                discount_active: false,
                discount_percentage: null,
                discount_amount: null,
                discount_start_date: null,
                discount_end_date: null
            })

            if (selectionMode === 'all') {
                // No filter
            } else if (selectionMode === 'brand') {
                if (selectedBrandId === 'all') {
                    toast.error('Please select a brand')
                    setApplying(false)
                    return
                }
                query = query.eq('brand_id', selectedBrandId)
            } else {
                if (selectedProductIds.size === 0) {
                    toast.error('Please select products')
                    setApplying(false)
                    return
                }
                query = query.in('id', Array.from(selectedProductIds))
            }

            const { error } = await query

            if (error) throw error

            toast.success('Discounts removed successfully!')
            fetchData()
        } catch (error) {
            console.error('Error removing discounts:', error)
            toast.error('Failed to remove discounts')
        } finally {
            setApplying(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Product Discounts</h1>
                    <p className="text-gray-600">Manage bulk discounts for your products</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Discount Settings</CardTitle>
                                <CardDescription>Configure the discount to apply</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Discount Type</Label>
                                    <Select
                                        value={discountType}
                                        onValueChange={(v: 'percentage' | 'fixed') => setDiscountType(v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            <SelectItem value="fixed">Fixed Amount (₦)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Value</Label>
                                    <Input
                                        type="number"
                                        placeholder={discountType === 'percentage' ? "e.g. 10" : "e.g. 5000"}
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Start Date (Optional)</Label>
                                        <Input
                                            type="datetime-local"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Date (Optional)</Label>
                                        <Input
                                            type="datetime-local"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                        onClick={handleApplyDiscount}
                                        disabled={applying}
                                    >
                                        {applying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                        Apply Discount
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                        onClick={handleClearDiscounts}
                                        disabled={applying}
                                    >
                                        Clear Discounts
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Note</AlertTitle>
                            <AlertDescription>
                                Applying a discount will overwrite any existing discounts on the selected products.
                            </AlertDescription>
                        </Alert>
                    </div>

                    {/* Selection Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Select Products</CardTitle>
                                        <CardDescription>Choose which products to discount</CardDescription>
                                    </div>
                                    <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
                                        <Button
                                            variant={selectionMode === 'manual' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setSelectionMode('manual')}
                                            className={selectionMode === 'manual' ? 'shadow-sm bg-white hover:bg-white' : ''}
                                        >
                                            Manual
                                        </Button>
                                        <Button
                                            variant={selectionMode === 'brand' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setSelectionMode('brand')}
                                            className={selectionMode === 'brand' ? 'shadow-sm bg-white hover:bg-white' : ''}
                                        >
                                            By Brand
                                        </Button>
                                        <Button
                                            variant={selectionMode === 'all' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setSelectionMode('all')}
                                            className={selectionMode === 'all' ? 'shadow-sm bg-white hover:bg-white' : ''}
                                        >
                                            All Products
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 flex flex-col space-y-4">
                                {/* Filters */}
                                <div className="flex gap-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            placeholder="Search products..."
                                            className="pl-10"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    {(selectionMode === 'brand' || selectionMode === 'manual') && (
                                        <Select
                                            value={selectedBrandId}
                                            onValueChange={setSelectedBrandId}
                                        >
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Filter by Brand" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Brands</SelectItem>
                                                {brands.map(brand => (
                                                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                {/* Product List */}
                                <div className="border rounded-md flex-1 overflow-hidden flex flex-col min-h-[400px]">
                                    <div className="bg-gray-50 p-3 border-b flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            {selectionMode === 'manual' && (
                                                <Checkbox
                                                    checked={filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length}
                                                    onCheckedChange={handleSelectAll}
                                                />
                                            )}
                                            <span className="text-sm font-medium text-gray-700">
                                                {filteredProducts.length} Products Found
                                            </span>
                                        </div>
                                        {selectionMode === 'manual' && (
                                            <span className="text-sm text-blue-600 font-medium">
                                                {selectedProductIds.size} Selected
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                        {filteredProducts.map(product => {
                                            const isSelected = selectedProductIds.has(product.id)
                                            const previewPrice = calculateDiscountedPrice(product.price)

                                            return (
                                                <div
                                                    key={product.id}
                                                    className={`flex items-center p-3 rounded-lg border transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-gray-100'
                                                        }`}
                                                >
                                                    {selectionMode === 'manual' && (
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                                                            className="mr-4"
                                                        />
                                                    )}

                                                    <div className="w-12 h-12 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                                                        {product.thumbnail_url && (
                                                            <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
                                                        )}
                                                    </div>

                                                    <div className="ml-4 flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-medium text-gray-900">{product.name}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-sm text-gray-500">
                                                                        ₦{product.price.toLocaleString()}
                                                                    </span>
                                                                    {discountValue && (
                                                                        <>
                                                                            <span className="text-gray-400">→</span>
                                                                            <span className="text-sm font-medium text-green-600">
                                                                                ₦{previewPrice.toLocaleString()}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {product.discount_active && (
                                                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                                    {product.discount_percentage ? `-${product.discount_percentage}%` : `-${product.discount_amount}`}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {filteredProducts.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                                <Tag className="w-12 h-12 mb-2 opacity-20" />
                                                <p>No products found matching your filters</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
