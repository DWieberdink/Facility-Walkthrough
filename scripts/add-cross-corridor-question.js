// Script to show how to add the new cross-corridor doors question
// This shows the exact format needed for the CSV file

const newQuestion = {
  survey: "Shared Spaces",
  question: "Generally the cross-corridor doors throughout the school are electrified",
  answerChoices: "Generally the cross-corridor doors throughout the school are electrified",
  matchColumn: "Generally the cross-corridor doors throughout the school are electrified",
  Category: "Safety and Security",
  Subcategory: "Organization and Interior Spaces",
}

console.log("=== NEW QUESTION TO ADD TO CSV ===")
console.log("Survey:", newQuestion.survey)
console.log("Question:", newQuestion.question)
console.log("Answer Choices:", newQuestion.answerChoices)
console.log("Match Column:", newQuestion.matchColumn)
console.log("Category:", newQuestion.Category)
console.log("Subcategory:", newQuestion.Subcategory)

console.log("\n=== CSV ROW FORMAT ===")
console.log(
  `"${newQuestion.survey}","${newQuestion.question}","${newQuestion.answerChoices}","${newQuestion.matchColumn}","${newQuestion.Category}","${newQuestion.Subcategory}"`,
)

console.log("\n=== VERIFICATION ===")
console.log("This question will appear in:")
console.log("- Survey Category: Shared Spaces")
console.log("- Will use standard Yes/No/Does Not Apply/Not Able to View response options")
console.log("- Will be grouped under Safety and Security > Organization and Interior Spaces")
console.log("- Will appear as a single answer choice (the question itself)")
