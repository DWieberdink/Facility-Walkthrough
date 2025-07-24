// Fetch and analyze the new CSV data
const response = await fetch(
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EAQuestionsV2-mmWCNnjeN36xw9Hn9tH14xiYuVvnv6.csv",
)
const csvText = await response.text()

// Simple CSV parser
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
const groupedData = {}
surveyData.forEach((item) => {
  if (!groupedData[item.survey]) {
    groupedData[item.survey] = []
  }
  groupedData[item.survey].push(item)
})

console.log("Survey Categories:", Object.keys(groupedData))
console.log("Sample data:", surveyData.slice(0, 5))
console.log("Total questions:", surveyData.length)

// Extract unique schools if available in data
const schools = [...new Set(surveyData.map((item) => item.school).filter(Boolean))]
console.log("Schools found:", schools)
