// Debug script to see the exact survey category names
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

// Get all unique survey categories
const allCategories = [...new Set(surveyData.map((item) => item.survey).filter(Boolean))].sort()

console.log("=== ALL SURVEY CATEGORIES ===")
allCategories.forEach((category, index) => {
  console.log(`${index + 1}. "${category}"`)
})

// Look specifically for classroom-related categories
console.log("\n=== CLASSROOM-RELATED CATEGORIES ===")
const classroomCategories = allCategories.filter(
  (cat) => cat.toLowerCase().includes("classroom") || cat.toLowerCase().includes("class"),
)
classroomCategories.forEach((category) => {
  console.log(`"${category}"`)
})

// Count questions per category
console.log("\n=== QUESTION COUNTS ===")
const categoryCounts = {}
surveyData.forEach((item) => {
  if (item.survey) {
    categoryCounts[item.survey] = (categoryCounts[item.survey] || 0) + 1
  }
})

Object.entries(categoryCounts)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([category, count]) => {
    console.log(`"${category}": ${count} questions`)
  })
