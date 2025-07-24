"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, Upload, X, ImageIcon, Loader2, MapPin, Check } from "lucide-react"
import { uploadSurveyPhoto, updatePhotoLocation, type PhotoUpload } from "../lib/storage"
import { compressImage } from "../lib/image-utils"
import { FloorplanModal } from "./floorplan-modal"

interface PhotoUploadProps {
  submissionId?: string
  surveyCategory: string
  questionKey?: string
  roomNumber?: string
  onPhotoUploaded?: (photoId: string) => void
  disabled?: boolean
}

export function PhotoUploadComponent({
  submissionId,
  surveyCategory,
  questionKey,
  roomNumber,
  onPhotoUploaded,
  disabled = false,
}: PhotoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFloorplanModal, setShowFloorplanModal] = useState(false)
  const [pendingPhotoId, setPendingPhotoId] = useState<string | null>(null)
  const [photoLocation, setPhotoLocation] = useState<{ x: number; y: number; floor: string } | null>(null)
  const [locationSaved, setLocationSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      setError("File size must be less than 10MB")
      return
    }

    try {
      // Compress image
      const compressedFile = await compressImage(file)
      setSelectedFile(compressedFile)

      // Create preview
      const previewUrl = URL.createObjectURL(compressedFile)
      setPreview(previewUrl)
      setError(null)
    } catch (err) {
      setError("Error processing image")
      console.error(err)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !submissionId) {
      setError(!selectedFile ? "Please select a file first" : "Survey session not ready")
      return
    }

    setUploading(true)
    setError(null)

    try {
      const photoData: PhotoUpload = {
        file: selectedFile,
        submissionId,
        surveyCategory,
        questionKey,
        roomNumber,
        caption: caption.trim() || undefined,
      }

      const result = await uploadSurveyPhoto(photoData)

      // Store the photo ID and show floorplan modal
      setPendingPhotoId(result.id)
      setShowFloorplanModal(true)

      console.log("Photo uploaded successfully:", result.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      console.error("Upload error:", err)
      setUploading(false)
    }
  }

  const handleLocationSelected = async (x: number, y: number, floor: string) => {
    if (!pendingPhotoId) {
      console.error("No pending photo ID for location update")
      return
    }

    try {
      // Update the photo record with location information
      const updatedRecord = await updatePhotoLocation(pendingPhotoId, x, y, floor)

      setPhotoLocation({ x, y, floor })
      setLocationSaved(true)

      console.log("Photo location saved:", {
        photoId: pendingPhotoId,
        x: x.toFixed(2),
        y: y.toFixed(2),
        floor,
      })

      // Complete the upload process
      completeUpload()
    } catch (err) {
      console.error("Error saving photo location:", err)
      setError("Failed to save photo location")
      // Still complete the upload even if location save fails
      completeUpload()
    }
  }

  const completeUpload = () => {
    // Clear form and complete upload
    setSelectedFile(null)
    setPreview(null)
    setCaption("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""

    setUploading(false)

    if (pendingPhotoId) {
      onPhotoUploaded?.(pendingPhotoId)
      setPendingPhotoId(null)
    }

    // Reset location state after a delay to show success message
    setTimeout(() => {
      setPhotoLocation(null)
      setLocationSaved(false)
    }, 3000)
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setPreview(null)
    setCaption("")
    setError(null)
    setPhotoLocation(null)
    setLocationSaved(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  if (disabled || !submissionId) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-4 text-center text-gray-500">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">{!submissionId ? "Starting survey session..." : "Photo upload not available"}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-blue-200">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-5 h-5 text-blue-600" />
            <Label className="text-sm font-medium text-gray-700">Add Photo (Optional)</Label>
          </div>

          {!selectedFile ? (
            <div className="space-y-3">
              {/* Camera Input */}
              <div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
              </div>

              {/* File Input */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose from Gallery
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Preview */}
              <div className="relative">
                <img
                  src={preview! || "/placeholder.svg"}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Caption */}
              <div className="space-y-2">
                <Label htmlFor="caption" className="text-sm font-medium text-gray-700">
                  Caption (Optional)
                </Label>
                <Textarea
                  id="caption"
                  placeholder="Describe what this photo shows..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="min-h-[60px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">{caption.length}/500 characters</p>
              </div>

              {/* Upload Button */}
              <Button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Location Success Info */}
          {locationSaved && photoLocation && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-800">
                  <span className="font-medium">Photo uploaded and location saved!</span>
                  <br />
                  Location: {photoLocation.x.toFixed(1)}%, {photoLocation.y.toFixed(1)}% on {photoLocation.floor} floor
                </p>
              </div>
            </div>
          )}

          {/* Location Info (during upload process) */}
          {!locationSaved && photoLocation && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-800">
                  Location marked on {photoLocation.floor} floor: {photoLocation.x.toFixed(1)}%,{" "}
                  {photoLocation.y.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floorplan Modal */}
      <FloorplanModal
        isOpen={showFloorplanModal}
        onClose={() => {
          setShowFloorplanModal(false)
          // If user closes without selecting location, still complete the upload
          if (pendingPhotoId) {
            completeUpload()
          }
        }}
        onLocationSelected={handleLocationSelected}
        photoId={pendingPhotoId || undefined}
      />
    </>
  )
}

export { PhotoUploadComponent as PhotoUpload }
