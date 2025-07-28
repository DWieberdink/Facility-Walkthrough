"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, MapPin, Check, Building, ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react"
import { getFloorPlanUrlForBuilding, getAvailableBuildings, getAvailableFloors } from "../lib/floorplan-utils"

interface FloorplanModalProps {
  isOpen: boolean
  onClose: () => void
  onLocationSelected: (x: number, y: number, floor: string, building: string) => void
  photoId?: string
}

interface LocationPin {
  x: number
  y: number
}

interface ZoomState {
  scale: number
  translateX: number
  translateY: number
  isDragging: boolean
  lastMousePos: { x: number; y: number } | null
  dragStartPos: { x: number; y: number } | null
}

export function FloorplanModal({ isOpen, onClose, onLocationSelected, photoId }: FloorplanModalProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null)
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<LocationPin | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [floorplanUrl, setFloorplanUrl] = useState<string | null>(null)
  const [availableBuildings, setAvailableBuildings] = useState<string[]>([])
  const [availableFloors, setAvailableFloors] = useState<string[]>([])
  const [loadingBuildings, setLoadingBuildings] = useState(false)
  const [loadingFloors, setLoadingFloors] = useState(false)
  const [zoomState, setZoomState] = useState<ZoomState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
    isDragging: false,
    lastMousePos: null,
    dragStartPos: null
  })
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load available buildings when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedBuilding(null)
      setSelectedFloor(null)
      setSelectedLocation(null)
      setFloorplanUrl(null)
      // Reset zoom state
      setZoomState({
        scale: 1,
        translateX: 0,
        translateY: 0,
        isDragging: false,
        lastMousePos: null,
        dragStartPos: null
      })
      
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
      // Reset zoom when changing floor
      setZoomState({
        scale: 1,
        translateX: 0,
        translateY: 0,
        isDragging: false,
        lastMousePos: null,
        dragStartPos: null
      })
      
      // Try to get the floor plan URL from Supabase
      getFloorPlanUrlForBuilding(selectedBuilding, selectedFloor)
        .then(url => {
          if (url) {
            setFloorplanUrl(url)
          } else {
            // No floor plan found for this building/floor combination
            setFloorplanUrl(null)
          }
        })
        .catch(() => {
          // Error getting floor plan
          setFloorplanUrl(null)
        })
    }
  }, [selectedBuilding, selectedFloor])

  // Zoom functions
  const zoomIn = () => {
    setZoomState(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.5, 5) // Max zoom 5x
    }))
  }

  const zoomOut = () => {
    setZoomState(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.5, 0.5) // Min zoom 0.5x
    }))
  }

  const resetZoom = () => {
    setZoomState({
      scale: 1,
      translateX: 0,
      translateY: 0,
      isDragging: false,
      lastMousePos: null,
      dragStartPos: null
    })
  }

  // Mouse event handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomState.scale > 1) {
      // Don't start dragging if clicking on the image
      if (e.target === imageRef.current) {
        return
      }
      setZoomState(prev => ({
        ...prev,
        isDragging: true,
        lastMousePos: { x: e.clientX, y: e.clientY }
      }))
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (zoomState.isDragging && zoomState.lastMousePos) {
      const deltaX = e.clientX - zoomState.lastMousePos.x
      const deltaY = e.clientY - zoomState.lastMousePos.y
      
      setZoomState(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY,
        lastMousePos: { x: e.clientX, y: e.clientY }
      }))
    }
  }

  const handleMouseUp = () => {
    setZoomState(prev => ({
      ...prev,
      isDragging: false,
      lastMousePos: null
    }))
  }

  // Wheel event for zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.5, Math.min(5, zoomState.scale * delta))
    
    if (newScale !== zoomState.scale) {
      setZoomState(prev => ({
        ...prev,
        scale: newScale
      }))
    }
  }

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
    
    // If we were dragging, don't treat this as a click
    if (zoomState.isDragging) {
      return
    }

    // Get the image element and its bounding rectangle
    const img = imageRef.current
    const rect = img.getBoundingClientRect()

    // Calculate the click position relative to the image element
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top

    // Convert to percentage based on the image's actual dimensions
    const x = (clickX / rect.width) * 100
    const y = (clickY / rect.height) * 100

    // Ensure coordinates are within bounds (0-100%)
    const boundedX = Math.max(0, Math.min(100, x))
    const boundedY = Math.max(0, Math.min(100, y))

    setSelectedLocation({ x: boundedX, y: boundedY })
  }

  const handleConfirmLocation = () => {
    if (selectedLocation && selectedFloor && selectedBuilding) {
      onLocationSelected(selectedLocation.x, selectedLocation.y, selectedFloor, selectedBuilding)
      onClose()
    }
  }

  const handleSkip = () => {
    onLocationSelected(0, 0, "unknown", "Unknown Building") // Default coordinates when skipped
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
    if (selectedFloor === "basement") {
      return `${selectedBuilding} Floorplan - Basement`
    } else if (selectedFloor === "first") {
      return `${selectedBuilding} Floorplan - First Floor`
    } else if (selectedFloor === "second") {
      return `${selectedBuilding} Floorplan - Second Floor`
    } else if (selectedFloor === "third") {
      return `${selectedBuilding} Floorplan - Third Floor`
    } else if (selectedFloor === "fourth") {
      return `${selectedBuilding} Floorplan - Fourth Floor`
    } else if (selectedFloor === "fifth") {
      return `${selectedBuilding} Floorplan - Fifth Floor`
    } else if (selectedFloor === "sixth") {
      return `${selectedBuilding} Floorplan - Sixth Floor`
    } else if (selectedFloor === "seventh") {
      return `${selectedBuilding} Floorplan - Seventh Floor`
    } else if (selectedFloor === "eighth") {
      return `${selectedBuilding} Floorplan - Eighth Floor`
    } else if (selectedFloor === "ninth") {
      return `${selectedBuilding} Floorplan - Ninth Floor`
    } else if (selectedFloor === "tenth") {
      return `${selectedBuilding} Floorplan - Tenth Floor`
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setSelectedFloor(null)} size="sm" className="text-gray-600">
                    ← Change Floor
                  </Button>
                  <span className="text-sm font-medium text-gray-700">
                    {selectedBuilding} • {selectedFloor === "basement" ? "Basement" :
                                         selectedFloor === "first" ? "First Floor" :
                                         selectedFloor === "second" ? "Second Floor" :
                                         selectedFloor === "third" ? "Third Floor" :
                                         selectedFloor === "fourth" ? "Fourth Floor" :
                                         selectedFloor === "fifth" ? "Fifth Floor" :
                                         selectedFloor === "sixth" ? "Sixth Floor" :
                                         selectedFloor === "seventh" ? "Seventh Floor" :
                                         selectedFloor === "eighth" ? "Eighth Floor" :
                                         selectedFloor === "ninth" ? "Ninth Floor" :
                                         selectedFloor === "tenth" ? "Tenth Floor" :
                                         selectedFloor}
                  </span>
                </div>
                
                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={zoomOut}
                    disabled={zoomState.scale <= 0.5}
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
                    {Math.round(zoomState.scale * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={zoomIn}
                    disabled={zoomState.scale >= 5}
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetZoom}
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div 
                ref={containerRef}
                className="relative bg-white rounded-lg border overflow-hidden max-h-[60vh] overflow-y-auto"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{
                  cursor: zoomState.isDragging ? 'grabbing' : zoomState.scale > 1 ? 'grab' : 'crosshair'
                }}
              >
                <div 
                  className="relative inline-block w-full"
                  style={{
                    transform: `scale(${zoomState.scale}) translate(${zoomState.translateX}px, ${zoomState.translateY}px)`,
                    transformOrigin: 'top left',
                    transition: zoomState.isDragging ? 'none' : 'transform 0.1s ease-out'
                  }}
                >
                  {floorplanUrl ? (
                    <img
                      ref={imageRef}
                      src={floorplanUrl}
                      alt={getFloorplanAlt()}
                      className="w-full h-auto block"
                      onClick={handleImageClick}
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement
                        setImageDimensions({
                          width: img.offsetWidth,
                          height: img.offsetHeight
                        })
                      }}
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        display: "block",
                        pointerEvents: 'auto'
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                      <div className="text-center">
                        <Building className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">No floor plan available for {selectedBuilding} - {selectedFloor} floor</p>
                        <p className="text-sm text-gray-500 mt-1">Please upload a floor plan for this building and floor</p>
                      </div>
                    </div>
                  )}

                  {/* Location Pin - Positioned inside the transformed div */}
                  {selectedLocation && (
                    <div
                      className="absolute pointer-events-none z-10"
                      style={{
                        left: `${selectedLocation.x}%`,
                        top: `${selectedLocation.y}%`,
                        transform: 'translate(-50%, -100%)',
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
                      <li>• Use the zoom controls or mouse wheel to zoom in/out for precise placement</li>
                      <li>• When zoomed in, click and drag to pan around the floorplan</li>
                      <li>• The red pin will show your selected location</li>
                      <li>• Click "Confirm Location" to save, or "Skip Location" if unsure</li>
                      <li>• You can click again to move the pin to a different location</li>
                      <li>• Use "Reset Zoom" to return to the original view</li>
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
