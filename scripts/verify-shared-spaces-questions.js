// Verify current Shared Spaces questions and show where the new one fits
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

// Filter for Shared Spaces questions
const sharedSpacesQuestions = surveyData.filter((item) => item.survey === "Shared Spaces")

console.log("=== CURRENT SHARED SPACES QUESTIONS ===")
console.log(`Total questions: ${sharedSpacesQuestions.length}`)

// Group by category and subcategory
const categorized = {}
sharedSpacesQuestions.forEach((q) => {
  const category = q.Category || "Uncategorized"
  const subcategory = q.Subcategory || "General"

  if (!categorized[category]) {
    categorized[category] = {}
  }
  if (!categorized[subcategory]) {
    categorized[category][subcategory] = []
  }
  categorized[category][subcategory].push(q)
})

console.log("\n=== QUESTIONS BY CATEGORY ===")
Object.entries(categorized).forEach(([category, subcategories]) => {
  console.log(`\n${category}:`)
  Object.entries(subcategories).forEach(([subcategory, questions]) => {
    console.log(`  ${subcategory} (${questions.length} questions):`)
    questions.forEach((q, index) => {
      console.log(`    ${index + 1}. ${q.question}`)
    })
  })
})

// Show where the new question would fit
console.log("\n=== WHERE NEW QUESTION FITS ===")
const safetySecurityQuestions = sharedSpacesQuestions.filter(
  (q) => q.Category === "Safety and Security" && q.Subcategory === "Organization and Interior Spaces",
)

console.log("Current Safety and Security > Organization and Interior Spaces questions:")
safetySecurityQuestions.forEach((q, index) => {
  console.log(`${index + 1}. ${q.question}`)
})

console.log(
  `\n${safetySecurityQuestions.length + 1}. Generally the cross-corridor doors throughout the school are electrified (NEW)`,
)
