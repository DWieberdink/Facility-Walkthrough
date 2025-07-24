"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, MapPin, Check, Building } from "lucide-react"
import { getFloorPlanUrlForBuilding, getAvailableBuildings, getAvailableFloors } from "../lib/floorplan-utils"

interface FloorplanModalProps {
  isOpen: boolean
  onClose: () => void
  onLocationSelected: (x: number, y: number, floor: string) => void
  photoId?: string
}

interface LocationPin {
  x: number
  y: number
}

export function FloorplanModal({ isOpen, onClose, onLocationSelected, photoId }: FloorplanModalProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null)
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<LocationPin | null>(null)
  const [floorplanUrl, setFloorplanUrl] = useState<string | null>(null)
  const [availableBuildings, setAvailableBuildings] = useState<string[]>([])
  const [availableFloors, setAvailableFloors] = useState<string[]>([])
  const [loadingBuildings, setLoadingBuildings] = useState(false)
  const [loadingFloors, setLoadingFloors] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  // Load available buildings when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedBuilding(null)
      setSelectedFloor(null)
      setSelectedLocation(null)
      setFloorplanUrl(null)
      
      // Load available buildings from database
      const loadBuildings = async () => {
        setLoadingBuildings(true)
        try {
          const buildings = await getAvailableBuildings()
          setAvailableBuildings(buildings)
        } catch (error) {
          console.error("Error loading buildings:", error)
          // Fallback to default buildings if loading fails
          setAvailableBuildings(["Main Building"])
        } finally {
          setLoadingBuildings(false)
        }
      }
      
      loadBuildings()
    }
  }, [isOpen])

  // Update floorplan URL when building and floor change
  useEffect(() => {
    if (selectedBuilding && selectedFloor) {
      // Try to get the floor plan URL from Supabase
      getFloorPlanUrlForBuilding(selectedBuilding, selectedFloor)
        .then(url => {
          if (url) {
            setFloorplanUrl(url)
          } else {
            // Fallback to static files if no floor plan found in Supabase
            if (selectedFloor === "first") {
              setFloorplanUrl("/floorplan.jpg")
            } else if (selectedFloor === "second") {
              setFloorplanUrl("/second-floor-plan.jpg")
            } else {
              setFloorplanUrl(null)
            }
          }
        })
        .catch(() => {
          // Fallback to static files if error
          if (selectedFloor === "first") {
            setFloorplanUrl("/floorplan.jpg")
          } else if (selectedFloor === "second") {
            setFloorplanUrl("/second-floor-plan.jpg")
          } else {
            setFloorplanUrl(null)
          }
        })
    }
  }, [selectedBuilding, selectedFloor])

  if (!isOpen) return null

  const handleBuildingSelect = async (building: string) => {
    setSelectedBuilding(building)
    setSelectedFloor(null)
    setSelectedLocation(null)
    
    // Load available floors for the selected building
    setLoadingFloors(true)
    try {
      const floors = await getAvailableFloors(building)
      setAvailableFloors(floors)
    } catch (error) {
      console.error("Error loading floors:", error)
      setAvailableFloors([])
    } finally {
      setLoadingFloors(false)
    }
  }

  const handleFloorSelect = (floor: string) => {
    setSelectedFloor(floor)
    setSelectedLocation(null) // Reset location when changing floors
  }

  const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return

    // Get the actual image element and its bounding rectangle
    const img = imageRef.current
    const rect = img.getBoundingClientRect()

    // Calculate the click position relative to the image bounds
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top

    // Convert to percentage based on the actual displayed image dimensions
    const x = (clickX / rect.width) * 100
    const y = (clickY / rect.height) * 100

    // Ensure coordinates are within bounds (0-100%)
    const boundedX = Math.max(0, Math.min(100, x))
    const boundedY = Math.max(0, Math.min(100, y))

    console.log(`Click coordinates: ${boundedX.toFixed(2)}%, ${boundedY.toFixed(2)}%`)

    setSelectedLocation({ x: boundedX, y: boundedY })
  }

  const handleConfirmLocation = () => {
    if (selectedLocation && selectedFloor) {
      onLocationSelected(selectedLocation.x, selectedLocation.y, selectedFloor)
      onClose()
    }
  }

  const handleSkip = () => {
    onLocationSelected(0, 0, "unknown") // Default coordinates when skipped
    onClose()
  }

  const handleClose = () => {
    // Reset state when closing
    setSelectedBuilding(null)
    setSelectedFloor(null)
    setSelectedLocation(null)
    onClose()
  }

  const getFloorplanImage = () => {
    return floorplanUrl
  }

  const getFloorplanAlt = () => {
    if (selectedFloor === "first") {
      return `${selectedBuilding} Floorplan - First Floor`
    } else if (selectedFloor === "second") {
      return `${selectedBuilding} Floorplan - Second Floor`
    }
    return `${selectedBuilding} Floorplan`
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Mark Photo Location on Floorplan
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {!selectedBuilding
                ? "First select which building the photo was taken in"
                : !selectedFloor
                ? "Now select which floor the photo was taken on"
                : "Click on the floorplan to indicate where this photo was taken"}
            </p>
          </div>
          <Button variant="outline" onClick={handleClose} size="sm">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-4 flex-1 overflow-y-auto">
          {/* Building Selection */}
          {!selectedBuilding && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Which building was this photo taken in?</h3>
                {loadingBuildings ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading buildings...</span>
                  </div>
                ) : availableBuildings.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-4">
                    {availableBuildings.map((building, index) => (
                      <Button
                        key={building}
                        onClick={() => handleBuildingSelect(building)}
                        className={`bg-gradient-to-r text-white px-8 py-4 text-lg ${
                          index % 2 === 0 
                            ? "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            : "from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        }`}
                      >
                        <Building className="w-5 h-5 mr-2" />
                        {building}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <p>No buildings found in database.</p>
                    <p className="text-sm">Please add walkers with school information first.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Floor Selection */}
          {selectedBuilding && !selectedFloor && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Button variant="outline" onClick={() => setSelectedBuilding(null)} size="sm" className="text-gray-600">
                    ← Change Building
                  </Button>
                  <span className="text-sm font-medium text-gray-700">
                    Selected: {selectedBuilding}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Which floor was this photo taken on?</h3>
                {loadingFloors ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading floors...</span>
                  </div>
                ) : availableFloors.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-4">
                    {availableFloors.map((floor, index) => (
                      <Button
                        key={floor}
                        onClick={() => handleFloorSelect(floor)}
                        className={`bg-gradient-to-r text-white px-8 py-4 text-lg ${
                          index % 2 === 0 
                            ? "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            : "from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        }`}
                      >
                        <Building className="w-5 h-5 mr-2" />
                        {floor === "basement" ? "Basement" :
                         floor === "ground" ? "Ground Floor" :
                         floor === "first" ? "First Floor" : 
                         floor === "second" ? "Second Floor" : 
                         floor === "third" ? "Third Floor" :
                         floor === "fourth" ? "Fourth Floor" :
                         floor === "fifth" ? "Fifth Floor" :
                         floor === "sixth" ? "Sixth Floor" :
                         floor === "seventh" ? "Seventh Floor" :
                         floor === "eighth" ? "Eighth Floor" :
                         floor === "ninth" ? "Ninth Floor" :
                         floor === "tenth" ? "Tenth Floor" :
                         floor}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <p>No floor plans found for {selectedBuilding}.</p>
                    <p className="text-sm">Please upload floor plans for this building first.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Floorplan Display */}
          {selectedBuilding && selectedFloor && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Button variant="outline" onClick={() => setSelectedFloor(null)} size="sm" className="text-gray-600">
                  ← Change Floor
                </Button>
                <span className="text-sm font-medium text-gray-700">
                  {selectedBuilding} • {selectedFloor === "first" ? "First Floor" : "Second Floor"}
                </span>
              </div>

              <div className="relative bg-white rounded-lg border overflow-hidden max-h-[60vh] overflow-y-auto">
                <div className="relative inline-block w-full">
                  <img
                    ref={imageRef}
                    src={getFloorplanImage()! || "/placeholder.svg"}
                    alt={getFloorplanAlt()}
                    className="w-full h-auto cursor-crosshair block"
                    onClick={handleImageClick}
                    onLoad={() => {
                      // Ensure the image is fully loaded before allowing clicks
                      console.log("Floorplan image loaded and ready for interaction")
                    }}
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      display: "block",
                    }}
                  />

                  {/* Location Pin */}
                  {selectedLocation && (
                    <div
                      className="absolute transform -translate-x-1/2 -translate-y-full pointer-events-none z-10"
                      style={{
                        left: `${selectedLocation.x}%`,
                        top: `${selectedLocation.y}%`,
                      }}
                    >
                      <div className="bg-red-500 text-white rounded-full p-2 shadow-lg animate-bounce">
                        <MapPin className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons - Fixed at bottom */}
              <div className="sticky bottom-0 bg-white border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="text-gray-600 border-gray-300 bg-transparent"
                  >
                    Skip Location
                  </Button>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedLocation(null)} disabled={!selectedLocation}>
                      Clear Selection
                    </Button>
                    <Button
                      onClick={handleConfirmLocation}
                      disabled={!selectedLocation}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Confirm Location
                    </Button>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Instructions:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Click anywhere on the floorplan to mark where the photo was taken</li>
                      <li>• The red pin will show your selected location</li>
                      <li>• Click "Confirm Location" to save, or "Skip Location" if unsure</li>
                      <li>• You can click again to move the pin to a different location</li>
                      <li>• Use "Change Floor" to select a different floor if needed</li>
                      <li>• Scroll within the floorplan area to view different sections</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
