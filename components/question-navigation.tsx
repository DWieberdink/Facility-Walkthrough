"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, List, Check } from "lucide-react"
import { generateQuestionId } from "@/lib/utils"
import React from "react"

interface SurveyQuestion {
  survey: string
  question: string
  answerChoices: string
  matchColumn: string
  Subcategory: string
  Category: string
}

interface Response {
  questionId: string
  answerChoice: string
  response: "Yes" | "No" | "Does Not Apply" | "Not Able to View"
  elaboration?: string
}

interface QuestionNavigationProps {
  surveyName: string
  filteredQuestions: [string, SurveyQuestion[]][]
  getAnswerChoices: (question: SurveyQuestion) => string[]
  getResponse: (questionKey: string, itemIndex: number, answerChoice: string) => Response | undefined
  isMultiEntryCategory: boolean
  currentEntry?: any
}

export const QuestionNavigation = React.memo(function QuestionNavigation({
  surveyName,
  filteredQuestions,
  getAnswerChoices,
  getResponse,
  isMultiEntryCategory,
  currentEntry,
}: QuestionNavigationProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const scrollToQuestion = (questionKey: string) => {
    const elementId = generateQuestionId(questionKey)
    const element = document.getElementById(elementId)

    if (element) {
      // First scroll to the element
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })

      // Add a small delay and then adjust for any fixed headers
      setTimeout(() => {
        const rect = element.getBoundingClientRect()
        const offset = 100 // Adjust this value based on your header height

        if (rect.top < offset) {
          window.scrollBy({
            top: rect.top - offset,
            behavior: "smooth",
          })
        }
      }, 100)
    } else {
      console.warn(`Element with ID "${elementId}" not found`)
    }
  }

  const isQuestionCompleted = (questionKey: string, questions: SurveyQuestion[]): boolean => {
    return questions.every((question, itemIndex) => {
      const choices = getAnswerChoices(question)
      // Skip questions that are filtered out (empty choices array)
      if (choices.length === 0) return true

      return choices.every((choice) => {
        const response = getResponse(questionKey, itemIndex, choice)
        return response && response.response
      })
    })
  }

  const totalQuestions = filteredQuestions.length
  const completedQuestions = filteredQuestions.filter(([questionKey, questions]) =>
    isQuestionCompleted(questionKey, questions),
  ).length

  return (
    <Card className="shadow-lg border-0 mb-6">
      <CardHeader>
        <div className="flex flex-col items-stretch justify-start gap-y-1.5">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-md text-gray-800">Question Navigation</CardTitle>
            <Badge variant="outline" className="border-blue-200 text-blue-700">
              {completedQuestions}/{totalQuestions} Complete
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show Questions
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredQuestions.map(([questionKey, questions], index) => {
              const isCompleted = isQuestionCompleted(questionKey, questions)
              const hasVisibleQuestions = questions.some((q) => getAnswerChoices(q).length > 0)

              // Don't show questions that are completely filtered out
              if (!hasVisibleQuestions) return null

              return (
                <div
                  key={questionKey}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                    isCompleted
                      ? "bg-green-50 border-green-200 hover:bg-green-100"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                  onClick={() => scrollToQuestion(questionKey)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {isCompleted ? (
                        <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-2">{questionKey}</p>
                      {questions.length > 0 && questions[0].Category && (
                        <p className="text-xs text-gray-500 mt-1">
                          {questions[0].Category}
                          {questions[0].Subcategory && ` • ${questions[0].Subcategory}`}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            isCompleted
                              ? "border-green-300 text-green-700 bg-green-50"
                              : "border-gray-300 text-gray-600"
                          }`}
                        >
                          {questions.reduce((total, q) => total + getAnswerChoices(q).length, 0)} items
                        </Badge>
                        {isCompleted && <Badge className="text-xs bg-green-600 text-white">Completed</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {filteredQuestions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <List className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No questions available for this survey.</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
})
