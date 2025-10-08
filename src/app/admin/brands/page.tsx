"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ImageUpload } from "@/components/ui/image-upload"

import {
  Edit,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { uploadBrandImage, deleteBrandImage } from "@/lib/storage"

interface Brand {
  id: string
  name: string
  image_url: string
  description: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function BrandsManagement() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Brand>>({})
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const router = useRouter()
  const { user, loading: authLoading, isAdmin } = useAuth()

  useEffect(() => {
    if (!authLoading) {
      console.log('Auth state:', { user: user?.email, isAdmin, userId: user?.id })
      if (!user || !isAdmin) {
        router.push("/admin/login")
        return
      }
      loadBrands()
    }
  }, [user, isAdmin, authLoading, router])

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setBrands(data || [])
    } catch (error) {
      console.error('Error loading brands:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (brand: Brand) => {
    setEditingId(brand.id)
    setEditForm(brand)
  }

  const handleSave = async () => {
    if (!editingId || !editForm) return

    try {
      setUploadingImage(true)
      let imageUrl = editForm.image_url

      // Upload new image if selected
      if (selectedImageFile) {
        const uploadResult = await uploadBrandImage(selectedImageFile, editingId)
        if (uploadResult.success && uploadResult.url) {
          imageUrl = uploadResult.url
          
          // Delete old image if it exists and is different
          if (editForm.image_url && editForm.image_url !== imageUrl) {
            await deleteBrandImage(editForm.image_url)
          }
        } else {
          throw new Error(uploadResult.error || 'Failed to upload image')
        }
      }

      const { error } = await supabase
        .from('brands')
        .update({
          name: editForm.name,
          image_url: imageUrl,
          description: editForm.description,
          is_active: editForm.is_active
        })
        .eq('id', editingId)

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      await loadBrands()
      setEditingId(null)
      setEditForm({})
      setSelectedImageFile(null)
    } catch (error) {
      console.error('Error updating brand:', error)
      alert(`Error updating brand: ${JSON.stringify(error)}`)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({})
    setSelectedImageFile(null)
  }

  const handleImageSelect = (file: File) => {
    setSelectedImageFile(file)
  }

  const handleImageRemove = () => {
    setSelectedImageFile(null)
    setEditForm({...editForm, image_url: ''})
  }

  const toggleActive = async (brand: Brand) => {
    try {
      const { error } = await supabase
        .from('brands')
        .update({ is_active: !brand.is_active })
        .eq('id', brand.id)

      if (error) throw error
      await loadBrands()
    } catch (error) {
      console.error('Error toggling brand status:', error)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading brands...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white w-full overflow-auto">
      <div>
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black">Brands Management</h1>
                <p className="text-gray-600">Manage your brand thumbnails and information</p>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => alert(`User: ${user?.email}, Admin: ${isAdmin}, ID: ${user?.id}`)}
                  variant="outline"
                  size="sm"
                >
                  Debug User Info
                </Button>
                <Badge className="bg-yellow-500 text-black">
                  {brands.filter(b => b.is_active).length} Active Brands
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {brands.map((brand, index) => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-white/90 shadow-lg border-0 overflow-hidden">
                  <div className="relative">
                    <img
                      src={editingId === brand.id ? editForm.image_url || brand.image_url : brand.image_url}
                      alt={brand.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleActive(brand)}
                        className="bg-white/80 hover:bg-white"
                      >
                        {brand.is_active ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    <Badge 
                      className={`absolute top-2 left-2 ${
                        brand.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'
                      }`}
                    >
                      {brand.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {editingId === brand.id ? (
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor={`name-${brand.id}`} className="text-black">Brand Name</Label>
                              <Input
                                id={`name-${brand.id}`}
                                value={editForm.name || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, name: e.target.value})}
                                className="border-gray-200 focus:border-yellow-500 focus:ring-yellow-500"
                              />
                            </div>
                            <div>
                              <Label className="text-black">Brand Image</Label>
                              <ImageUpload
                                onImageSelect={handleImageSelect}
                                currentImageUrl={editForm.image_url}
                                onImageRemove={handleImageRemove}
                                disabled={uploadingImage}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <CardTitle className="text-black">{brand.name}</CardTitle>
                            <CardDescription className="text-gray-600">
                              Order: {brand.display_order}
                            </CardDescription>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {editingId === brand.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={uploadingImage}
                              className="bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
                            >
                              {uploadingImage ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                              className="border-gray-200 hover:bg-gray-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleEdit(brand)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-black"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {editingId === brand.id ? (
                      <div>
                        <Label htmlFor={`desc-${brand.id}`} className="text-black">Description</Label>
                        <Textarea
                          id={`desc-${brand.id}`}
                          value={editForm.description || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditForm({...editForm, description: e.target.value})}
                          className="border-gray-200 focus:border-yellow-500 focus:ring-yellow-500 mt-1"
                          rows={3}
                        />
                      </div>
                    ) : (
                      <p className="text-gray-600 text-sm">{brand.description}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Card className="bg-blue-50/50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Brand Management Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-700 space-y-2">
                <p>• Click the edit button to modify brand name, image URL, and description</p>
                <p>• Use the eye icon to toggle brand visibility on the main page</p>
                <p>• Image URLs should be high-quality and properly sized (recommended: 400x300px)</p>
                <p>• Changes are saved to Supabase and will appear immediately on the main site</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}