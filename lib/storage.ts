import { getSupabase } from "./supabase"

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_SURVEY_BUCKET || "survey-photos"
const supabase = getSupabase()

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
export interface PhotoUpload {
  file: File
  submissionId: string
  surveyCategory: string
  questionKey?: string
  roomNumber?: string
  caption?: string
}

export interface PhotoRecord {
  id: string
  submission_id: string
  survey_category: string
  question_key: string | null
  room_number: string | null
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  caption: string | null
  uploaded_at: string
  location_x?: number | null
  location_y?: number | null
  floor_level?: string | null
  building?: string | null
}

/* ------------------------------------------------------------------ */
/*  Helper: Convert File to Base64                                    */
/* ------------------------------------------------------------------ */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data:image/jpeg;base64, prefix
      const base64 = result.split(",")[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/* ------------------------------------------------------------------ */
/*  Upload (client → server route) - Base64 approach                 */
/* ------------------------------------------------------------------ */
export async function uploadSurveyPhoto(payload: PhotoUpload): Promise<PhotoRecord> {
  try {
    // Convert file to base64
    const base64Data = await fileToBase64(payload.file)

    // Send as JSON instead of FormData
    const requestBody = {
      fileData: base64Data,
      fileName: payload.file.name,
      fileType: payload.file.type,
      fileSize: payload.file.size,
      submissionId: payload.submissionId,
      surveyCategory: payload.surveyCategory,
      questionKey: payload.questionKey || null,
      roomNumber: payload.roomNumber || null,
      caption: payload.caption || null,
    }

    const res = await fetch("/api/photos/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error ?? "Photo upload failed")
    }

    const { record } = (await res.json()) as { record: PhotoRecord }
    return record
  } catch (error) {
    console.error("Upload error:", error)
    throw error
  }
}

/* ------------------------------------------------------------------ */
/*  Update photo location and floor                                   */
/* ------------------------------------------------------------------ */
export async function updatePhotoLocation(photoId: string, x: number, y: number, floor?: string): Promise<PhotoRecord> {
  const res = await fetch("/api/photos/location", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ photoId, x, y, floor }),
  })

  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? "Failed to update photo location")
  }

  const { record } = await res.json()
  return record
}

/* ------------------------------------------------------------------ */
/*  READ helpers (client-side, anonymous)                             */
/* ------------------------------------------------------------------ */

/**
 * Return all photo rows for a submission.
 */
export async function getSubmissionPhotos(submissionId: string): Promise<PhotoRecord[]> {
  const { data, error } = await supabase
    .from("survey_photos")
    .select("*")
    .eq("submission_id", submissionId)
    .order("uploaded_at", { ascending: false })

  if (error) throw error
  return data as PhotoRecord[]
}

/**
 * Produces a (signed or public) URL that can be used in an <img>.
 */
export async function getPhotoUrl(photoId: string): Promise<string> {
  // Use the API route that generates signed URLs
  return `/api/photos/${photoId}`
}

/* ------------------------------------------------------------------ */
/*  DELETE helper (client → server route)                             */
/* ------------------------------------------------------------------ */
export async function deletePhoto(photoId: string): Promise<void> {
  const res = await fetch(`/api/photos/delete?id=${encodeURIComponent(photoId)}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? "Failed to delete photo")
  }
}
