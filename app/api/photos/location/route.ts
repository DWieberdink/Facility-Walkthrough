import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function PATCH(req: Request) {
  try {
    const { photoId, x, y, floor, building } = await req.json()

    if (!photoId || typeof x !== "number" || typeof y !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = getSupabaseServer()

    const updateData: {
      location_x: number
      location_y: number
      floor_level?: string
      building?: string
    } = {
      location_x: x,
      location_y: y,
    }

    // Add floor level if provided
    if (floor && floor !== "unknown") {
      updateData.floor_level = floor
    }

    // Add building if provided
    if (building && building !== "Unknown Building") {
      updateData.building = building
    }

    const { data, error } = await supabase.from("survey_photos").update(updateData).eq("id", photoId).select().single()

    if (error) {
      console.error("Database update error:", error)
      throw error
    }

    console.log(`Updated photo ${photoId} with location: ${x.toFixed(2)}%, ${y.toFixed(2)}% on ${floor} floor in ${building || 'Unknown Building'}`)

    return NextResponse.json({ success: true, record: data })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Server error"
    console.error("Photo location update error:", err)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
