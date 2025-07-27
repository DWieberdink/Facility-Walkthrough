import { getSupabase } from "./supabase"

const supabase = getSupabase()

type WalkerInfo = {
  name: string
  email?: string
  school: string
}

type Response = {
  questionId: string
  answerChoice: string
  response: "Yes" | "No" | "Does Not Apply" | "Not Able to View"
  elaboration?: string
}

type RoomDetails = {
  roomNumber: string
  gradeServed: string
  isPortable: "Y" | "N"
  ceilingHeight: string
}

type ClassroomEntry = {
  id: string
  roomDetails: RoomDetails
  responses: Response[]
  completed: boolean
}

interface CSVRow {
  survey: string
  question: string
  answerChoices: string
  matchColumn: string
  Subcategory: string
  Category: string
  scoreWeight: string
  answerWeights: string
}

// Fetch and parse CSV data with better structure
async function fetchCSVData(): Promise<CSVRow[]> {
  try {
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EAQuestionsV2-RFM7CW7A1nU9bLu2m6TOUOBB4Ok7sZ.csv",
    )
    const csvText = await response.text()

    const lines = csvText.split("\n").filter((line) => line.trim())
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))

    console.log("CSV Headers found:", headers)

    const data: CSVRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values: string[] = []
      let current = ""
      let inQuotes = false

      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          values.push(current.trim().replace(/"/g, ""))
          current = ""
        } else {
          current += char
        }
      }
      values.push(current.trim().replace(/"/g, ""))

      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ""
      })

      // Only include rows that have the required fields
      if (row.survey && row.question) {
        data.push({
          survey: row.survey || "",
          question: row.question || "",
          answerChoices: row.answerChoices || "",
          matchColumn: row.matchColumn || "",
          Subcategory: row.Subcategory || "",
          Category: row.Category || "",
          scoreWeight: row.scoreWeight || "",
          answerWeights: row.answerWeights || "",
        })
      }
    }

    console.log(`Parsed ${data.length} CSV rows`)
    console.log("Sample CSV rows:", data.slice(0, 3))

    return data
  } catch (error) {
    console.error("Error fetching CSV data:", error)
    return []
  }
}

// Find matching CSV row for a response
function findMatchingCSVRow(
  questionKey: string,
  answerChoice: string,
  surveyCategory: string,
  csvData: CSVRow[],
): { category: string | null; subcategory: string | null } {
  console.log(`\n=== Finding match for ===`)
  console.log(`Question: "${questionKey}"`)
  console.log(`Answer Choice: "${answerChoice}"`)
  console.log(`Survey: "${surveyCategory}"`)

  // First, filter by survey category
  const surveyRows = csvData.filter((row) => row.survey === surveyCategory)
  console.log(`Found ${surveyRows.length} rows for survey "${surveyCategory}"`)

  if (surveyRows.length === 0) {
    console.log("No rows found for this survey category")
    return { category: null, subcategory: null }
  }

  // Try to find exact question match first
  let matchingRows = surveyRows.filter((row) => row.question === questionKey)
  console.log(`Found ${matchingRows.length} rows with exact question match`)

  if (matchingRows.length === 0) {
    // Try partial question match
    matchingRows = surveyRows.filter(
      (row) =>
        row.question.toLowerCase().includes(questionKey.toLowerCase()) ||
        questionKey.toLowerCase().includes(row.question.toLowerCase()),
    )
    console.log(`Found ${matchingRows.length} rows with partial question match`)
  }

  if (matchingRows.length === 0) {
    console.log("No question matches found, using first survey row")
    matchingRows = [surveyRows[0]]
  }

  // Now try to match by answer choice within the matching questions
  let finalMatch = null

  for (const row of matchingRows) {
    console.log(`Checking row: question="${row.question}", answerChoices="${row.answerChoices}"`)

    // If no answer choices specified, or "To be updated", use this row
    if (!row.answerChoices || row.answerChoices === "To be updated" || row.answerChoices.trim() === "") {
      console.log("Row has no answer choices, using it")
      finalMatch = row
      break
    }

    // Check if answer choice matches
    const choices = row.answerChoices.split(",").map((c) => c.trim())
    console.log(`Answer choices in CSV: [${choices.join(", ")}]`)

    if (choices.includes(answerChoice)) {
      console.log("Found exact answer choice match!")
      finalMatch = row
      break
    }

    // Check if the question itself matches the answer choice (for single-item questions)
    if (row.question === answerChoice) {
      console.log("Question matches answer choice!")
      finalMatch = row
      break
    }
  }

  // If no answer choice match, use the first matching question
  if (!finalMatch && matchingRows.length > 0) {
    console.log("No answer choice match, using first matching question")
    finalMatch = matchingRows[0]
  }

  if (finalMatch) {
    console.log(`Final match found:`)
    console.log(`  Category: "${finalMatch.Category}"`)
    console.log(`  Subcategory: "${finalMatch.Subcategory}"`)
    console.log(`  Question: "${finalMatch.question}"`)
    console.log(`  Answer Choices: "${finalMatch.answerChoices}"`)

    return {
      category: finalMatch.Category || null,
      subcategory: finalMatch.Subcategory || null,
    }
  }

  console.log("No match found")
  return { category: null, subcategory: null }
}

