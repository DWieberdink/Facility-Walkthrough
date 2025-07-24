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
 * Get all unique building names from floor_plans table
 */
export async function getAvailableBuildings(): Promise<string[]> {
  const { data, error } = await supabase
    .from("floor_plans")
    .select("building_name")
    .eq("is_active", true)
    .order("building_name", { ascending: true })

  if (error) {
    console.error("Error fetching buildings:", error)
    return []
  }

  // Get unique building names
  const uniqueBuildings = [...new Set(data?.map((row: { building_name: string }) => row.building_name) || [])] as string[]
  return uniqueBuildings
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
  const { data, error } = await supabase
    .from("floor_plans")
    .select("floor_level")
    .eq("building_name", buildingName)
    .eq("is_active", true)
    .order("floor_level", { ascending: true })

  if (error) {
    console.error("Error fetching floors:", error)
    return []
  }

  // Get unique floor levels
  const uniqueFloors = [...new Set(data?.map((row: { floor_level: string }) => row.floor_level) || [])] as string[]
  return uniqueFloors
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