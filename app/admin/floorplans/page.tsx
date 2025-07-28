"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, 
  Trash2, 
  Building, 
  MapPin, 
  Calendar,
  User,
  FileImage,
  Plus,
  AlertCircle,
  ChevronLeft
} from "lucide-react"
import { 
  getActiveFloorPlans, 
  uploadFloorPlan, 
  deleteFloorPlan,
  getFloorPlansByBuilding,
  deleteBuilding,
  deleteBuildingWithSurveyData,
  getBuildingStats,
  getAllBuildingsWithStatus,
  type FloorPlan 
} from "../../../lib/floorplan-utils"
import Image from "next/image"
import Link from "next/link"

export default function FloorPlanAdminPage() {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([])
  const [buildingStats, setBuildingStats] = useState<{ building: string; floorPlanCount: number }[]>([])
  const [allBuildings, setAllBuildings] = useState<{
    building: string
    hasFloorPlans: boolean
    floorPlanCount: number
    hasSurveyData: boolean
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [viewMode, setViewMode] = useState<'buildings' | 'floorplans'>('buildings')
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null)
  const [deletingBuilding, setDeletingBuilding] = useState<string | null>(null)
  
  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [buildingName, setBuildingName] = useState("")
  const [floorLevel, setFloorLevel] = useState("")
  const [description, setDescription] = useState("")
  const [uploadedBy, setUploadedBy] = useState("")

  useEffect(() => {
    loadFloorPlans()
  }, [])

  const loadFloorPlans = async () => {
    try {
      setLoading(true)
      const [plans, stats, allBuildingsData] = await Promise.all([
        getActiveFloorPlans(),
        getBuildingStats(),
        getAllBuildingsWithStatus()
      ])
      setFloorPlans(plans)
      setBuildingStats(stats)
      setAllBuildings(allBuildingsData)
    } catch (error) {
      console.error("Error loading floor plans:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !buildingName || !floorLevel) {
      alert("Please fill in all required fields")
      return
    }

    try {
      setUploading(true)
      await uploadFloorPlan({
        file: selectedFile,
        buildingName,
        floorLevel,
        description,
        uploadedBy: uploadedBy || "Admin"
      })
      
      // Reset form
      setSelectedFile(null)
      setBuildingName("")
      setFloorLevel("")
      setDescription("")
      setUploadedBy("")
      setShowUploadForm(false)
      
      // Reload floor plans
      await loadFloorPlans()
      
      alert("Floor plan uploaded successfully!")
    } catch (error) {
      console.error("Error uploading floor plan:", error)
      alert("Error uploading floor plan. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (floorPlanId: string) => {
    if (!confirm("Are you sure you want to delete this floor plan?")) {
      return
    }

    try {
      await deleteFloorPlan(floorPlanId)
      await loadFloorPlans()
      alert("Floor plan deleted successfully!")
    } catch (error) {
      console.error("Error deleting floor plan:", error)
      alert("Error deleting floor plan. Please try again.")
    }
  }

  const handleDeleteBuilding = async (buildingName: string) => {
    const buildingPlans = await getFloorPlansByBuilding(buildingName)
    const confirmMessage = `Are you sure you want to delete the building "${buildingName}"?\n\nThis will permanently delete ${buildingPlans.length} floor plan(s):\n${buildingPlans.map(plan => `• ${getFloorLevelLabel(plan.floor_level)}`).join('\n')}\n\nThis action cannot be undone.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setDeletingBuilding(buildingName)
      await deleteBuilding(buildingName)
      await loadFloorPlans()
      alert(`Building "${buildingName}" and all its floor plans have been deleted successfully!`)
    } catch (error) {
      console.error("Error deleting building:", error)
      alert("Error deleting building. Please try again.")
    } finally {
      setDeletingBuilding(null)
    }
  }

  const handleDeleteBuildingWithSurveyData = async (buildingName: string) => {
    const buildingData = allBuildings.find(b => b.building === buildingName)
    if (!buildingData) return

    const confirmMessage = `⚠️ WARNING: You are about to delete the building "${buildingName}" with ALL associated data!\n\nThis will permanently delete:\n• All floor plans (${buildingData.floorPlanCount})\n• All survey submissions\n• All survey photos\n• All walker data\n\nThis action cannot be undone and will remove all survey data for this building.\n\nAre you absolutely sure you want to continue?`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setDeletingBuilding(buildingName)
      await deleteBuildingWithSurveyData(buildingName)
      await loadFloorPlans()
      alert(`Building "${buildingName}" and ALL associated data have been deleted successfully!`)
    } catch (error) {
      console.error("Error deleting building with survey data:", error)
      alert("Error deleting building. Please try again.")
    } finally {
      setDeletingBuilding(null)
    }
  }

  const getFloorLevelLabel = (level: string) => {
    switch (level) {
      case "basement": return "Basement"
      case "first": return "First Floor"
      case "second": return "Second Floor"
      case "third": return "Third Floor"
      case "fourth": return "Fourth Floor"
      case "fifth": return "Fifth Floor"
      case "sixth": return "Sixth Floor"
      case "seventh": return "Seventh Floor"
      case "eighth": return "Eighth Floor"
      case "ninth": return "Ninth Floor"
      case "tenth": return "Tenth Floor"
      default: return level
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading floor plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">

      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Floor Plan Management</h1>
          <p className="text-gray-600 mt-2">
            Upload and manage floor plans for different buildings and floors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/scoring">
            <Button variant="outline" className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back to Gallery
            </Button>
          </Link>
          <Button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showUploadForm ? "Cancel" : "Upload Floor Plan"}
          </Button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === 'buildings' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('buildings')}
            className="rounded-none border-0"
          >
            <Building className="w-4 h-4 mr-2" />
            Buildings ({buildingStats.length})
          </Button>
          <Button
            variant={viewMode === 'floorplans' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('floorplans')}
            className="rounded-none border-0"
          >
            <FileImage className="w-4 h-4 mr-2" />
            All Floor Plans ({floorPlans.length})
          </Button>
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload New Floor Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="building">Building Name *</Label>
                <Input
                  id="building"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  placeholder="e.g., Main Building, Science Wing"
                />
              </div>
              <div>
                <Label htmlFor="floor">Floor Level *</Label>
                <Select value={floorLevel} onValueChange={setFloorLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basement">Basement</SelectItem>
                    <SelectItem value="first">First Floor</SelectItem>
                    <SelectItem value="second">Second Floor</SelectItem>
                    <SelectItem value="third">Third Floor</SelectItem>
                    <SelectItem value="fourth">Fourth Floor</SelectItem>
                    <SelectItem value="fifth">Fifth Floor</SelectItem>
                    <SelectItem value="sixth">Sixth Floor</SelectItem>
                    <SelectItem value="seventh">Seventh Floor</SelectItem>
                    <SelectItem value="eighth">Eighth Floor</SelectItem>
                    <SelectItem value="ninth">Ninth Floor</SelectItem>
                    <SelectItem value="tenth">Tenth Floor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="file">Floor Plan Image *</Label>
              <Input
                id="file"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: JPG, PNG, GIF. Max size: 10MB
              </p>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the floor plan..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="uploadedBy">Uploaded By</Label>
              <Input
                id="uploadedBy"
                value={uploadedBy}
                onChange={(e) => setUploadedBy(e.target.value)}
                placeholder="Your name"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !buildingName || !floorLevel}
                className="bg-green-600 hover:bg-green-700"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Floor Plan
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowUploadForm(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buildings View */}
      {viewMode === 'buildings' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              All Buildings ({allBuildings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allBuildings.length === 0 ? (
              <div className="text-center py-8">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No buildings found.</p>
                <p className="text-sm text-gray-400">Upload floor plans to create buildings.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allBuildings.map((building) => (
                                      <Card key={building.building} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{building.building}</h3>
                            <div className="space-y-1">
                              {building.hasFloorPlans ? (
                                <p className="text-sm text-green-600">
                                  ✓ {building.floorPlanCount} floor plan{building.floorPlanCount !== 1 ? 's' : ''}
                                </p>
                              ) : (
                                <p className="text-sm text-orange-600">
                                  ⚠ No floor plans uploaded
                                </p>
                              )}
                              {building.hasSurveyData && (
                                <p className="text-sm text-blue-600">
                                  📊 Has survey data
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            {building.hasFloorPlans && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                {building.floorPlanCount}
                              </Badge>
                            )}
                            {!building.hasFloorPlans && building.hasSurveyData && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                No Plans
                              </Badge>
                            )}
                          </div>
                        </div>
                      
                      <div className="space-y-2">
                        {building.hasFloorPlans && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBuilding(building.building)
                              setViewMode('floorplans')
                            }}
                            className="w-full"
                          >
                            <FileImage className="w-4 h-4 mr-2" />
                            View Floor Plans
                          </Button>
                        )}
                        
                        {building.hasFloorPlans && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteBuilding(building.building)}
                            disabled={deletingBuilding === building.building}
                            className="w-full text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {deletingBuilding === building.building ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-2"></div>
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Building & Floor Plans
                              </>
                            )}
                          </Button>
                        )}
                        
                        {!building.hasFloorPlans && building.hasSurveyData && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteBuildingWithSurveyData(building.building)}
                            disabled={deletingBuilding === building.building}
                            className="w-full text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {deletingBuilding === building.building ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-2"></div>
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Building & All Data
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Floor Plans List */}
      {viewMode === 'floorplans' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileImage className="w-5 h-5" />
              {selectedBuilding ? `${selectedBuilding} Floor Plans` : 'All Floor Plans'} ({floorPlans.length})
            </CardTitle>
            {selectedBuilding && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedBuilding(null)
                    setViewMode('buildings')
                  }}
                  className="text-sm"
                >
                  ← Back to Buildings
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {floorPlans.length === 0 ? (
              <div className="text-center py-8">
                <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No floor plans uploaded yet.</p>
                <p className="text-sm text-gray-400">Upload your first floor plan to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(selectedBuilding 
                  ? floorPlans.filter(plan => plan.building_name === selectedBuilding)
                  : floorPlans
                ).map((plan) => (
                  <Card key={plan.id} className="overflow-hidden">
                    <div className="aspect-video relative bg-gray-100">
                      <Image
                        src={`https://qvpfvpyrgylfbwmbtobm.supabase.co/storage/v1/object/public/floor-plans/${plan.file_path.replace("floor-plans/", "")}`}
                        alt={plan.description || `${plan.building_name} ${getFloorLevelLabel(plan.floor_level)}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{plan.building_name}</h3>
                          <p className="text-sm text-gray-600">{getFloorLevelLabel(plan.floor_level)}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          v{plan.version}
                        </Badge>
                      </div>
                      
                      {plan.description && (
                        <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                      )}
                      
                      <div className="space-y-1 text-xs text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(plan.uploaded_at).toLocaleDateString()}
                        </div>
                        {plan.uploaded_by && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {plan.uploaded_by}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <FileImage className="w-3 h-3" />
                          {plan.file_size ? `${(plan.file_size / 1024 / 1024).toFixed(1)} MB` : "Unknown size"}
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(plan.id)}
                        className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 