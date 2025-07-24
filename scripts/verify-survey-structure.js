// Let's analyze the actual CSV data to see all survey categories
const response = await fetch(
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EAQuestionsV2-mmWCNnjeN36xw9Hn9tH14xiYuVvnv6.csv",
)
const csvText = await response.text()

// Parse CSV to extract all unique survey categories
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

// Extract all unique survey categories
const allSurveyCategories = [...new Set(surveyData.map((item) => item.survey).filter(Boolean))]

console.log("=== ALL SURVEY CATEGORIES ===")
console.log("Total categories:", allSurveyCategories.length)
console.log("\nCategories:")
allSurveyCategories.sort().forEach((category, index) => {
  console.log(`${index + 1}. ${category}`)
})

// Count questions per category
console.log("\n=== QUESTIONS PER CATEGORY ===")
const categoryStats = {}
surveyData.forEach((item) => {
  if (item.survey) {
    categoryStats[item.survey] = (categoryStats[item.survey] || 0) + 1
  }
})

Object.entries(categoryStats)
  .sort(([, a], [, b]) => b - a)
  .forEach(([category, count]) => {
    console.log(`${category}: ${count} questions`)
  })

// Identify which categories might need multi-entry support
console.log("\n=== MULTI-ENTRY CATEGORIES ===")
const multiEntryCategories = ["Classrooms", "Specialized Classrooms", "Special Education Classrooms"]
multiEntryCategories.forEach((category) => {
  const questionCount = categoryStats[category] || 0
  console.log(`${category}: ${questionCount} questions`)
})

console.log("\n=== REGULAR CATEGORIES ===")
allSurveyCategories
  .filter((cat) => !multiEntryCategories.includes(cat))
  .sort()
  .forEach((category) => {
    const questionCount = categoryStats[category] || 0
    console.log(`${category}: ${questionCount} questions`)
  })
