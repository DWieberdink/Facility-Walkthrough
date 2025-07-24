import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_SURVEY_BUCKET || "survey-photos"

export async function DELETE(req: NextRequest) {
  try {
    const photoId = req.nextUrl.searchParams.get("id")
    if (!photoId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const supabase = getSupabaseServer()

    /* 1. Look up the DB row (needed to know the storage path) */
    const { data: row, error: fetchErr } = await supabase.from("survey_photos").select("*").eq("id", photoId).single()

    if (fetchErr) throw fetchErr
    if (!row) throw new Error("Photo not found")

    /* 2. Remove object from Storage */
    const relativePath = row.file_path.replace(`${BUCKET}/`, "")
    const { error: storageErr } = await supabase.storage.from(BUCKET).remove([relativePath])
    if (storageErr) throw storageErr

    /* 3. Delete DB record */
    const { error: dbErr } = await supabase.from("survey_photos").delete().eq("id", photoId)
    if (dbErr) throw dbErr

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Photo delete route error:", err)
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 })
  }
}
