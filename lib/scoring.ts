import { getSupabase } from "./supabase"

const supabase = getSupabase()

export interface ScoredResponse {
  questionKey: string
  questionText: string
  answerChoice: string
  response: string
  answerWeight: number
  scoreWeight: number
  score: number // answerWeight * 1 for Yes, answerWeight * 0 for No, null for excluded
  category: string
  subcategory: string
  surveyCategory: string
}

export interface CategoryScore {
  category: string
  subcategory: string
  totalScore: number
  maxPossibleScore: number
  percentage: number
  questionCount: number
  excludedCount: number
}

export interface SurveyScore {
  surveyCategory: string
  totalScore: number
  maxPossibleScore: number
  percentage: number
  categories: CategoryScore[]
}

export interface OverallScore {
  totalScore: number
  maxPossibleScore: number
  percentage: number
  surveyScores: SurveyScore[]
  allResponses: ScoredResponse[]
}

// Fetch survey data with score weights from the new CSV
export async function fetchSurveyDataWithWeights(): Promise<Record<string, any[]>> {
  const response = await fetch(
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EAQuestionsV2-RFM7CW7A1nU9bLu2m6TOUOBB4Ok7sZ.csv",
  )
  const csvText = await response.text()

  const lines = csvText.split("\n")
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
  const data: any[] = []

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values: string[] = []
      let current = ""
      let inQuotes = false

      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          values.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      values.push(current.trim())

      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ""
      })
      data.push(row)
    }
  }

  // Group by question
  const grouped: Record<string, any[]> = {}
  data.forEach((item) => {
    if (item.survey && item.question) {
      if (!grouped[item.question]) {
        grouped[item.question] = []
      }
      grouped[item.question].push(item)
    }
  })

  console.log("CSV data loaded:", {
    totalRows: data.length,
    uniqueQuestions: Object.keys(grouped).length,
    surveys: [...new Set(data.map((item) => item.survey))].filter(Boolean),
  })

  return grouped
}

