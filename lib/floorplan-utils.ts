import { getSupabase } from "./supabase"

const supabase = getSupabase()

export interface FloorPlan {
  id: string
  building_name: string
  floor_level: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  description: string | null
  is_active: boolean
  version: number
  uploaded_at: string
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface FloorPlanUpload {
  file: File
  buildingName: string
  floorLevel: string
  description?: string
  uploadedBy?: string
}

/**
 * Get all unique building names from floor_plans table and walkers table
 */
export async function getAvailableBuildings(): Promise<string[]> {
  try {
    // Get buildings from floor_plans table
    const { data: floorPlanBuildings, error: floorPlanError } = await supabase
      .from("floor_plans")
      .select("building_name")
      .eq("is_active", true)
      .order("building_name", { ascending: true })

    if (floorPlanError) {
      console.error("Error fetching buildings from floor_plans:", floorPlanError)
    }

    // Get buildings from walkers table (school field)
    const { data: walkerBuildings, error: walkerError } = await supabase
      .from("walkers")
      .select("school")
      .not("school", "is", null)
      .order("school", { ascending: true })

    if (walkerError) {
      console.error("Error fetching buildings from walkers:", walkerError)
    }

    // Combine and deduplicate building names
    const floorPlanNames = floorPlanBuildings?.map((row: { building_name: string }) => row.building_name) || []
    const walkerNames = walkerBuildings?.map((row: { school: string }) => row.school) || []
    
    const allBuildings = [...floorPlanNames, ...walkerNames]
    const uniqueBuildings = [...new Set(allBuildings)].filter(Boolean).sort()
    

    return uniqueBuildings
  } catch (error) {
    console.error("Error fetching buildings:", error)
    return []
  }
}

/**
 * Get all active floor plans
 */
export async function getActiveFloorPlans(): Promise<FloorPlan[]> {
  const { data, error } = await supabase
    .from("floor_plans")
    .select("*")
    .eq("is_active", true)
    .order("building_name", { ascending: true })
    .order("floor_level", { ascending: true })

  if (error) {
    console.error("Error fetching floor plans:", error)
    throw error
  }

  return data || []
}

/**
 * Get available floors for a specific building
 */
export async function getAvailableFloors(buildingName: string): Promise<string[]> {
  try {
    // Get floors from floor_plans table
    const { data, error } = await supabase
      .from("floor_plans")
      .select("floor_level")
      .eq("building_name", buildingName)
      .eq("is_active", true)
      .order("floor_level", { ascending: true })

    if (error) {
      console.error("Error fetching floors from floor_plans:", error)
    }

    // Get unique floor levels from floor plans
    const floorPlanFloors = [...new Set(data?.map((row: { floor_level: string }) => row.floor_level) || [])] as string[]
    
    // If no floor plans exist for this building, provide default floors
    if (floorPlanFloors.length === 0) {
      const defaultFloors = ["basement", "first", "second", "third", "fourth", "fifth"]
      const formattedFloors = defaultFloors.map(floor => 
        floor === "basement" ? "Basement" :
        floor === "first" ? "First Floor" :
        floor === "second" ? "Second Floor" :
        floor === "third" ? "Third Floor" :
        floor === "fourth" ? "Fourth Floor" :
        floor === "fifth" ? "Fifth Floor" :
        floor
      )

      return defaultFloors
    }
    
    const formattedFloorPlanFloors = floorPlanFloors.map(floor => 
      floor === "basement" ? "Basement" :
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
      floor
    )
    
    return floorPlanFloors
  } catch (error) {
    console.error("Error fetching floors:", error)
    // Return default floors as fallback
    return ["basement", "first", "second", "third", "fourth", "fifth"]
  }
}

/**
 * Get floor plan for specific building and floor
 */
export async function getFloorPlan(buildingName: string, floorLevel: string): Promise<FloorPlan | null> {
  const { data, error } = await supabase
    .from("floor_plans")
    .select("*")
    .eq("building_name", buildingName)
    .eq("floor_level", floorLevel)
    .eq("is_active", true)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // No floor plan found
      return null
    }
    console.error("Error fetching floor plan:", error)
    throw error
  }

  return data
}

/**
 * Upload a new floor plan
 */
