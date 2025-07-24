import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: photoId } = await params
    const supabase = getSupabaseServer()

    // Get photo metadata from database
    const { data: photo, error: dbError } = await supabase
      .from("survey_photos")
      .select("file_path, mime_type")
      .eq("id", photoId)
      .single()

    if (dbError || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // Extract bucket and path from file_path
    const [bucket, ...pathParts] = photo.file_path.split("/")
    const filePath = pathParts.join("/")

    // Get signed URL for the photo
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (urlError) {
      console.error("Error creating signed URL:", urlError)
      return NextResponse.json({ error: "Failed to generate photo URL" }, { status: 500 })
    }

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrl.signedUrl)
  } catch (error) {
    console.error("Error serving photo:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 