// Get all submissions from all walkers
export async function getAllSubmissions() {
  console.log("Fetching all submissions from database...")

  const { data, error } = await supabase
    .from("survey_submissions")
    .select(`
      *,
      walkers (name, email, school)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching all submissions:", error)
    throw error
  }

  console.log("Found total submissions:", data?.length || 0)
  return data || []
}

// Calculate scores for a submission using the new scoring method
export async function calculateSubmissionScores(submissionId: string): Promise<OverallScore> {
  console.log("Calculating scores for submission:", submissionId)

  // Fetch submission data from Supabase - INCLUDING category and subcategory from database
  const { data: submission, error } = await supabase
    .from("survey_submissions")
    .select(`
      *,
      walkers (name, email, school),
      survey_responses (
        id,
        submission_id,
        survey_category,
        question_key,
        question_text,
        item_index,
        answer_choice,
        response,
        elaboration,
        category,
        subcategory,
        created_at
      ),
      classroom_entries (
        *,
        classroom_responses (
          id,
          classroom_entry_id,
          question_key,
          question_text,
          item_index,
          answer_choice,
          response,
          elaboration,
          created_at
        )
      )
    `)
    .eq("id", submissionId)
    .single()

  if (error) {
    console.error("Error fetching submission:", error)
    throw error
  }

  if (!submission) {
    throw new Error("Submission not found")
  }

  console.log("Submission data:", {
    id: submission.id,
    walker: submission.walkers?.name,
    responseCount: submission.survey_responses?.length || 0,
    classroomCount: submission.classroom_entries?.length || 0,
  })

  // Fetch survey data with weights (still needed for answer weights and score weights)
  const surveyDataWithWeights = await fetchSurveyDataWithWeights()

  const scoredResponses: ScoredResponse[] = []
  const unmatchedResponses: any[] = []

  // Process regular survey responses
  if (submission.survey_responses) {
    console.log("Processing regular survey responses...")
    submission.survey_responses.forEach((response: any) => {
      console.log("Processing response:", response.question_key, response.answer_choice, response.survey_category)

      const questionData = surveyDataWithWeights[response.question_key]
      if (!questionData) {
        console.log("No question data found for:", response.question_key)
        unmatchedResponses.push({
          type: "regular",
          questionKey: response.question_key,
          answerChoice: response.answer_choice,
          surveyCategory: response.survey_category,
          reason: "No question data in CSV",
        })
        return
      }

      // Improved matching logic - try multiple approaches
      let matchingQuestion = null

      // 1. First, filter by survey category to get the right context
      const surveySpecificQuestions = questionData.filter((q) => q.survey === response.survey_category)

      if (surveySpecificQuestions.length > 0) {
        // 2. Try exact match on answer choice within the survey
        matchingQuestion = surveySpecificQuestions.find((q) => {
          if (!q.answerChoices || q.answerChoices === "To be updated") {
            return false
          }
          const choices = q.answerChoices.split(",").map((c: string) => c.trim())
          return choices.includes(response.answer_choice)
        })

        // 3. If no match on answer choices, try matching where the question itself is the answer choice
        if (!matchingQuestion) {
          matchingQuestion = surveySpecificQuestions.find((q) => q.question === response.answer_choice)
        }

        // 4. If still no match, use the first question in the survey-specific group
        if (!matchingQuestion && surveySpecificQuestions.length === 1) {
          matchingQuestion = surveySpecificQuestions[0]
        }

        // 5. If still no match, try any question in the survey-specific group
        if (!matchingQuestion) {
          matchingQuestion = surveySpecificQuestions[0]
        }
      }

      // 6. Fallback: try the original approaches without survey filtering
      if (!matchingQuestion) {
        matchingQuestion = questionData.find((q) => {
          if (!q.answerChoices || q.answerChoices === "To be updated") {
            return false
          }
          const choices = q.answerChoices.split(",").map((c: string) => c.trim())
          return choices.includes(response.answer_choice)
        })
      }

      if (!matchingQuestion) {
        matchingQuestion = questionData.find((q) => q.question === response.answer_choice)
      }

      if (!matchingQuestion && questionData.length === 1) {
        matchingQuestion = questionData[0]
      }

      if (!matchingQuestion) {
        matchingQuestion = questionData[0] // Last resort
      }

      if (!matchingQuestion) {
        console.log("No matching question found for:", response.question_key, response.answer_choice)
        unmatchedResponses.push({
          type: "regular",
          questionKey: response.question_key,
          answerChoice: response.answer_choice,
          surveyCategory: response.survey_category,
          reason: "No matching question in CSV data",
          availableChoices: questionData.map((q) => q.answerChoices).filter(Boolean),
        })
        return
      }

      const answerWeight = Number.parseFloat(matchingQuestion.answerWeights) || 0
      const scoreWeight = Number.parseFloat(matchingQuestion.scoreWeight) || 0
      let score: number | null = null

      // Calculate score based on response using new method
      if (response.response === "Yes") {
        score = answerWeight * 1
      } else if (response.response === "No") {
        score = answerWeight * 0
      }
      // "Does Not Apply" and "Not Able to View" are excluded (score = null)

      // For NON-CLASSROOM surveys, use database values for category and subcategory if available
      let category: string
      let subcategory: string

      if (response.category && response.subcategory) {
        // Use database values if they exist and are not null
        category = response.category
        subcategory = response.subcategory
        console.log("Using database category/subcategory:", { category, subcategory })
      } else {
        // Fallback to CSV data
        category = matchingQuestion.Category || "Uncategorized"
        subcategory = matchingQuestion.Subcategory || "General"
        console.log("Using CSV category/subcategory:", { category, subcategory })
      }

      const surveyCategory = response.survey_category || "Unknown Survey"

      // Skip "not scored" categories
      if (category.toLowerCase() === "not scored" || subcategory.toLowerCase() === "not scored") {
        console.log("Skipping 'not scored' category:", category, subcategory)
        return
      }

      console.log("Successfully matched regular response:", {
        questionKey: response.question_key,
        answerChoice: response.answer_choice,
        category: category,
        subcategory: subcategory,
        surveyCategory: surveyCategory,
        answerWeight,
        scoreWeight,
        score,
        source: response.category ? "database" : "csv",
      })

      scoredResponses.push({
        questionKey: response.question_key,
        questionText: response.question_text,
        answerChoice: response.answer_choice,
        response: response.response,
        answerWeight,
        scoreWeight,
        score: score,
        category: category,
        subcategory: subcategory,
        surveyCategory: surveyCategory,
      })
    })
  }

  // Process classroom responses (still use CSV data for these)
  if (submission.classroom_entries) {
    console.log("Processing classroom responses...")
    submission.classroom_entries.forEach((entry: any) => {
      console.log("Processing classroom entry:", entry.survey_category, "Room:", entry.room_number)

      if (entry.classroom_responses) {
        entry.classroom_responses.forEach((response: any) => {
          const questionData = surveyDataWithWeights[response.question_key]
          if (!questionData) {
            console.log("No question data found for classroom response:", response.question_key)
            unmatchedResponses.push({
              type: "classroom",
              questionKey: response.question_key,
              answerChoice: response.answer_choice,
              surveyCategory: entry.survey_category,
              reason: "No question data in CSV",
            })
            return
          }

          // Use the same improved matching logic
          let matchingQuestion = null

          // 1. First, filter by survey category
          const surveySpecificQuestions = questionData.filter((q) => q.survey === entry.survey_category)

          if (surveySpecificQuestions.length > 0) {
            // 2. Try exact match on answer choice within the survey
            matchingQuestion = surveySpecificQuestions.find((q) => {
              if (!q.answerChoices || q.answerChoices === "To be updated") {
                return false
              }
              const choices = q.answerChoices.split(",").map((c: string) => c.trim())
              return choices.includes(response.answer_choice)
            })

            // 3. If no match on answer choices, try matching where the question itself is the answer choice
            if (!matchingQuestion) {
              matchingQuestion = surveySpecificQuestions.find((q) => q.question === response.answer_choice)
            }

            // 4. If still no match, use the first question in the survey-specific group
            if (!matchingQuestion && surveySpecificQuestions.length === 1) {
              matchingQuestion = surveySpecificQuestions[0]
            }

            // 5. If still no match, try any question in the survey-specific group
            if (!matchingQuestion) {
              matchingQuestion = surveySpecificQuestions[0]
            }
          }

          // 6. Fallback approaches
          if (!matchingQuestion) {
            matchingQuestion = questionData.find((q) => {
              if (!q.answerChoices || q.answerChoices === "To be updated") {
                return false
              }
              const choices = q.answerChoices.split(",").map((c: string) => c.trim())
              return choices.includes(response.answer_choice)
            })
          }

          if (!matchingQuestion) {
            matchingQuestion = questionData.find((q) => q.question === response.answer_choice)
          }

          if (!matchingQuestion && questionData.length === 1) {
            matchingQuestion = questionData[0]
          }

          if (!matchingQuestion) {
            matchingQuestion = questionData[0]
          }

          if (!matchingQuestion) {
            console.log(
              "No matching question found for classroom response:",
              response.question_key,
              response.answer_choice,
            )
            unmatchedResponses.push({
              type: "classroom",
              questionKey: response.question_key,
              answerChoice: response.answer_choice,
              surveyCategory: entry.survey_category,
              reason: "No matching question in CSV data",
              availableChoices: questionData.map((q) => q.answerChoices).filter(Boolean),
            })
            return
          }

          const answerWeight = Number.parseFloat(matchingQuestion.answerWeights) || 0
          const scoreWeight = Number.parseFloat(matchingQuestion.scoreWeight) || 0
          let score: number | null = null

          if (response.response === "Yes") {
            score = answerWeight * 1
          } else if (response.response === "No") {
            score = answerWeight * 0
          }

          // For classroom responses, always use CSV data for category and subcategory
          const category = matchingQuestion.Category || "Uncategorized"
          const subcategory = matchingQuestion.Subcategory || "General"

          // Skip "not scored" categories
          if (category.toLowerCase() === "not scored" || subcategory.toLowerCase() === "not scored") {
            console.log("Skipping 'not scored' classroom category:", category, subcategory)
            return
          }

          console.log("Successfully matched classroom response:", {
            questionKey: response.question_key,
            answerChoice: response.answer_choice,
            category: category,
            subcategory: subcategory,
            surveyCategory: entry.survey_category,
            answerWeight,
            scoreWeight,
            score,
            source: "csv",
          })

          scoredResponses.push({
            questionKey: response.question_key,
            questionText: response.question_text,
            answerChoice: response.answer_choice,
            response: response.response,
            answerWeight,
            scoreWeight,
            score: score,
            category: category,
            subcategory: subcategory,
            surveyCategory: entry.survey_category,
          })
        })
      }
    })
  }

  console.log("Scoring summary:", {
    totalScoredResponses: scoredResponses.length,
    unmatchedResponses: unmatchedResponses.length,
    surveyCategories: [...new Set(scoredResponses.map((r) => r.surveyCategory))],
    categoriesFound: [...new Set(scoredResponses.map((r) => `${r.category}/${r.subcategory}`))],
  })

  if (unmatchedResponses.length > 0) {
    console.log("Unmatched responses details:", unmatchedResponses.slice(0, 10)) // Show first 10
  }

  // Calculate scores by category and survey using new method
  const surveyScores: SurveyScore[] = []
  const surveyCategories = [...new Set(scoredResponses.map((r) => r.surveyCategory))]

  console.log("Processing survey categories:", surveyCategories)

  surveyCategories.forEach((surveyCategory) => {
    const surveyResponses = scoredResponses.filter((r) => r.surveyCategory === surveyCategory)
    console.log(`Survey ${surveyCategory}: ${surveyResponses.length} responses`)

    const categories = [...new Set(surveyResponses.map((r) => `${r.category}|${r.subcategory}`))]
    console.log(`Survey ${surveyCategory} categories:`, categories)

    const categoryScores: CategoryScore[] = categories.map((catSubcat) => {
      const [category, subcategory] = catSubcat.split("|")
      const categoryResponses = surveyResponses.filter((r) => r.category === category && r.subcategory === subcategory)

      const scoredResponses = categoryResponses.filter((r) => r.score !== null)
      const excludedCount = categoryResponses.length - scoredResponses.length

      // New scoring calculation: sum of answerWeights divided by sum of scoreWeights
      const totalAnswerWeights = scoredResponses.reduce((sum, r) => sum + (r.score || 0), 0)
      const totalScoreWeights = scoredResponses.reduce((sum, r) => sum + r.scoreWeight, 0)

      const percentage = totalScoreWeights > 0 ? (totalAnswerWeights / totalScoreWeights) * 100 : 0

      console.log(
        `Category ${category}/${subcategory}: ${scoredResponses.length} scored, ${excludedCount} excluded, score: ${totalAnswerWeights}/${totalScoreWeights} = ${percentage.toFixed(1)}%`,
      )

      return {
        category,
        subcategory,
        totalScore: totalAnswerWeights,
        maxPossibleScore: totalScoreWeights,
        percentage,
        questionCount: scoredResponses.length,
        excludedCount,
      }
    })

    const surveyTotalScore = categoryScores.reduce((sum, c) => sum + c.totalScore, 0)
    const surveyMaxScore = categoryScores.reduce((sum, c) => sum + c.maxPossibleScore, 0)

    console.log(`Survey ${surveyCategory} total: ${surveyTotalScore}/${surveyMaxScore}`)

    surveyScores.push({
      surveyCategory,
      totalScore: surveyTotalScore,
      maxPossibleScore: surveyMaxScore,
      percentage: surveyMaxScore > 0 ? (surveyTotalScore / surveyMaxScore) * 100 : 0,
      categories: categoryScores,
    })
  })

  const overallTotalScore = surveyScores.reduce((sum, s) => sum + s.totalScore, 0)
  const overallMaxScore = surveyScores.reduce((sum, s) => sum + s.maxPossibleScore, 0)

  console.log("Final overall score:", overallTotalScore, "/", overallMaxScore)
  console.log(
    "Final survey breakdown:",
    surveyScores.map((s) => ({
      name: s.surveyCategory,
      score: s.percentage.toFixed(1) + "%",
      categories: s.categories.length,
    })),
  )

  return {
    totalScore: overallTotalScore,
    maxPossibleScore: overallMaxScore,
    percentage: overallMaxScore > 0 ? (overallTotalScore / overallMaxScore) * 100 : 0,
    surveyScores,
    allResponses: scoredResponses,
  }
}

// Get all submissions for a walker (to check if all surveys are complete)
export async function getWalkerSubmissions(walkerEmail: string) {
  console.log("Fetching submissions for walker:", walkerEmail)

  const { data, error } = await supabase
    .from("survey_submissions")
    .select(`
      *,
      walkers!inner (name, email, school),
      survey_responses (survey_category),
      classroom_entries (survey_category)
    `)
    .eq("walkers.email", walkerEmail)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching walker submissions:", error)
    throw error
  }

  console.log("Found submissions:", data?.length || 0)
  return data || []
}

// Check if all required surveys are completed - More lenient logic
export function areAllSurveysComplete(submissions: any[]): boolean {
  const requiredSurveys = [
    "Close Out",
    "General Classrooms",
    "Specialized Classrooms",
    "Special Education Classrooms",
    "Shared Spaces",
    "Library, Extended Learning",
    "Assembly Spaces",
    "Site Elements",
    "Staff Elements",
  ]

  const completedSurveys = new Set<string>()

  submissions.forEach((submission) => {
    // Add surveys from regular responses
    if (submission.survey_responses) {
      submission.survey_responses.forEach((response: any) => {
        if (response.survey_category) {
          completedSurveys.add(response.survey_category)
        }
      })
    }

    // Add surveys from classroom entries
    if (submission.classroom_entries) {
      submission.classroom_entries.forEach((entry: any) => {
        if (entry.survey_category) {
          completedSurveys.add(entry.survey_category)
        }
      })
    }
  })

  console.log("Required surveys:", requiredSurveys)
  console.log("Completed surveys found:", Array.from(completedSurveys))

  // Check if we have at least 8 out of 9 surveys (more lenient)
  const completedCount = requiredSurveys.filter((survey) => completedSurveys.has(survey)).length
  console.log(`Completed ${completedCount} out of ${requiredSurveys.length} required surveys`)

  // Allow scoring if at least 8 surveys are completed
  return completedCount >= 8
}
