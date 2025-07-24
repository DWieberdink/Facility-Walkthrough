"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, MapPin, Check, Building } from "lucide-react"

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
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<LocationPin | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Reset state whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFloor(null)
      setSelectedLocation(null)
    }
  }, [isOpen])

  if (!isOpen) return null

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
    setSelectedFloor(null)
    setSelectedLocation(null)
    onClose()
  }

  const getFloorplanImage = () => {
    if (selectedFloor === "first") {
      return "/floorplan.jpg"
    } else if (selectedFloor === "second") {
      return "/second-floor-plan.jpg"
    }
    return null
  }

  const getFloorplanAlt = () => {
    if (selectedFloor === "first") {
      return "School Floorplan - First Floor"
    } else if (selectedFloor === "second") {
      return "School Floorplan - Second Floor"
    }
    return "School Floorplan"
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
              {!selectedFloor
                ? "First select which floor the photo was taken on"
                : "Click on the floorplan to indicate where this photo was taken"}
            </p>
          </div>
          <Button variant="outline" onClick={handleClose} size="sm">

            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-4 flex-1 overflow-y-auto">
          {/* Floor Selection */}
          {!selectedFloor && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Which floor was this photo taken on?</h3>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => handleFloorSelect("first")}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 text-lg"
                  >
                    <Building className="w-5 h-5 mr-2" />
                    First Floor
                  </Button>
                  <Button
                    onClick={() => handleFloorSelect("second")}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 text-lg"
                  >
                    <Building className="w-5 h-5 mr-2" />
                    Second Floor
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Floorplan Display */}
          {selectedFloor && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Button variant="outline" onClick={() => setSelectedFloor(null)} size="sm" className="text-gray-600">
                  ← Change Floor
                </Button>
                <span className="text-sm font-medium text-gray-700">
                  Selected: {selectedFloor === "first" ? "First Floor" : "Second Floor"}
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
                    priority
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
