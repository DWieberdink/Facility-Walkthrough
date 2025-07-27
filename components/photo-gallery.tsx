"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImageIcon, Download, Trash2, Eye, X, MapPin, Building } from "lucide-react"
import { getSubmissionPhotos, getPhotoUrl, deletePhoto, type PhotoRecord } from "../lib/storage"
import Image from "next/image"

interface PhotoGalleryProps {
  submissionId: string
  canDelete?: boolean
}

export function PhotoGallery({ submissionId, canDelete = false }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    loadPhotos()
  }, [submissionId])

  const loadPhotos = async () => {
    try {
      const photoData = await getSubmissionPhotos(submissionId)
      console.log("Loaded photo data:", photoData)
      setPhotos(photoData)

      // Load URLs for all photos
      const urls: Record<string, string> = {}
      for (const photo of photoData) {
        try {
          const url = await getPhotoUrl(photo.id)
          urls[photo.id] = url
          console.log(`Photo ${photo.id} URL:`, url)
          
          // Test if the URL is accessible
          const testResponse = await fetch(url, { method: 'HEAD' })
          console.log(`Photo ${photo.id} accessibility:`, testResponse.status, testResponse.statusText)
        } catch (err) {
          console.error(`Error loading URL for photo ${photo.id}:`, err)
        }
      }
      setPhotoUrls(urls)
      console.log("All photo URLs:", urls)
    } catch (error) {
      console.error("Error loading photos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return

    try {
      await deletePhoto(photoId)
      setPhotos(photos.filter((p) => p.id !== photoId))
      setPhotoUrls((prev) => {
        const updated = { ...prev }
        delete updated[photoId]
        return updated
      })
    } catch (error) {
      console.error("Error deleting photo:", error)
      alert("Failed to delete photo")
    }
  }

  const downloadPhoto = async (photo: PhotoRecord) => {
    const url = photoUrls[photo.id]
    if (!url) {
      console.error("No URL available for photo:", photo.id)
      return
    }

    try {
      console.log(`Downloading photo ${photo.id} from:`, url)
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const blob = await response.blob()
      console.log(`Downloaded blob size:`, blob.size, 'bytes')
      
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = photo.file_name || `photo-${photo.id}.jpg`
      a.click()

      URL.revokeObjectURL(downloadUrl)
      console.log(`✅ Download initiated for photo ${photo.id}`)
    } catch (error) {
      console.error("❌ Error downloading photo:", error)
      alert(`Failed to download photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getFloorBadge = (floorLevel: string | null | undefined) => {
    if (!floorLevel || floorLevel === "unknown") return null

    const floorText = floorLevel === "first" ? "1st Floor" : floorLevel === "second" ? "2nd Floor" : floorLevel
    const colorClass =
      floorLevel === "first"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-green-50 text-green-700 border-green-200"

    return (
      <Badge variant="outline" className={`text-xs ${colorClass}`}>
        <Building className="w-3 h-3 mr-1" />
        {floorText}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading photos...</p>
        </CardContent>
      </Card>
    )
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No photos uploaded</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600" />
            Survey Photos ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="space-y-2">
                <div className="relative group">
                  {photoUrls[photo.id] ? (
                    <img
                      src={photoUrls[photo.id] || "/placeholder.svg"}
                      alt={photo.caption || "Survey photo"}
                      className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedPhoto(photo)}
                      onLoad={() => console.log(`✅ Image loaded successfully for photo ${photo.id}`)}
                      onError={(e) => {
                        console.error(`❌ Image failed to load for photo ${photo.id}:`, e)
                        console.error(`❌ Image URL: ${photoUrls[photo.id]}`)
                        console.error(`❌ Image target:`, e.target)
                      }}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 rounded-lg border flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                      <span className="text-xs text-gray-500 ml-2">No URL available</span>
                    </div>
                  )}

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPhoto(photo)}
                        className="bg-white/90 hover:bg-white"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadPhoto(photo)}
                        className="bg-white/90 hover:bg-white"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(photo.id)}
                          className="bg-white/90 hover:bg-white text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {photo.survey_category}
                    </Badge>
                    {photo.room_number && (
                      <Badge variant="outline" className="text-xs">
                        Room {photo.room_number}
                      </Badge>
                    )}
                    {getFloorBadge(photo.floor_level)}
                    {photo.location_x !== null && photo.location_y !== null && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <MapPin className="w-3 h-3 mr-1" />
                        Located
                      </Badge>
                    )}
                  </div>

                  {photo.caption && <p className="text-sm text-gray-600 line-clamp-2">{photo.caption}</p>}

                  <p className="text-xs text-gray-500">{new Date(photo.uploaded_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{selectedPhoto.survey_category}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {selectedPhoto.room_number && (
                    <p className="text-sm text-gray-600">Room {selectedPhoto.room_number}</p>
                  )}
                  {getFloorBadge(selectedPhoto.floor_level)}
                </div>
                {selectedPhoto.location_x !== null && selectedPhoto.location_y !== null && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-green-600" />
                    <p className="text-xs text-green-600">
                      Location: {selectedPhoto.location_x?.toFixed(1)}%, {selectedPhoto.location_y?.toFixed(1)}%
                      {selectedPhoto.floor_level &&
                        selectedPhoto.floor_level !== "unknown" &&
                        ` on ${selectedPhoto.floor_level} floor`}
                    </p>
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={() => setSelectedPhoto(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4">
              {photoUrls[selectedPhoto.id] && (
                <img
                  src={photoUrls[selectedPhoto.id] || "/placeholder.svg"}
                  alt={selectedPhoto.caption || "Survey photo"}
                  className="w-full max-h-[60vh] object-contain rounded-lg"
                />
              )}

              {selectedPhoto.caption && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{selectedPhoto.caption}</p>
                </div>
              )}

              <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                <span>Uploaded: {new Date(selectedPhoto.uploaded_at).toLocaleString()}</span>
                <span>
                  Size: {selectedPhoto.file_size ? `${Math.round(selectedPhoto.file_size / 1024)} KB` : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
