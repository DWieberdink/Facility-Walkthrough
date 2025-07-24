// Analyze the new scoreWeights column in the updated CSV
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

console.log("=== SCORE WEIGHTS ANALYSIS ===")

// Check if scoreWeights column exists
const hasScoreWeights = surveyData.some((item) => item.scoreWeights && item.scoreWeights !== "")
console.log("Has scoreWeights data:", hasScoreWeights)

if (hasScoreWeights) {
  // Get all unique score weights
  const uniqueWeights = [...new Set(surveyData.map((item) => item.scoreWeights).filter(Boolean))]
  console.log(
    "\nUnique score weights:",
    uniqueWeights.sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b)),
  )

  // Analyze distribution by survey category
  console.log("\n=== SCORE WEIGHTS BY SURVEY CATEGORY ===")
  const surveyCategories = [...new Set(surveyData.map((item) => item.survey).filter(Boolean))]

  surveyCategories.forEach((category) => {
    const categoryQuestions = surveyData.filter((item) => item.survey === category)
    const weights = categoryQuestions.map((item) => item.scoreWeights).filter(Boolean)
    const uniqueCategoryWeights = [...new Set(weights)]

    console.log(`\n${category}:`)
    console.log(`  Total questions: ${categoryQuestions.length}`)
    console.log(`  Questions with weights: ${weights.length}`)
    console.log(
      `  Unique weights: ${uniqueCategoryWeights.sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b)).join(", ")}`,
    )
  })

  // Show examples of questions with different weights
  console.log("\n=== EXAMPLES BY WEIGHT ===")
  uniqueWeights.slice(0, 5).forEach((weight) => {
    const exampleQuestion = surveyData.find((item) => item.scoreWeights === weight)
    if (exampleQuestion) {
      console.log(`\nWeight ${weight}:`)
      console.log(`  Survey: ${exampleQuestion.survey}`)
      console.log(`  Question: ${exampleQuestion.question}`)
      console.log(`  Category: ${exampleQuestion.Category}`)
    }
  })
}

// Check for "Not Scored" items
const notScoredItems = surveyData.filter((item) => item.Category === "Not Scored" || item.Subcategory === "Not Scored")
console.log(`\n=== NOT SCORED ITEMS ===`)
console.log(`Total "Not Scored" items: ${notScoredItems.length}`)

if (notScoredItems.length > 0) {
  console.log("\nExamples of Not Scored items:")
  notScoredItems.slice(0, 3).forEach((item, index) => {
    console.log(`${index + 1}. ${item.survey}: ${item.question}`)
  })
}
