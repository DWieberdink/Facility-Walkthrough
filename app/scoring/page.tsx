"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Camera,
  Search,
  User,
  Building,
  Calendar,
  ChevronLeft,
  MapPin,
  Image as ImageIcon,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
  Settings,
} from "lucide-react"
import { getSubmissionPhotos, getPhotoUrl } from "../../lib/storage"
import { getSurveySubmissions } from "../../lib/database"
import { FloorplanGallery } from "../../components/floorplan-gallery"
import Image from "next/image"
import Link from "next/link"



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

interface GroupedPhotos {
  [building: string]: {
    [floor: string]: {
      photos: PhotoRecord[]
      submissions: SubmissionWithPhotos[]
    }
  }
}

export default function PhotoGalleryPage() {
  const [submissions, setSubmissions] = useState<SubmissionWithPhotos[]>([])
  const [groupedPhotos, setGroupedPhotos] = useState<GroupedPhotos>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSchool, setSelectedSchool] = useState<string>("all")
  const [selectedFloor, setSelectedFloor] = useState<string>("all")
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set())
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set())
  const [showFloorplanView, setShowFloorplanView] = useState(false)
  const [selectedBuildingForFloorplan, setSelectedBuildingForFloorplan] = useState<string>("")
  const [selectedFloorForFloorplan, setSelectedFloorForFloorplan] = useState<string>("")

  useEffect(() => {
    loadSubmissions()
  }, [])

  useEffect(() => {
    groupPhotosByBuildingAndFloor()
  }, [submissions, searchTerm, selectedSchool, selectedFloor])

  const loadSubmissions = async () => {
    try {
      setLoading(true)
      
      // Fetch all survey submissions with walker information
      const submissionsData = await getSurveySubmissions()

      if (!submissionsData) {
        console.error("Error fetching submissions: No data returned")
        return
      }

      // Fetch photos for each submission
      const submissionsWithPhotos: SubmissionWithPhotos[] = []
      
      for (const submission of submissionsData) {
        try {
          const photos = await getSubmissionPhotos(submission.id)
          submissionsWithPhotos.push({
            id: submission.id,
            created_at: submission.created_at,
            walkers: submission.walkers,
            photos: photos
          })
        } catch (photoError) {
          console.error(`Error fetching photos for submission ${submission.id}:`, photoError)
          // Add submission without photos
          submissionsWithPhotos.push({
            id: submission.id,
            created_at: submission.created_at,
            walkers: submission.walkers,
            photos: []
          })
        }
      }

      setSubmissions(submissionsWithPhotos)
    } catch (error) {
      console.error("Error loading submissions:", error)
    } finally {
      setLoading(false)
    }
  }

  const groupPhotosByBuildingAndFloor = () => {
    let filtered = submissions

    // Filter by search term (name, email, or school)
    if (searchTerm) {
      filtered = filtered.filter(
        (submission) =>
          submission.walkers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          submission.walkers?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          submission.walkers?.school?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by school (walker's school)
    if (selectedSchool !== "all") {
      filtered = filtered.filter((submission) => submission.walkers?.school === selectedSchool)
    }

    // Group by building and floor
    const grouped: GroupedPhotos = {}
    
    filtered.forEach(submission => {
      // Group photos by their individual building and floor
      submission.photos.forEach(photo => {
        const building = photo.building || submission.walkers?.school || "Unknown Building"
        const floor = photo.floor_level || "Unknown Floor"
        

        
        if (!grouped[building]) {
          grouped[building] = {}
        }
        
        if (!grouped[building][floor]) {
          grouped[building][floor] = {
            photos: [],
            submissions: []
          }
        }
        
        grouped[building][floor].photos.push(photo)
        
        // Only add submission once per building/floor combination
        if (!grouped[building][floor].submissions.find(s => s.id === submission.id)) {
          grouped[building][floor].submissions.push(submission)
        }
      })
    })

    setGroupedPhotos(grouped)
  }

  const toggleBuildingExpanded = (building: string) => {
    const newExpanded = new Set(expandedBuildings)
    if (newExpanded.has(building)) {
      newExpanded.delete(building)
    } else {
      newExpanded.add(building)
    }
    setExpandedBuildings(newExpanded)
  }

  const toggleFloorExpanded = (building: string, floor: string) => {
    const key = `${building}-${floor}`
    const newExpanded = new Set(expandedFloors)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedFloors(newExpanded)
  }

  const getUniqueSchools = () => {
    // Get unique building names from photos, fallback to walker schools
    const buildings = submissions
      .flatMap((sub) => sub.photos.map((photo) => photo.building || sub.walkers?.school))
      .filter(Boolean) as string[]
    return [...new Set(buildings)]
  }

  const getUniqueFloors = () => {
    const floors = submissions
      .flatMap((sub) => sub.photos.map((photo) => photo.floor_level))
      .filter(Boolean) as string[]
    return [...new Set(floors)]
  }

  const getTotalPhotos = () => {
    return submissions.reduce((total, sub) => total + sub.photos.length, 0)
  }

  const getTotalBuildings = () => {
    return Object.keys(groupedPhotos).length
  }

  const getTotalFloors = () => {
    return Object.values(groupedPhotos).reduce((total, building) => {
      return total + Object.keys(building).length
    }, 0)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading photo gallery...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Photo Gallery</h1>
          <p className="text-gray-600 mt-2">
            View and manage all uploaded photos organized by Building &gt; Floor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/floorplans">
            <Button variant="outline" className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
              <Settings className="w-4 h-4" />
              Manage Floor Plans
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back to Survey
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{submissions.length}</p>
                <p className="text-sm text-gray-600">Walkers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Camera className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{getTotalPhotos()}</p>
                <p className="text-sm text-gray-600">Total Photos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{getTotalBuildings()}</p>
                <p className="text-sm text-gray-600">Buildings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{getTotalFloors()}</p>
                <p className="text-sm text-gray-600">Floors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or school..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select School" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {getUniqueSchools().map((school) => (
                    <SelectItem key={school} value={school}>
                      {school}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Floor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  {getUniqueFloors().map((floor) => (
                    <SelectItem key={floor} value={floor}>
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
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Gallery - Grouped by Building > Floor */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-800">Photo Gallery</CardTitle>
              <CardDescription>Photos organized by Building &gt; Floor</CardDescription>
            </div>
            <Button
              onClick={() => {
                setSelectedBuildingForFloorplan("")
                setSelectedFloorForFloorplan("")
                setShowFloorplanView(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Floor Plan View
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.keys(groupedPhotos).length === 0 ? (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No photos found matching your criteria.</p>
              <p className="text-sm text-gray-400">Upload some photos from the main survey page to see them here.</p>
            </div>
          ) : (
            Object.entries(groupedPhotos).map(([building, floors]) => {
              const isBuildingExpanded = expandedBuildings.has(building)
              const totalPhotosInBuilding = Object.values(floors).reduce((total, floor) => total + floor.photos.length, 0)

              return (
                <div key={building} className="border border-gray-200 rounded-lg">
                  {/* Building Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors bg-gray-50"
                    onClick={() => toggleBuildingExpanded(building)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building className="w-5 h-5 text-purple-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{building}</h3>
                          <p className="text-sm text-gray-600">
                            {Object.keys(floors).length} floors • {totalPhotosInBuilding} photos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-purple-200 text-purple-700">
                          {totalPhotosInBuilding} Photos
                        </Badge>
                        {isBuildingExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Floors */}
                  {isBuildingExpanded && (
                    <div className="border-t border-gray-200">
                      {Object.entries(floors).map(([floor, floorData]) => {
                        const isFloorExpanded = expandedFloors.has(`${building}-${floor}`)
                        const uniqueSubmissions = floorData.submissions.filter((sub, index, arr) => 
                          arr.findIndex(s => s.id === sub.id) === index
                        )

                        return (
                          <div key={floor} className="border-b border-gray-100 last:border-b-0">
                            {/* Floor Header */}
                            <div
                              className="p-3 cursor-pointer hover:bg-gray-25 transition-colors"
                              onClick={() => toggleFloorExpanded(building, floor)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <MapPin className="w-4 h-4 text-orange-600" />
                                  <div>
                                    <h4 className="font-medium text-gray-800">
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
                                    </h4>
                                    <p className="text-xs text-gray-600">
                                      {uniqueSubmissions.length} walkers • {floorData.photos.length} photos
                                    </p>
                                  </div>
                                </div>
                                                                 <div className="flex items-center gap-2">
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     className="h-6 px-2 text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                                     onClick={(e) => {
                                       e.stopPropagation()
                                       setSelectedBuildingForFloorplan(building)
                                       setSelectedFloorForFloorplan(floor)
                                       setShowFloorplanView(true)
                                     }}
                                   >
                                     <MapPin className="w-3 h-3 mr-1" />
                                     Map
                                   </Button>
                                   <Badge variant="outline" className="border-orange-200 text-orange-700 text-xs">
                                     {floorData.photos.length}
                                   </Badge>
                                   {isFloorExpanded ? (
                                     <ChevronDown className="w-4 h-4 text-gray-500" />
                                   ) : (
                                     <ChevronRight className="w-4 h-4 text-gray-500" />
                                   )}
                                 </div>
                              </div>
                            </div>

                            {/* Photos Grid */}
                            {isFloorExpanded && (
                              <div className="p-4 bg-gray-25">
                                {floorData.photos.length === 0 ? (
                                  <div className="text-center py-4">
                                    <Camera className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">No photos on this floor</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                                    {floorData.photos.map((photo) => (
                                      <div key={photo.id} className="group relative">
                                        <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden border">
                                          <Image
                                            src={`/api/photos/${photo.id}`}
                                            alt={photo.caption || "Uploaded photo"}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                                          />
                                          {/* Photo Info Overlay */}
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-end">
                                            <div className="p-2 w-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                              <p className="text-xs truncate">
                                                {photo.caption || "No caption"}
                                              </p>
                                              <p className="text-xs opacity-75">
                                                {photo.survey_category}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Walker Info */}
                                        <div className="mt-1">
                                          <p className="text-xs text-gray-600 truncate">
                                            {floorData.submissions.find(s => 
                                              s.photos.some(p => p.id === photo.id)
                                            )?.walkers?.name || "Unknown"}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Floor Plan Gallery Modal */}
      <FloorplanGallery
        isOpen={showFloorplanView}
        onClose={() => setShowFloorplanView(false)}
        submissions={submissions}
        selectedBuilding={selectedBuildingForFloorplan}
        selectedFloor={selectedFloorForFloorplan}
      />
    </div>
  )
}
