import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_SURVEY_BUCKET || "survey-photos"

export async function POST(req: Request) {
  try {
    const { fileData, fileName, fileType, fileSize, submissionId, surveyCategory, questionKey, roomNumber, caption } =
      await req.json()

    if (!fileData || !submissionId || !surveyCategory || !fileName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Convert base64 back to buffer
    const buffer = Buffer.from(fileData, "base64")

    const fileExt = fileName.split(".").pop()
    const uniqueFileName = `${submissionId}_${Date.now()}.${fileExt}`
    const filePath = `${submissionId}/${uniqueFileName}` // path *inside* bucket

    const supabase = getSupabaseServer()

    /* ---------- 1. upload to Storage (server can bypass RLS) ---------- */
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
      contentType: fileType,
      upsert: false,
      cacheControl: "3600",
    })

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr)
      throw uploadErr
    }

    /* ---------- 2. insert DB metadata --------------------------------- */
    const { data: record, error: dbErr } = await supabase
      .from("survey_photos")
      .insert({
        submission_id: submissionId,
        survey_category: surveyCategory,
        question_key: questionKey,
        room_number: roomNumber,
        file_name: uniqueFileName,
        file_path: `${BUCKET}/${filePath}`,
        file_size: fileSize,
        mime_type: fileType,
        caption,
        // Initialize location fields as null - will be updated when user confirms location
        location_x: null,
        location_y: null,
        floor_level: null,
      })
      .select()
      .single()

    if (dbErr) {
      console.error("Database insert error:", dbErr)
      throw dbErr
    }

    return NextResponse.json({ record })
  } catch (err: any) {
    console.error("Photo upload route error:", err)
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 })
  }
}
