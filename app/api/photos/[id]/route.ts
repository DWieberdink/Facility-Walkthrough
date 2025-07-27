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
      .createSignedUrl(filePath, 86400) // 24 hour expiry for better caching

    if (urlError) {
      console.error("Error creating signed URL:", urlError)
      return NextResponse.json({ error: "Failed to generate photo URL" }, { status: 500 })
    }

    // Fetch the image data and return it directly to avoid redirect issues
    try {
      const imageResponse = await fetch(signedUrl.signedUrl)
      
      if (!imageResponse.ok) {
        console.error("Error fetching image from Supabase:", imageResponse.status, imageResponse.statusText)
        return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 })
      }

      const imageBuffer = await imageResponse.arrayBuffer()
      
      // Return the image with proper headers
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': photo.mime_type || 'image/jpeg',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch (fetchError) {
      console.error("Error fetching image:", fetchError)
      return NextResponse.json({ error: "Failed to fetch image from storage" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error serving photo:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 