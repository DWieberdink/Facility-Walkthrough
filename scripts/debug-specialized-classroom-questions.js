// Debug script to see exactly what specialized classroom questions we have
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

// Filter for Specialized Classrooms questions
const specializedQuestions = surveyData.filter((item) => item.survey === "Specialized Classrooms")

console.log("=== SPECIALIZED CLASSROOMS QUESTIONS ===")
console.log(`Total questions: ${specializedQuestions.length}`)

// Group by question text to see what we have
const questionGroups = {}
specializedQuestions.forEach((q) => {
  if (!questionGroups[q.question]) {
    questionGroups[q.question] = []
  }
  questionGroups[q.question].push(q)
})

console.log(`\nUnique questions: ${Object.keys(questionGroups).length}`)

// Show all questions and their answer choices
Object.entries(questionGroups).forEach(([question, rows]) => {
  console.log(`\n=== QUESTION: ${question} ===`)
  rows.forEach((row, index) => {
    console.log(`  Row ${index + 1}:`)
    console.log(`    Answer Choices: "${row.answerChoices}"`)
    console.log(`    Category: "${row.Category}"`)
    console.log(`    Subcategory: "${row.Subcategory}"`)
  })
})

// Look for general classroom questions that should appear for all room types
console.log("\n=== GENERAL CLASSROOM QUESTIONS (should appear for all room types) ===")
const generalClassroomQuestions = Object.keys(questionGroups).filter((question) => {
  const lowerQuestion = question.toLowerCase()
  return (
    lowerQuestion.includes("classroom") &&
    !lowerQuestion.includes("science classrooms only") &&
    !lowerQuestion.includes("music classrooms only") &&
    !lowerQuestion.includes("art classrooms only") &&
    !lowerQuestion.includes("cte classrooms only")
  )
})

generalClassroomQuestions.forEach((question) => {
  console.log(`- ${question}`)
})

// Look for room-type specific questions
console.log("\n=== ROOM-TYPE SPECIFIC QUESTIONS ===")
const roomTypeQuestions = {
  science: [],
  music: [],
  art: [],
  cte: [],
}

Object.keys(questionGroups).forEach((question) => {
  const lowerQuestion = question.toLowerCase()
  const answerChoices = questionGroups[question][0]?.answerChoices?.toLowerCase() || ""

  if (lowerQuestion.includes("science classrooms only") || answerChoices.includes("science classrooms only")) {
    roomTypeQuestions.science.push(question)
  }
  if (lowerQuestion.includes("music classrooms only") || answerChoices.includes("music classrooms only")) {
    roomTypeQuestions.music.push(question)
  }
  if (lowerQuestion.includes("art classrooms only") || answerChoices.includes("art classrooms only")) {
    roomTypeQuestions.art.push(question)
  }
  if (lowerQuestion.includes("cte classrooms only") || answerChoices.includes("cte classrooms only")) {
    roomTypeQuestions.cte.push(question)
  }
})

Object.entries(roomTypeQuestions).forEach(([type, questions]) => {
  console.log(`\n${type.toUpperCase()} CLASSROOM SPECIFIC:`)
  questions.forEach((q) => console.log(`  - ${q}`))
})
