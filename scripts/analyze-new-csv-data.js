// Analyze the new CSV file structure and content
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

console.log("=== NEW CSV FILE ANALYSIS ===")
console.log("Headers:", Object.keys(surveyData[0] || {}))
console.log("Total rows:", surveyData.length)

// Analyze survey categories
const surveyCategories = [...new Set(surveyData.map((item) => item.survey).filter(Boolean))]
console.log("\n=== SURVEY CATEGORIES ===")
console.log("Total categories:", surveyCategories.length)
surveyCategories.sort().forEach((category, index) => {
  const count = surveyData.filter((item) => item.survey === category).length
  console.log(`${index + 1}. ${category} (${count} questions)`)
})

// Check for new scoreWeights column
console.log("\n=== SCORE WEIGHTS ANALYSIS ===")
const hasScoreWeights = surveyData.some((item) => item.scoreWeights)
console.log("Has scoreWeights column:", hasScoreWeights)

if (hasScoreWeights) {
  const uniqueWeights = [...new Set(surveyData.map((item) => item.scoreWeights).filter(Boolean))]
  console.log("Unique score weights:", uniqueWeights.sort())
}

// Sample data structure
console.log("\n=== SAMPLE DATA ===")
console.log("First 3 rows:")
surveyData.slice(0, 3).forEach((row, index) => {
  console.log(`\nRow ${index + 1}:`)
  Object.entries(row).forEach(([key, value]) => {
    console.log(`  ${key}: "${value}"`)
  })
})

// Check for Close Out category questions
const closeOutQuestions = surveyData.filter((item) => item.survey === "Close Out")
console.log("\n=== CLOSE OUT QUESTIONS ===")
console.log(`Found ${closeOutQuestions.length} Close Out questions`)
closeOutQuestions.slice(0, 5).forEach((q, index) => {
  console.log(`${index + 1}. ${q.question}`)
})

// Check for classroom-related categories
console.log("\n=== CLASSROOM-RELATED CATEGORIES ===")
const classroomCategories = surveyCategories.filter(
  (cat) => cat.toLowerCase().includes("classroom") || cat.toLowerCase().includes("class"),
)
classroomCategories.forEach((category) => {
  const count = surveyData.filter((item) => item.survey === category).length
  console.log(`"${category}": ${count} questions`)
})