export async function saveWalker(walkerInfo: WalkerInfo) {
  try {
    console.log("Attempting to save walker:", walkerInfo)
    
    // First, let's test if the table exists
    const { data: testData, error: testError } = await supabase
      .from("walkers")
      .select("id")
      .limit(1)
    
    if (testError) {
      console.error("Table test failed:", testError)
      if (testError.message.includes("does not exist")) {
        throw new Error("The 'walkers' table does not exist. Please run the database setup script in your Supabase dashboard.")
      }
      throw new Error(`Database connection error: ${testError.message}`)
    }
    
    const { data, error } = await supabase
      .from("walkers")
      .insert({
        name: walkerInfo.name,
        email: walkerInfo.email || null,
        school: walkerInfo.school,
      })
      .select()
      .single()

    if (error) {
      console.error("Supabase error saving walker:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      throw new Error(`Database error: ${error.message} (Code: ${error.code || 'unknown'})`)
    }

    if (!data) {
      throw new Error("No data returned from walker insert")
    }

    console.log("Successfully saved walker:", data)
    return data
  } catch (error) {
    console.error("Error in saveWalker function:", {
      error,
      type: typeof error,
      message: error instanceof Error ? error.message : String(error)
    })
    if (error instanceof Error) {
      throw error
    } else {
      throw new Error(`Unknown error saving walker: ${String(error)}`)
    }
  }
}

export async function createSurveySubmission(walkerId: string, dateWalked: string) {
  const { data, error } = await supabase
    .from("survey_submissions")
    .insert({
      walker_id: walkerId,
      date_walked: dateWalked,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating survey submission:", error)
    throw error
  }

  return data
}

export async function saveSurveyResponses(
  submissionId: string,
  surveyCategory: string,
  responses: Response[],
  groupedData: Record<string, any[]>,
) {
  // Fetch CSV data
  const csvData = await fetchCSVData()
  console.log(`\n=== Saving ${responses.length} survey responses for ${surveyCategory} ===`)

  const responseData = responses.map((response, index) => {
    console.log(`\n--- Processing response ${index + 1}/${responses.length} ---`)

    // Parse the questionId to extract question key and item index
    const [questionKey, itemIndexStr] = response.questionId.split("-")
    const itemIndex = Number.parseInt(itemIndexStr) || 0

    // Get the question details from groupedData (for question text)
    const questions = groupedData[questionKey] || []
    const question = questions[itemIndex]

    // Find matching CSV data
    const { category, subcategory } = findMatchingCSVRow(questionKey, response.answerChoice, surveyCategory, csvData)

    const responseRecord = {
      submission_id: submissionId,
      survey_category: surveyCategory,
      question_key: questionKey,
      question_text: question?.question || questionKey,
      item_index: itemIndex,
      answer_choice: response.answerChoice,
      response: response.response,
      elaboration: response.elaboration || null,
      category: category,
      subcategory: subcategory,
    }

    console.log(`Response record created:`, {
      question_key: responseRecord.question_key,
      answer_choice: responseRecord.answer_choice,
      category: responseRecord.category,
      subcategory: responseRecord.subcategory,
    })

    return responseRecord
  })

  console.log(`\nInserting ${responseData.length} response records into database...`)
  const { error } = await supabase.from("survey_responses").insert(responseData)

  if (error) {
    console.error("Error saving survey responses:", error)
    throw error
  }

  console.log("Successfully saved survey responses")
}

export async function saveClassroomEntry(submissionId: string, surveyCategory: string, entry: ClassroomEntry) {
  // Save the classroom entry
  const { data: classroomData, error: classroomError } = await supabase
    .from("classroom_entries")
    .insert({
      submission_id: submissionId,
      survey_category: surveyCategory,
      room_number: entry.roomDetails.roomNumber,
      grade_served: entry.roomDetails.gradeServed,
      is_portable: entry.roomDetails.isPortable === "Y",
      ceiling_height: entry.roomDetails.ceilingHeight,
      completed: entry.completed,
    })
    .select()
    .single()

  if (classroomError) {
    console.error("Error saving classroom entry:", classroomError)
    throw classroomError
  }

  // Save the classroom responses with CSV category data
  if (entry.responses.length > 0) {
    const csvData = await fetchCSVData()
    console.log(`\n=== Saving ${entry.responses.length} classroom responses for ${surveyCategory} ===`)

    const responseData = entry.responses.map((response, index) => {
      console.log(`\n--- Processing classroom response ${index + 1}/${entry.responses.length} ---`)

      // Parse the questionId to extract question key, item index, and answer choice
      const parts = response.questionId.split("-")
      const questionKey = parts.slice(0, -2).join("-")
      const itemIndex = Number.parseInt(parts[parts.length - 2]) || 0

      // Find matching CSV data
      const { category, subcategory } = findMatchingCSVRow(questionKey, response.answerChoice, surveyCategory, csvData)

      const responseRecord = {
        classroom_entry_id: classroomData.id,
        question_key: questionKey,
        question_text: questionKey,
        item_index: itemIndex,
        answer_choice: response.answerChoice,
        response: response.response,
        elaboration: response.elaboration || null,
        category: category,
        subcategory: subcategory,
      }

      console.log(`Classroom response record created:`, {
        question_key: responseRecord.question_key,
        answer_choice: responseRecord.answer_choice,
        category: responseRecord.category,
        subcategory: responseRecord.subcategory,
      })

      return responseRecord
    })

    console.log(`\nInserting ${responseData.length} classroom response records into database...`)
    const { error: responsesError } = await supabase.from("classroom_responses").insert(responseData)

    if (responsesError) {
      console.error("Error saving classroom responses:", responsesError)
      throw responsesError
    }

    console.log("Successfully saved classroom responses")
  }

  return classroomData
}

export async function saveAllSurveyData(
  walkerInfo: WalkerInfo,
  dateWalked: string,
  regularResponses: Record<string, Response[]>,
  classroomEntries: Record<string, ClassroomEntry[]>,
  groupedData: Record<string, any[]>,
) {
  try {
    console.log("Starting to save survey data:", {
      walker: walkerInfo.name,
      regularSurveys: Object.keys(regularResponses),
      classroomSurveys: Object.keys(classroomEntries),
      totalRegularResponses: Object.values(regularResponses).flat().length,
      totalClassroomEntries: Object.values(classroomEntries).flat().length,
    })

    // 1. Save walker information (or get existing)
    let walker
    try {
      // If email is provided, try to find existing walker first
      if (walkerInfo.email && walkerInfo.email.trim()) {
        const { data: existingWalker, error: findError } = await supabase
          .from("walkers")
          .select("*")
          .eq("email", walkerInfo.email)
          .single()

        if (existingWalker) {
          walker = existingWalker
          console.log("Using existing walker:", walker.id)
        } else {
          walker = await saveWalker(walkerInfo)
          console.log("Created new walker:", walker.id)
        }
      } else {
        // No email provided, always create new walker
        walker = await saveWalker(walkerInfo)
        console.log("Created new walker:", walker.id)
      }
    } catch (error) {
      // If any error occurs, create new walker
      walker = await saveWalker(walkerInfo)
      console.log("Created new walker:", walker.id)
    }

    // 2. Create survey submission (or get existing for today)
    let submission
    try {
      // Try to find existing submission for today
      const { data: existingSubmission, error: findSubmissionError } = await supabase
        .from("survey_submissions")
        .select("*")
        .eq("walker_id", walker.id)
        .eq("date_walked", dateWalked)
        .single()

      if (existingSubmission) {
        submission = existingSubmission
        console.log("Using existing submission:", submission.id)
      } else {
        submission = await createSurveySubmission(walker.id, dateWalked)
        console.log("Created new submission:", submission.id)
      }
    } catch (error) {
      submission = await createSurveySubmission(walker.id, dateWalked)
      console.log("Created new submission:", submission.id)
    }

    // 3. Save regular survey responses (only for specified surveys)
    for (const [surveyCategory, responses] of Object.entries(regularResponses)) {
      if (responses.length > 0) {
        console.log(`Saving ${responses.length} responses for ${surveyCategory}`)

        // Delete existing responses for this survey category to avoid duplicates
        const { error: deleteError } = await supabase
          .from("survey_responses")
          .delete()
          .eq("submission_id", submission.id)
          .eq("survey_category", surveyCategory)

        if (deleteError) {
          console.warn("Error deleting existing responses:", deleteError)
        }

        await saveSurveyResponses(submission.id, surveyCategory, responses, groupedData)
      }
    }

    // 4. Save classroom entries and their responses (only for specified surveys)
    for (const [surveyCategory, entries] of Object.entries(classroomEntries)) {
      if (entries.length > 0) {
        console.log(`Saving ${entries.length} classroom entries for ${surveyCategory}`)

        // Delete existing classroom entries for this survey category to avoid duplicates
        const { error: deleteError } = await supabase
          .from("classroom_entries")
          .delete()
          .eq("submission_id", submission.id)
          .eq("survey_category", surveyCategory)

        if (deleteError) {
          console.warn("Error deleting existing classroom entries:", deleteError)
        }

        for (const entry of entries) {
          await saveClassroomEntry(submission.id, surveyCategory, entry)
        }
      }
    }

    console.log("Successfully saved survey data")

    return {
      success: true,
      submissionId: submission.id,
      walkerId: walker.id,
    }
  } catch (error) {
    console.error("Error saving survey data:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function getSurveySubmissions() {
  const { data, error } = await supabase
    .from("survey_submissions")
    .select(`
      *,
      walkers (
        name,
        email,
        school
      ),
      survey_responses (
        *
      ),
      classroom_entries (
        *,
        classroom_responses (
          *
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50) // Increase limit to show more submissions

  if (error) {
    console.error("Error fetching survey submissions:", error)
    throw error
  }

  return data
}

export async function getSurveySubmissionsWithPhotos() {
  // First get all submission IDs that have photos
  const { data: photoSubmissions, error: photoError } = await supabase
    .from("survey_photos")
    .select("submission_id")
    .order("uploaded_at", { ascending: false })

  if (photoError) {
    console.error("Error fetching submissions with photos:", photoError)
    throw photoError
  }

  const submissionIds = [...new Set(photoSubmissions?.map((p: { submission_id: string }) => p.submission_id) || [])]
  
  if (submissionIds.length === 0) {
    return []
  }

  // Then get the full submission data for those IDs
  const { data, error } = await supabase
    .from("survey_submissions")
    .select(`
      *,
      walkers (
        name,
        email,
        school
      ),
      survey_responses (
        *
      ),
      classroom_entries (
        *,
        classroom_responses (
          *
        )
      )
    `)
    .in("id", submissionIds)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching survey submissions with photos:", error)
    throw error
  }

  return data
}
