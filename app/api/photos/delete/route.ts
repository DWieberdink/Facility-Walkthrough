import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function DELETE(request: NextRequest) {
  try {
    const { photoId } = await request.json()
    
    if (!photoId) {
      return NextResponse.json({ error: "Photo ID is required" }, { status: 400 })
    }

    const supabase = getSupabaseServer()

    // First, get the photo details to find the file path
    const { data: photo, error: fetchError } = await supabase
      .from("survey_photos")
      .select("file_path")
      .eq("id", photoId)
      .single()

    if (fetchError) {
      console.error("Error fetching photo:", fetchError)
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // Delete the file from storage
    if (photo.file_path) {
      const { error: storageError } = await supabase.storage
        .from("survey-photos")
        .remove([photo.file_path])

      if (storageError) {
        console.error("Error deleting file from storage:", storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete the photo record from the database
    const { error: deleteError } = await supabase
      .from("survey_photos")
      .delete()
      .eq("id", photoId)

    if (deleteError) {
      console.error("Error deleting photo from database:", deleteError)
      return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Photo deleted successfully" })
  } catch (error) {
    console.error("Error deleting photo:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
