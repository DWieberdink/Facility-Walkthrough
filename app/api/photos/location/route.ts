import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function PATCH(req: Request) {
  try {
    const { photoId, x, y, floor } = await req.json()

    if (!photoId || typeof x !== "number" || typeof y !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = getSupabaseServer()

    const updateData: any = {
      location_x: x,
      location_y: y,
    }

    // Add floor level if provided
    if (floor && floor !== "unknown") {
      updateData.floor_level = floor
    }

    const { data, error } = await supabase.from("survey_photos").update(updateData).eq("id", photoId).select().single()

    if (error) {
      console.error("Database update error:", error)
      throw error
    }

    console.log(`Updated photo ${photoId} with location: ${x.toFixed(2)}%, ${y.toFixed(2)}% on ${floor} floor`)

    return NextResponse.json({ success: true, record: data })
  } catch (err: any) {
    console.error("Photo location update error:", err)
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 })
  }
}
