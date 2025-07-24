// Verify that each survey only shows its own questions and no duplicates
const response = await fetch(
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EAQuestionsV2-mmWCNnjeN36xw9Hn9tH14xiYuVvnv6.csv",
)
const csvText = await response.text()

function parseCSV(text) {
  const lines = text.split("\n")
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
  const data = []

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = []
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

      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ""
      })
      data.push(row)
    }
  }

  return data
}

const surveyData = parseCSV(csvText)

// Group by survey category
const surveyCategories = [...new Set(surveyData.map((item) => item.survey).filter(Boolean))]

console.log("=== SURVEY QUESTION VERIFICATION ===")

surveyCategories.forEach((surveyCategory) => {
  console.log(`\n=== ${surveyCategory.toUpperCase()} ===`)

  const surveyQuestions = surveyData.filter((item) => item.survey === surveyCategory)

  // Group by question to see unique questions
  const questionGroups = {}
  surveyQuestions.forEach((q) => {
    if (!questionGroups[q.question]) {
      questionGroups[q.question] = []
    }
    questionGroups[q.question].push(q)
  })

  console.log(`Total rows: ${surveyQuestions.length}`)
  console.log(`Unique questions: ${Object.keys(questionGroups).length}`)

  // Show each unique question and its answer choices
  Object.entries(questionGroups).forEach(([question, rows], index) => {
    console.log(`\n${index + 1}. QUESTION: ${question}`)

    // Show all unique answer choices for this question
    const allAnswerChoices = new Set()
    rows.forEach((row) => {
      if (row.answerChoices && row.answerChoices !== "To be updated") {
        row.answerChoices.split(",").forEach((choice) => {
          allAnswerChoices.add(choice.trim())
        })
      } else {
        allAnswerChoices.add(row.question) // Use question as answer choice
      }
    })

    console.log(`   Answer Choices (${allAnswerChoices.size}):`)
    Array.from(allAnswerChoices).forEach((choice, i) => {
      console.log(`     ${i + 1}. ${choice}`)
    })

    if (rows.length > 1) {
      console.log(`   Note: This question has ${rows.length} rows in CSV`)
    }
  })
})

// Check for questions that appear in multiple surveys
console.log("\n=== QUESTIONS APPEARING IN MULTIPLE SURVEYS ===")
const questionToSurveys = {}
surveyData.forEach((item) => {
  if (!questionToSurveys[item.question]) {
    questionToSurveys[item.question] = new Set()
  }
  questionToSurveys[item.question].add(item.survey)
})

Object.entries(questionToSurveys).forEach(([question, surveys]) => {
  if (surveys.size > 1) {
    console.log(`\nQUESTION: ${question}`)
    console.log(`APPEARS IN: ${Array.from(surveys).join(", ")}`)
  }
})
