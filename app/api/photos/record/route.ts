import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function POST(req: NextRequest) {
  try {
    const { submissionId, surveyCategory, questionKey, roomNumber, fileName, filePath, fileSize, mimeType, caption } =
      await req.json()

    /* basic input guard */
    if (!submissionId || !surveyCategory || !fileName || !filePath) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const supabase = getSupabaseServer()

    const { data, error } = await supabase
      .from("survey_photos")
      .insert({
        submission_id: submissionId,
        survey_category: surveyCategory,
        question_key: questionKey ?? null,
        room_number: roomNumber ?? null,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize ?? null,
        mime_type: mimeType ?? null,
        caption: caption ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ record: data })
  } catch (err: any) {
    console.error("Photo record insert error:", err)
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 })
  }
}