export async function uploadFloorPlan(payload: FloorPlanUpload): Promise<FloorPlan> {
  try {
    // 1. Deactivate any existing floor plan for this building/floor
    await supabase
      .from("floor_plans")
      .update({ is_active: false })
      .eq("building_name", payload.buildingName)
      .eq("floor_level", payload.floorLevel)
      .eq("is_active", true)

    // 2. Upload file to storage
    const fileExt = payload.file.name.split(".").pop()
    const uniqueFileName = `${payload.buildingName}-${payload.floorLevel}-${Date.now()}.${fileExt}`
    const filePath = `${uniqueFileName}`

    const { error: uploadError } = await supabase.storage
      .from("floor-plans")
      .upload(filePath, payload.file, {
        contentType: payload.file.type,
        upsert: false,
        cacheControl: "3600",
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      throw uploadError
    }

    // 3. Insert metadata into database
    const { data, error: dbError } = await supabase
      .from("floor_plans")
      .insert({
        building_name: payload.buildingName,
        floor_level: payload.floorLevel,
        file_name: payload.file.name,
        file_path: `floor-plans/${filePath}`,
        file_size: payload.file.size,
        mime_type: payload.file.type,
        description: payload.description || null,
        uploaded_by: payload.uploadedBy || null,
        is_active: true,
        version: 1,
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database insert error:", dbError)
      throw dbError
    }

    return data
  } catch (error) {
    console.error("Error uploading floor plan:", error)
    throw error
  }
}

/**
 * Get the public URL for a floor plan
 */
export function getFloorPlanUrl(filePath: string): string {
  const { data } = supabase.storage.from("floor-plans").getPublicUrl(filePath)
  return data.publicUrl
}

/**
 * Delete a floor plan
 */
export async function deleteFloorPlan(floorPlanId: string): Promise<void> {
  try {
    // 1. Get the floor plan to get the file path
    const { data: floorPlan, error: fetchError } = await supabase
      .from("floor_plans")
      .select("file_path")
      .eq("id", floorPlanId)
      .single()

    if (fetchError) {
      console.error("Error fetching floor plan:", fetchError)
      throw fetchError
    }

    // 2. Delete from storage
    if (floorPlan.file_path) {
      const filePath = floorPlan.file_path.replace("floor-plans/", "")
      const { error: storageError } = await supabase.storage
        .from("floor-plans")
        .remove([filePath])

      if (storageError) {
        console.error("Storage delete error:", storageError)
        throw storageError
      }
    }

    // 3. Delete from database
    const { error: dbError } = await supabase
      .from("floor_plans")
      .delete()
      .eq("id", floorPlanId)

    if (dbError) {
      console.error("Database delete error:", dbError)
      throw dbError
    }
  } catch (error) {
    console.error("Error deleting floor plan:", error)
    throw error
  }
}

/**
 * Get floor plan URL for a specific building and floor
 */
export async function getFloorPlanUrlForBuilding(buildingName: string, floorLevel: string): Promise<string | null> {
  try {
    const floorPlan = await getFloorPlan(buildingName, floorLevel)
    if (!floorPlan) {
      return null
    }

    return getFloorPlanUrl(floorPlan.file_path.replace("floor-plans/", ""))
  } catch (error) {
    console.error("Error getting floor plan URL:", error)
    return null
  }
}

/**
 * Get all floor plans for a specific building
 */
export async function getFloorPlansByBuilding(buildingName: string): Promise<FloorPlan[]> {
  const { data, error } = await supabase
    .from("floor_plans")
    .select("*")
    .eq("building_name", buildingName)
    .eq("is_active", true)
    .order("floor_level", { ascending: true })

  if (error) {
    console.error("Error fetching floor plans by building:", error)
    throw error
  }

  return data || []
}

/**
 * Delete all floor plans for a specific building
 */
export async function deleteBuilding(buildingName: string): Promise<void> {
  try {
    // 1. Get all floor plans for the building
    const floorPlans = await getFloorPlansByBuilding(buildingName)
    
    if (floorPlans.length === 0) {
  
      return
    }

    // 2. Delete all files from storage
    const filePaths = floorPlans.map(plan => plan.file_path.replace("floor-plans/", ""))
    const { error: storageError } = await supabase.storage
      .from("floor-plans")
      .remove(filePaths)

    if (storageError) {
      console.error("Storage delete error:", storageError)
      throw storageError
    }

    // 3. Delete all records from database
    const { error: dbError } = await supabase
      .from("floor_plans")
      .delete()
      .eq("building_name", buildingName)

    if (dbError) {
      console.error("Database delete error:", dbError)
      throw dbError
    }


  } catch (error) {
    console.error("Error deleting building:", error)
    throw error
  }
}

/**
 * Delete building with all associated data (floor plans, survey submissions, photos)
 */
export async function deleteBuildingWithSurveyData(buildingName: string): Promise<void> {
  try {
    // 1. Get all walkers (surveyors) for this building
    const { data: walkers, error: walkersError } = await supabase
      .from("walkers")
      .select("id, name, school")
      .eq("school", buildingName)

    if (walkersError) {
      console.error("Error fetching walkers:", walkersError)
      throw walkersError
    }

    if (walkers && walkers.length > 0) {
      const walkerIds = walkers.map((w: { id: string }) => w.id)

      // 2. Get all survey submissions for these walkers
      const { data: submissions, error: submissionsError } = await supabase
        .from("survey_submissions")
        .select("id")
        .in("walker_id", walkerIds)

      if (submissionsError) {
        console.error("Error fetching submissions:", submissionsError)
        throw submissionsError
      }

      if (submissions && submissions.length > 0) {
        const submissionIds = submissions.map((s: { id: string }) => s.id)

        // 3. Get all photos for these submissions
        const { data: photos, error: photosError } = await supabase
          .from("survey_photos")
          .select("id, file_path")
          .in("submission_id", submissionIds)

        if (photosError) {
          console.error("Error fetching photos:", photosError)
          throw photosError
        }

        // 4. Delete photos from storage
        if (photos && photos.length > 0) {
          const photoFilePaths = photos
            .map((photo: { file_path: string }) => photo.file_path.replace("survey-photos/", ""))
            .filter((path: string) => path) // Filter out any null/undefined paths

          if (photoFilePaths.length > 0) {
            const { error: photoStorageError } = await supabase.storage
              .from("survey-photos")
              .remove(photoFilePaths)

            if (photoStorageError) {
              console.error("Error deleting photos from storage:", photoStorageError)
              throw photoStorageError
            }
            // Photos deleted from storage
          }
        }

        // 5. Delete photos from database (cascade should handle this, but being explicit)
        const { error: photosDeleteError } = await supabase
          .from("survey_photos")
          .delete()
          .in("submission_id", submissionIds)

        if (photosDeleteError) {
          console.error("Error deleting photos from database:", photosDeleteError)
          throw photosDeleteError
        }

        // 6. Delete survey submissions
        const { error: submissionsDeleteError } = await supabase
          .from("survey_submissions")
          .delete()
          .in("id", submissionIds)

        if (submissionsDeleteError) {
          console.error("Error deleting submissions:", submissionsDeleteError)
          throw submissionsDeleteError
        }
      }

      // 7. Delete walkers
      const { error: walkersDeleteError } = await supabase
        .from("walkers")
        .delete()
        .in("id", walkerIds)

      if (walkersDeleteError) {
        console.error("Error deleting walkers:", walkersDeleteError)
        throw walkersDeleteError
      }
    }

    // 8. Delete floor plans (reuse existing function)
    await deleteBuilding(buildingName)
  } catch (error) {
    console.error("Error deleting building with survey data:", error)
    throw error
  }
}

/**
 * Get building statistics (number of floor plans per building)
 */
export async function getBuildingStats(): Promise<{ building: string; floorPlanCount: number }[]> {
  const { data, error } = await supabase
    .from("floor_plans")
    .select("building_name")
    .eq("is_active", true)

  if (error) {
    console.error("Error fetching building stats:", error)
    throw error
  }

  // Count floor plans per building
  const buildingCounts = data?.reduce((acc: Record<string, number>, plan: { building_name: string }) => {
    acc[plan.building_name] = (acc[plan.building_name] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Convert to array format
  return Object.entries(buildingCounts).map(([building, count]) => ({
    building,
    floorPlanCount: count as number
  })).sort((a, b) => a.building.localeCompare(b.building))
}

/**
 * Get all buildings with their floor plan status
 */
export async function getAllBuildingsWithStatus(): Promise<{
  building: string
  hasFloorPlans: boolean
  floorPlanCount: number
  hasSurveyData: boolean
}[]> {
  try {
    // Get buildings from floor plans
    const { data: floorPlanData, error: floorPlanError } = await supabase
      .from("floor_plans")
      .select("building_name")
      .eq("is_active", true)

    if (floorPlanError) {
      console.error("Error fetching floor plan buildings:", floorPlanError)
    }

    // Get buildings from walkers (survey data)
    const { data: walkerData, error: walkerError } = await supabase
      .from("walkers")
      .select("school")
      .not("school", "is", null)

    if (walkerError) {
      console.error("Error fetching walker buildings:", walkerError)
    }

    // Count floor plans per building
    const floorPlanCounts: Record<string, number> = {}
    floorPlanData?.forEach((plan: { building_name: string }) => {
      floorPlanCounts[plan.building_name] = (floorPlanCounts[plan.building_name] || 0) + 1
    })

    // Get unique buildings from walkers
    const walkerBuildings = new Set<string>(walkerData?.map((row: { school: string }) => row.school) || [])

    // Combine all buildings
    const allBuildings = new Set<string>([
      ...Object.keys(floorPlanCounts),
      ...Array.from(walkerBuildings)
    ])

    // Create result array
    const result = Array.from(allBuildings).map((building: string) => ({
      building,
      hasFloorPlans: building in floorPlanCounts,
      floorPlanCount: floorPlanCounts[building] || 0,
      hasSurveyData: walkerBuildings.has(building)
    })).sort((a, b) => a.building.localeCompare(b.building))

    return result
  } catch (error) {
    console.error("Error getting all buildings with status:", error)
    throw error
  }
} 