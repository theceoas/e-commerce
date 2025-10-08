'use client'

import React, { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Star } from 'lucide-react'
import { Button } from './button'
import { Badge } from './badge'

interface MultiImageUploadProps {
  onImagesSelect: (files: File[]) => void
  currentImages?: string[]
  onImageRemove?: (index: number) => void
  className?: string
  disabled?: boolean
  maxImages?: number
  mainImageIndex?: number
  onMainImageChange?: (index: number) => void
}

export function MultiImageUpload({
  onImagesSelect,
  currentImages = [],
  onImageRemove,
  className = '',
  disabled = false,
  maxImages = 5,
  mainImageIndex = 0,
  onMainImageChange
}: MultiImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    const remainingSlots = maxImages - (currentImages.length + previewUrls.length)
    const filesToAdd = imageFiles.slice(0, remainingSlots)
    
    if (filesToAdd.length > 0) {
      const newPreviewUrls = filesToAdd.map(file => URL.createObjectURL(file))
      setPreviewUrls(prev => [...prev, ...newPreviewUrls])
      onImagesSelect(filesToAdd)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (disabled) return
    
    const files = Array.from(e.dataTransfer.files)
    handleFileSelect(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleRemoveImage = (index: number) => {
    const totalImages = currentImages.length + previewUrls.length
    
    if (index < currentImages.length) {
      // Removing from current images
      onImageRemove?.(index)
    } else {
      // Removing from preview images
      const previewIndex = index - currentImages.length
      const newPreviewUrls = [...previewUrls]
      URL.revokeObjectURL(newPreviewUrls[previewIndex])
      newPreviewUrls.splice(previewIndex, 1)
      setPreviewUrls(newPreviewUrls)
    }
  }

  const handleSetMainImage = (index: number) => {
    onMainImageChange?.(index)
  }

  const allImages = [...currentImages, ...previewUrls]
  const canAddMore = allImages.length < maxImages

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Image Grid */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allImages.map((imageUrl, index) => (
            <div key={`image-${index}-${imageUrl.substring(imageUrl.lastIndexOf('/') + 1, imageUrl.lastIndexOf('/') + 21)}`} className="relative group">
              <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Main image indicator */}
                {index === mainImageIndex && (
                  <Badge className="absolute top-2 left-2 bg-yellow-500 text-black">
                    <Star className="h-3 w-3 mr-1" />
                    Main
                  </Badge>
                )}
                
                {/* Action buttons */}
                {!disabled && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      {index !== mainImageIndex && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSetMainImage(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveImage(index)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />
          
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 text-gray-400">
              {isDragOver ? (
                <Upload className="w-full h-full" />
              ) : (
                <ImageIcon className="w-full h-full" />
              )}
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragOver ? 'Drop images here' : 'Upload product images'}
              </p>
              <p className="text-sm text-gray-500">
                Drag and drop images, or click to select
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG, GIF up to 10MB each • {allImages.length}/{maxImages} images
              </p>
            </div>
            
            {!disabled && (
              <Button type="button" variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      {allImages.length > 0 && (
        <div className="text-sm text-gray-500 space-y-1">
          <p>• The first image (marked with ⭐) will be used as the main product image</p>
          <p>• Click the star icon on any image to set it as the main image</p>
          <p>• Hover over images to see action buttons</p>
        </div>
      )}
    </div>
  )
}