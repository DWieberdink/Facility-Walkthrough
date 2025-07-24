// Let's first analyze the classroom question structure to understand the repetition
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

// Analyze classroom categories
const classroomCategories = [
  "Classrooms",
  "General Classrooms",
  "Specialized Classrooms",
  "Special Education Classrooms",
]

classroomCategories.forEach((category) => {
  const categoryQuestions = surveyData.filter((item) => item.survey === category)

  console.log(`\n=== ${category.toUpperCase()} ===`)
  console.log(`Total rows: ${categoryQuestions.length}`)

  // Group by question text to see duplicates
  const questionGroups = {}
  categoryQuestions.forEach((q) => {
    if (!questionGroups[q.question]) {
      questionGroups[q.question] = []
    }
    questionGroups[q.question].push(q)
  })

  console.log(`Unique questions: ${Object.keys(questionGroups).length}`)

  // Show questions with multiple rows
  Object.entries(questionGroups).forEach(([question, rows]) => {
    if (rows.length > 1) {
      console.log(`\nQUESTION (${rows.length} rows): ${question}`)
      rows.forEach((row, index) => {
        console.log(`  Row ${index + 1}:`)
        console.log(`    Answer Choices: "${row.answerChoices}"`)
        console.log(`    Category: "${row.Category}"`)
        console.log(`    Subcategory: "${row.Subcategory}"`)
      })
    }
  })
})
