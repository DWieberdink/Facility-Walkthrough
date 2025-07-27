"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, MapPin, Building, Users, Camera, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import Image from "next/image"
import { getFloorPlanUrlForBuilding, getAvailableBuildings, getAvailableFloors } from "../lib/floorplan-utils"

interface PhotoRecord {
  id: string
  submission_id: string
  survey_category: string
  question_key: string | null
  room_number: string | null
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  caption: string | null
  uploaded_at: string
  location_x?: number | null
  location_y?: number | null
  floor_level?: string | null
  building?: string | null
}

interface SubmissionWithPhotos {
  id: string
  created_at: string
  walkers: {
    name: string
    email: string | null
    school: string
  }
  photos: PhotoRecord[]
}

interface FloorplanGalleryProps {
  isOpen: boolean
  onClose: () => void
  submissions: SubmissionWithPhotos[]
  selectedBuilding?: string
  selectedFloor?: string
}

export function FloorplanGallery({ isOpen, onClose, submissions, selectedBuilding, selectedFloor }: FloorplanGalleryProps) {
  const [currentBuilding, setCurrentBuilding] = useState<string>("")
  const [currentFloor, setCurrentFloor] = useState<string>("first")
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [availableBuildings, setAvailableBuildings] = useState<string[]>([])
  const [availableFloors, setAvailableFloors] = useState<string[]>([])
  const [loadingBuildings, setLoadingBuildings] = useState(false)
  const [loadingFloors, setLoadingFloors] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Filter photos for current building and floor
  const getPhotosForCurrentFloor = () => {
    const floor = selectedFloor || currentFloor
    
    console.log("Filtering photos:", {
      currentBuilding,
      floor,
      totalPhotos: submissions.flatMap(sub => sub.photos).length,
      submissions: submissions.length
    })
    
    const allPhotos = submissions.flatMap(sub => sub.photos)
    console.log("All photos:", allPhotos.map(p => ({
      id: p.id,
      building: p.building,
      floor_level: p.floor_level,
      location_x: p.location_x,
      location_y: p.location_y
    })))
    
    // Temporarily show all photos with location data for debugging
    const filteredPhotos = allPhotos.filter(photo => {
      const hasLocation = photo.location_x !== null && photo.location_y !== null
      
      console.log(`Photo ${photo.id}:`, {
        hasLocation,
        photoBuilding: photo.building,
        photoFloor: photo.floor_level,
        photoLocation: `${photo.location_x}, ${photo.location_y}`
      })
      
      return hasLocation // Show all photos with location data
    })
    
    console.log("Filtered photos:", filteredPhotos.length)
    return filteredPhotos
  }

  const photosOnFloor = getPhotosForCurrentFloor()

  const [floorplanUrl, setFloorplanUrl] = useState<string>("/floorplan.jpg")
  const [loadingFloorplan, setLoadingFloorplan] = useState(false)

  // Load available buildings when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadBuildings = async () => {
        setLoadingBuildings(true)
        try {
          const buildings = await getAvailableBuildings()
          console.log("Available buildings:", buildings)
          setAvailableBuildings(buildings)
          
          // Set the first building as current if available
          if (buildings.length > 0) {
            const firstBuilding = buildings[0]
            setCurrentBuilding(firstBuilding)
            
            // Load floors for the first building
            const floors = await getAvailableFloors(firstBuilding)
            console.log("Available floors for", firstBuilding, ":", floors)
            setAvailableFloors(floors)
            if (floors.length > 0) {
              setCurrentFloor(floors[0])
            }
          }
        } catch (error) {
          console.error("Error loading buildings:", error)
          setAvailableBuildings([])
        } finally {
          setLoadingBuildings(false)
        }
      }
      
      loadBuildings()
    }
  }, [isOpen])

  // Load floors when building changes
  useEffect(() => {
    if (currentBuilding) {
      const loadFloors = async () => {
        setLoadingFloors(true)
        try {
          const floors = await getAvailableFloors(currentBuilding)
          setAvailableFloors(floors)
          if (floors.length > 0) {
            setCurrentFloor(floors[0])
          }
        } catch (error) {
          console.error("Error loading floors:", error)
          setAvailableFloors([])
        } finally {
          setLoadingFloors(false)
        }
      }
      
      loadFloors()
    }
  }, [currentBuilding])

  // Update floorplan URL when building and floor change
  useEffect(() => {
    if (currentBuilding && currentFloor) {
      setLoadingFloorplan(true)
      getFloorPlanUrlForBuilding(currentBuilding, currentFloor)
        .then(url => {
          if (url) {
            setFloorplanUrl(url)
          } else {
            // Fallback to static files if no floor plan found in Supabase
            if (currentFloor === "first") {
              setFloorplanUrl("/floorplan.jpg")
            } else if (currentFloor === "second") {
              setFloorplanUrl("/second-floor-plan.jpg")
            } else {
              setFloorplanUrl("/floorplan.jpg")
            }
          }
        })
        .catch(() => {
          // Fallback to static files if error
          if (currentFloor === "first") {
            setFloorplanUrl("/floorplan.jpg")
          } else if (currentFloor === "second") {
            setFloorplanUrl("/second-floor-plan.jpg")
          } else {
            setFloorplanUrl("/floorplan.jpg")
          }
        })
        .finally(() => {
          setLoadingFloorplan(false)
        })
    }
  }, [currentBuilding, currentFloor])

  const getFloorplanImage = () => {
    return floorplanUrl
  }

  const getFloorplanAlt = () => {
    if (currentFloor === "first") {
      return "School Floorplan - First Floor"
    } else if (currentFloor === "second") {
      return "School Floorplan - Second Floor"
    }
    return "School Floorplan"
  }

  const handlePhotoClick = (photo: PhotoRecord) => {
    setSelectedPhoto(photo)
    setShowPhotoModal(true)
  }

  const closePhotoModal = () => {
    setShowPhotoModal(false)
    setSelectedPhoto(null)
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo? This action cannot be undone.")) {
      return
    }

    setDeletingPhoto(photoId)
    try {
      const response = await fetch("/api/photos/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoId }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete photo")
      }

      // Refresh the page to update the photo list
      window.location.reload()
    } catch (error) {
      console.error("Error deleting photo:", error)
      alert("Failed to delete photo. Please try again.")
    } finally {
      setDeletingPhoto(null)
    }
  }

  const getPhotoSubmission = (photoId: string) => {
    return submissions.find(sub => 
      sub.photos.some(p => p.id === photoId)
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl max-h-[95vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Floor Plan View
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {currentBuilding || "Loading buildings..."} • {currentFloor === "first" ? "First Floor" : currentFloor === "second" ? "Second Floor" : currentFloor} • {photosOnFloor.length} photos
            </p>
          </div>
          <Button variant="outline" onClick={onClose} size="sm">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-4 flex-1 overflow-y-auto">
          {/* Building and Floor Selection */}
          <div className="flex items-center gap-4 mb-4">
            {loadingBuildings ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Loading buildings...</span>
              </div>
            ) : availableBuildings.length > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Building:</span>
                  <Select value={currentBuilding} onValueChange={setCurrentBuilding}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select building" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBuildings.map((building) => (
                        <SelectItem key={building} value={building}>
                          {building}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Floor:</span>
                  {loadingFloors ? (
                    <div className="flex items-center gap-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      <span className="text-xs text-gray-600">Loading...</span>
                    </div>
                  ) : (
                    <div className="flex border rounded-lg overflow-hidden">
                      {availableFloors.map((floor) => (
                        <Button
                          key={floor}
                          variant={currentFloor === floor ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentFloor(floor)}
                          className="rounded-none border-0"
                        >
                          {floor === "first" ? "First Floor" : 
                           floor === "second" ? "Second Floor" : 
                           floor === "basement" ? "Basement" :
                           floor === "third" ? "Third Floor" :
                           floor === "fourth" ? "Fourth Floor" :
                           floor}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-sm">
                No floor plans available. Please upload floor plans first.
              </div>
            )}
            
            <Badge variant="outline" className="border-blue-200 text-blue-700">
              {photosOnFloor.length} Photos
            </Badge>
          </div>

          {/* Floorplan with Photos */}
          <div className="relative bg-white rounded-lg border overflow-hidden max-h-[70vh] overflow-y-auto">
            <div className="relative inline-block w-full">
              {loadingFloorplan ? (
                <div className="flex items-center justify-center h-64 bg-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Loading floor plan...</span>
                  </div>
                </div>
              ) : (
                <img
                  ref={imageRef}
                  src={getFloorplanImage()}
                  alt={getFloorplanAlt()}
                  className="w-full h-auto block"
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    display: "block",
                  }}
                />
              )}

              {/* Photo Pins */}
              {photosOnFloor.map((photo) => (
                <div
                  key={photo.id}
                  className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer group"
                  style={{
                    left: `${photo.location_x}%`,
                    top: `${photo.location_y}%`,
                  }}
                  onClick={() => handlePhotoClick(photo)}
                >
                  <div className="bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600 transition-colors relative">
                    <Camera className="w-4 h-4" />
                    
                    {/* Photo Preview Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                      <div className="bg-white border rounded-lg shadow-lg p-2 max-w-xs">
                        <div className="w-32 h-24 relative bg-gray-100 rounded overflow-hidden mb-2">
                          <Image
                            src={`/api/photos/${photo.id}`}
                            alt={photo.caption || "Photo"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {photo.caption || "No caption"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {getPhotoSubmission(photo.id)?.walkers?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {photo.survey_category}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photo List */}
          {photosOnFloor.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Photos on this floor:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-48 overflow-y-auto">
                {photosOnFloor.map((photo) => {
                  const submission = getPhotoSubmission(photo.id)
                  return (
                    <div
                      key={photo.id}
                      className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow relative group"
                    >
                      <div className="aspect-square relative bg-gray-100">
                        <Image
                          src={`/api/photos/${photo.id}`}
                          alt={photo.caption || "Photo"}
                          fill
                          className="object-cover cursor-pointer"
                          onClick={() => handlePhotoClick(photo)}
                        />
                        {/* Delete button overlay */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePhoto(photo.id)
                            }}
                            disabled={deletingPhoto === photo.id}
                          >
                            {deletingPhoto === photo.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {photo.caption || "No caption"}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {submission?.walkers?.name || "Unknown"}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {photo.location_x?.toFixed(1)}%, {photo.location_y?.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Floor Plan View:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Blue camera icons show where photos were taken</li>
                  <li>• Hover over icons to see photo previews</li>
                  <li>• Click on icons or thumbnails to view full photos</li>
                  <li>• Switch between floors using the floor selector</li>
                  <li>• Scroll to see different areas of the floor plan</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Modal */}
      {showPhotoModal && selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-60 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Photo Details</CardTitle>
                <p className="text-sm text-gray-600">
                  {selectedPhoto.caption || "No caption"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePhoto(selectedPhoto.id)}
                  disabled={deletingPhoto === selectedPhoto.id}
                >
                  {deletingPhoto === selectedPhoto.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={closePhotoModal} size="sm">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Photo */}
                <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={`/api/photos/${selectedPhoto.id}`}
                    alt={selectedPhoto.caption || "Photo"}
                    fill
                    className="object-cover"
                  />
                </div>
                
                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Photo Information</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Caption:</span>
                        <p className="text-gray-600">{selectedPhoto.caption || "No caption provided"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Category:</span>
                        <p className="text-gray-600">{selectedPhoto.survey_category}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Room Number:</span>
                        <p className="text-gray-600">{selectedPhoto.room_number || "Not specified"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Location:</span>
                        <p className="text-gray-600">
                          {selectedPhoto.location_x && selectedPhoto.location_y 
                            ? `${selectedPhoto.location_x.toFixed(1)}%, ${selectedPhoto.location_y.toFixed(1)}%`
                            : "Location not set"
                          }
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Floor:</span>
                        <p className="text-gray-600">
                          {selectedPhoto.floor_level === "first" ? "First Floor" : 
                           selectedPhoto.floor_level === "second" ? "Second Floor" : 
                           selectedPhoto.floor_level || "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Walker Information</h3>
                    {(() => {
                      const submission = getPhotoSubmission(selectedPhoto.id)
                      return submission ? (
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Name:</span>
                            <p className="text-gray-600">{submission.walkers.name}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Email:</span>
                            <p className="text-gray-600">{submission.walkers.email || "Not provided"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">School:</span>
                            <p className="text-gray-600">{submission.walkers.school}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Date:</span>
                            <p className="text-gray-600">
                              {new Date(submission.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-600">Walker information not available</p>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 