"use client"

import { useState, useEffect } from "react"
import { getSubmissionPhotos, getPhotoUrl } from "../../lib/storage"

export default function TestPhotosPage() {
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPhotos()
  }, [])

  const loadPhotos = async () => {
    try {
      // Use a submission ID that we know has photos
      const submissionId = "586f8f9b-6afe-4dd6-9458-26e80b962899"
      const photoData = await getSubmissionPhotos(submissionId)
      console.log("Test page: Loaded photos:", photoData)
      setPhotos(photoData)
    } catch (error) {
      console.error("Error loading photos:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading photos...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Photo Test Page</h1>
      <p className="mb-4">Found {photos.length} photos</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Photo {photo.id}</h3>
            <p>Category: {photo.survey_category}</p>
            <p>File: {photo.file_name}</p>
            <p>Location: {photo.location_x}, {photo.location_y}</p>
            <p>Floor: {photo.floor_level}</p>
            
            <div className="mt-4">
              <img
                src={`/api/photos/${photo.id}`}
                alt={photo.caption || "Test photo"}
                className="w-full h-48 object-cover rounded-lg border"
                onLoad={() => console.log(`Image loaded: ${photo.id}`)}
                onError={(e) => console.error(`Image failed to load: ${photo.id}`, e)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 