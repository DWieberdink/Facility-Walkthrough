"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ChevronRight, Check, User, Mail, Calendar, Plus, Trash2, Building, Calculator } from "lucide-react"
import { saveAllSurveyData } from "../lib/database"
import { MessageSquare } from "lucide-react"
import { PhotoUpload } from "../components/photo-upload"
import { SchoolCombobox } from "../components/school-combobox"
import Image from "next/image"
import { QuestionNavigation } from "../components/question-navigation"
import { generateQuestionId } from "../lib/utils"
import Link from "next/link"

interface SurveyQuestion {
  survey: string
  question: string
  answerChoices: string
  matchColumn: string
  Subcategory: string
  Category: string
  scoreWeight: string
  answerWeights: string
}

interface Response {
  questionId: string
  answerChoice: string
  response: "Yes" | "No" | "Does Not Apply" | "Not Able to View"
  elaboration?: string
}

interface RoomDetails {
  roomNumber: string
  gradeServed: string
  isPortable: "Y" | "N" | ""
  ceilingHeight: string
  roomType: string
  modeOfInstruction: string
}

interface ClassroomEntry {
  id: string
  roomDetails: RoomDetails
  responses: Response[]
  completed: boolean
}

interface WalkerInfo {
  name: string
  email: string
  dateWalked: string
  school: string
}

const RESPONSE_OPTIONS = ["Yes", "No", "Does Not Apply", "Not Able to View"] as const

const ROOM_TYPES = ["Science Classroom", "Music Classroom", "Art Classroom", "CTE Classroom"]

const INSTRUCTION_MODES = [
  "Lecture (i.e., tables in rows generally facing a single direction)",
  "Seminar or Large Group Discussion (i.e., all student desks in a U-shaped or rectangular table configuration, facing the other student desks)",
  "Table Groups (i.e., smaller groups of desks)",
  "Activity Centers (i.e., defined places focused on a particular activity, typical of PreK and Kindergarten)",
  "Unable to Assess",
  "Other",
]

// Updated to include all possible classroom category names
const MULTI_ENTRY_SURVEYS = [
  "Classrooms",
  "General Classrooms",
  "Specialized Classrooms",
  "Special Education Classrooms",
]

export default function SurveyApp() {
  const [surveyData, setSurveyData] = useState<SurveyQuestion[]>([])
  const [groupedData, setGroupedData] = useState<Record<string, SurveyQuestion[]>>({})
  const [responses, setResponses] = useState<Record<string, Response[]>>({})
  const [classroomEntries, setClassroomEntries] = useState<Record<string, ClassroomEntry[]>>({})
  const [currentClassroomEntry, setCurrentClassroomEntry] = useState<Record<string, string>>({})
  const [walkerInfo, setWalkerInfo] = useState<WalkerInfo>({
    name: "",
    email: "",
    dateWalked: new Date().toISOString().split("T")[0],
    school: "",
  })
  const [showSurvey, setShowSurvey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedSurvey, setSelectedSurvey] = useState<string>("")
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null)

  // Add progress tracking state
  const [surveyProgress, setSurveyProgress] = useState<Record<string, boolean>>({})

  // Define all required surveys
  const ALL_REQUIRED_SURVEYS = [
    "Close Out",
    "General Classrooms",
    "Specialized Classrooms",
    "Special Education Classrooms",
    "Shared Spaces",
    "Library, Extended Learning",
    "Assembly Spaces",
    "Site Elements",
    "Staff Elements",
  ]

  // Function to check if a survey is completed - Updated logic
  const isSurveyCompleted = (surveyName: string): boolean => {
    if (MULTI_ENTRY_SURVEYS.includes(surveyName)) {
      // For multi-entry categories, check if at least one entry is completed
      const entries = classroomEntries[surveyName] || []
      const hasCompletedEntry = entries.some((entry) => entry.completed)
      console.log(
        `Survey ${surveyName}: ${entries.length} entries, ${entries.filter((e) => e.completed).length} completed`,
      )
      return hasCompletedEntry
    } else {
      // For regular surveys, check if all questions are answered
      const currentSurveyQuestions = Object.entries(groupedData).filter(([_, questions]) =>
        questions.some((q) => q.survey === surveyName),
      )

      if (currentSurveyQuestions.length === 0) {
        console.log(`Survey ${surveyName}: No questions found`)
        return false
      }

      const isComplete = currentSurveyQuestions.every(([questionKey, questions]) => {
        return questions.every((question, itemIndex) => {
          // Only check questions that belong to this survey
          if (question.survey !== surveyName) return true

          const choices =
            question.answerChoices && question.answerChoices !== "To be updated"
              ? question.answerChoices
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean)
              : [question.question]

          return choices.every((choice) => {
            const responseKey = `${questionKey}-${itemIndex}`
            const surveyResponses = responses[responseKey] || []
            const response = surveyResponses.find((r) => r.questionId === responseKey && r.answerChoice === choice)
            const hasResponse = response && response.response
            if (!hasResponse) {
              console.log(`Missing response for ${surveyName}: ${questionKey} - ${choice}`)
            }
            return hasResponse
          })
        })
      })

      console.log(`Survey ${surveyName}: ${isComplete ? "Complete" : "Incomplete"}`)
      return isComplete
    }
  }

  // Function to update survey progress
  const updateSurveyProgress = () => {
    const newProgress: Record<string, boolean> = {}
    ALL_REQUIRED_SURVEYS.forEach((surveyName) => {
      newProgress[surveyName] = isSurveyCompleted(surveyName)
    })
    setSurveyProgress(newProgress)
    console.log("Updated survey progress:", newProgress)
  }

  // Get completed surveys count
  const getCompletedSurveysCount = (): number => {
    return Object.values(surveyProgress).filter(Boolean).length
  }

  // Check if all surveys are completed - More lenient
  const areAllSurveysCompleted = (): boolean => {
    const completedCount = getCompletedSurveysCount()
    console.log(`Completed surveys: ${completedCount}/${ALL_REQUIRED_SURVEYS.length}`)
    // Allow viewing scores if at least 8 out of 9 surveys are completed
    return completedCount >= 8
  }

  // Store walker info for scoring page access
  const storeWalkerInfo = () => {
    if (walkerInfo.name && walkerInfo.email) {
      localStorage.setItem("currentWalkerInfo", JSON.stringify(walkerInfo))
    }
  }

  const scrollToTop = () => {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }, 100)
  }

  // Get unique survey categories for the filter
  const surveyCategories = [...new Set(surveyData.map((item) => item.survey))]

  // Filter questions by selected survey category
  const filteredQuestions = useMemo(() => {
    if (!selectedSurvey) return Object.entries(groupedData)

    // Only show questions that belong to the selected survey
    const questions = Object.entries(groupedData).filter(([_, questions]) =>
      questions.some((q) => q.survey === selectedSurvey),
    )

    // Remove the specialized classroom logic that was adding extra questions
    // Each survey should only show its own questions

    // For classroom surveys, ensure "does the classroom have windows" appears first among window questions
    if (MULTI_ENTRY_SURVEYS.includes(selectedSurvey)) {
      questions.sort(([keyA], [keyB]) => {
        const isWindowQuestionA = keyA.toLowerCase().includes("window")
        const isWindowQuestionB = keyB.toLowerCase().includes("window")

        // Check for the main window question more precisely
        const isMainWindowQuestionA =
          keyA.toLowerCase().includes("does the classroom have windows") ||
          keyA.toLowerCase().includes("the classroom has windows")
        const isMainWindowQuestionB =
          keyB.toLowerCase().includes("does the classroom have windows") ||
          keyB.toLowerCase().includes("the classroom has windows")

        // If both are window questions
        if (isWindowQuestionA && isWindowQuestionB) {
          // Main window question should come first
          if (isMainWindowQuestionA && !isMainWindowQuestionB) return -1
          if (!isMainWindowQuestionA && isMainWindowQuestionB) return 1

          // If both are main window questions or both are secondary, maintain original order
          return 0
        }

        // If only A is a window question, it should come after non-window questions
        if (isWindowQuestionA && !isWindowQuestionB) return 1

        // If only B is a window question, it should come after non-window questions
        if (!isWindowQuestionA && isWindowQuestionB) return -1

        // If neither are window questions, maintain original order
        return 0
      })
    }

    return questions
  }, [selectedSurvey, groupedData])

  const questionKeys = filteredQuestions.map(([key]) => key)
  const currentQuestionKey = questionKeys[0] || ""
  const currentQuestions = groupedData[currentQuestionKey] || []

  // Check if current survey is a multi-entry category
  const isMultiEntryCategory = MULTI_ENTRY_SURVEYS.includes(selectedSurvey)
  const currentEntries = classroomEntries[selectedSurvey] || []
  const currentEntryId = currentClassroomEntry[selectedSurvey] || ""
  const currentEntry = currentEntries.find((entry) => entry.id === currentEntryId)

  useEffect(() => {
    fetchSurveyData()
  }, [])

  // Update progress when responses or classroom entries change
  useEffect(() => {
    if (Object.keys(groupedData).length > 0) {
      updateSurveyProgress()
    }
  }, [responses, classroomEntries, groupedData])

  // Store walker info whenever it changes
  useEffect(() => {
    storeWalkerInfo()
  }, [walkerInfo])

  const fetchSurveyData = async () => {
    try {
      const response = await fetch(
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EAQuestionsV2-RFM7CW7A1nU9bLu2m6TOUOBB4Ok7sZ.csv",
      )
      const csvText = await response.text()

      const parsed = parseCSV(csvText)

      setSurveyData(parsed)

      const grouped = groupByQuestion(parsed)
      setGroupedData(grouped)

      // Set first survey category as default
      const firstSurvey = [...new Set(parsed.map((item) => item.survey))][0]
      if (firstSurvey) {
        setSelectedSurvey(firstSurvey)
      }

      setLoading(false)
    } catch (error) {
      console.error("Error fetching survey data:", error)
      setLoading(false)
    }
  }

  const parseCSV = (text: string): SurveyQuestion[] => {
    const lines = text.split("\n")
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
    const data: SurveyQuestion[] = []

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values: string[] = []
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

        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ""
        })
        data.push(row as SurveyQuestion)
      }
    }

    return data.filter((item) => item.survey && item.question)
  }

  const groupByQuestion = (data: SurveyQuestion[]): Record<string, SurveyQuestion[]> => {
    const grouped: Record<string, SurveyQuestion[]> = {}

    data.forEach((item) => {
      if (!grouped[item.question]) {
        grouped[item.question] = []
      }
      grouped[item.question].push(item)
    })

    return grouped
  }

  const handleWalkerInfoChange = (field: keyof WalkerInfo, value: string) => {
    setWalkerInfo((prev) => ({ ...prev, [field]: value }))
  }

  const canStartSurvey = () => {
    return walkerInfo.name && walkerInfo.email && walkerInfo.dateWalked && walkerInfo.school
  }

  const handleStartSurvey = async () => {
    if (canStartSurvey()) {
      try {
        // Store walker info for scoring page
        storeWalkerInfo()

        // Create submission immediately when starting survey
        const result = await saveAllSurveyData(
          walkerInfo,
          walkerInfo.dateWalked,
          {}, // empty responses initially
          {}, // empty classroom entries initially
          groupedData,
        )

        if (result.success) {
          setCurrentSubmissionId(result.submissionId)
          setShowSurvey(true)
          console.log("Survey started with submission ID:", result.submissionId)
        } else {
          alert(`Error creating survey session: ${result.error}`)
        }
      } catch (error) {
        console.error("Error starting survey:", error)
        alert("Failed to start survey. Please try again.")
      }
    }
  }

  const createNewClassroomEntry = () => {
    const newId = `${selectedSurvey}-${Date.now()}`
    const newEntry: ClassroomEntry = {
      id: newId,
      roomDetails: {
        roomNumber: "",
        gradeServed: "",
        isPortable: "",
        ceilingHeight: "",
        roomType: "",
        modeOfInstruction: "",
      },
      responses: [],
      completed: false,
    }

    setClassroomEntries((prev) => ({
      ...prev,
      [selectedSurvey]: [...(prev[selectedSurvey] || []), newEntry],
    }))

    setCurrentClassroomEntry((prev) => ({
      ...prev,
      [selectedSurvey]: newId,
    }))
  }

  const deleteClassroomEntry = (entryId: string) => {
    setClassroomEntries((prev) => ({
      ...prev,
      [selectedSurvey]: (prev[selectedSurvey] || []).filter((entry) => entry.id !== entryId),
    }))

    // If we deleted the current entry, select another one or clear
    if (currentEntryId === entryId) {
      const remainingEntries = (classroomEntries[selectedSurvey] || []).filter((entry) => entry.id !== entryId)
      if (remainingEntries.length > 0) {
        setCurrentClassroomEntry((prev) => ({
          ...prev,
          [selectedSurvey]: remainingEntries[0].id,
        }))
      } else {
        setCurrentClassroomEntry((prev) => ({
          ...prev,
          [selectedSurvey]: "",
        }))
      }
    }
  }

  const selectClassroomEntry = (entryId: string) => {
    setCurrentClassroomEntry((prev) => ({
      ...prev,
      [selectedSurvey]: entryId,
    }))
  }

  const updateRoomDetails = (field: keyof RoomDetails, value: string) => {
    if (!currentEntry) return

    setClassroomEntries((prev) => ({
      ...prev,
      [selectedSurvey]: (prev[selectedSurvey] || []).map((entry) =>
        entry.id === currentEntryId ? { ...entry, roomDetails: { ...entry.roomDetails, [field]: value } } : entry,
      ),
    }))
  }

  const handleResponse = (
    questionKey: string,
    itemIndex: number,
    answerChoice: string,
    response: (typeof RESPONSE_OPTIONS)[number],
  ) => {
    if (isMultiEntryCategory && currentEntry) {
      // Handle classroom entry responses
      const responseKey = `${questionKey}-${itemIndex}-${answerChoice}`

      // More efficient state update for classroom entries
      setClassroomEntries((prev) => {
        // Get the current entries for this survey
        const currentSurveyEntries = prev[selectedSurvey] || []

        // Find the entry we need to update
        const entryIndex = currentSurveyEntries.findIndex((entry) => entry.id === currentEntryId)
        if (entryIndex === -1) return prev // Entry not found

        // Create a copy of the entries array
        const updatedEntries = [...currentSurveyEntries]

        // Get the current entry
        const entry = { ...updatedEntries[entryIndex] }

        // Filter out existing response for this question/choice if it exists
        const filteredResponses = entry.responses.filter((r) => r.questionId !== responseKey)

        // Add the new response
        const updatedResponses = [...filteredResponses, { questionId: responseKey, answerChoice, response }]

        // Update the entry with new responses
        entry.responses = updatedResponses
        updatedEntries[entryIndex] = entry

        // Return the updated state
        return {
          ...prev,
          [selectedSurvey]: updatedEntries,
        }
      })

      // Only run the window question logic if this is actually a window question
      // This avoids unnecessary processing for every response
      if (
        questionKey.toLowerCase().includes("does the classroom have windows") &&
        answerChoice === "The classroom has windows" &&
        response === "No"
      ) {
        // Use setTimeout to defer this heavy operation until after the UI updates
        setTimeout(() => {
          // Find all window-related questions in the current survey
          const windowQuestions = Object.entries(groupedData).filter(
            ([key, questions]) =>
              key.toLowerCase().includes("window") &&
              questions.some((q) => q.survey === selectedSurvey) &&
              // Exclude the "are the windows operable" question from auto-answer
              !key.toLowerCase().includes("are the windows operable"),
          )

          if (windowQuestions.length === 0) return // No window questions to auto-answer

          // Auto-answer all window questions with "No" for ALL their answer choices
          setClassroomEntries((prev) => {
            const currentSurveyEntries = prev[selectedSurvey] || []
            const entryIndex = currentSurveyEntries.findIndex((entry) => entry.id === currentEntryId)
            if (entryIndex === -1) return prev

            const updatedEntries = [...currentSurveyEntries]
            const entry = { ...updatedEntries[entryIndex] }

            // Prepare all auto-responses
            const autoResponses: Response[] = []
            windowQuestions.forEach(([windowQuestionKey, questions]) => {
              // Skip the original "does the classroom have windows" question
              if (windowQuestionKey.toLowerCase().includes("does the classroom have windows")) {
                return
              }

              questions.forEach((question, qItemIndex) => {
                const choices = getAnswerChoices(question)
                choices.forEach((choice) => {
                  const autoResponseKey = `${windowQuestionKey}-${qItemIndex}-${choice}`
                  autoResponses.push({
                    questionId: autoResponseKey,
                    answerChoice: choice,
                    response: "No",
                  })
                })
              })
            })

            // Filter out any existing responses for these questions
            const existingResponseIds = autoResponses.map((r) => r.questionId)
            const filteredResponses = entry.responses.filter((r) => !existingResponseIds.includes(r.questionId))

            // Add all auto-responses
            entry.responses = [...filteredResponses, ...autoResponses]
            updatedEntries[entryIndex] = entry

            console.log(
              `Auto-answered ${autoResponses.length} window-related questions with "No" (excluding operable windows)`,
            )

            return {
              ...prev,
              [selectedSurvey]: updatedEntries,
            }
          })
        }, 0)
      }
    } else {
      // Handle regular survey responses - optimize this as well
      setResponses((prev) => {
        const responseKey = `${questionKey}-${itemIndex}`
        const surveyResponses = prev[responseKey] || []

        // Check if this response already exists
        const existingIndex = surveyResponses.findIndex(
          (r) => r.questionId === responseKey && r.answerChoice === answerChoice,
        )

        const newResponse: Response = { questionId: responseKey, answerChoice, response }

        // Create a new array with the updated response
        let updatedResponses: Response[]
        if (existingIndex >= 0) {
          updatedResponses = [...surveyResponses]
          updatedResponses[existingIndex] = { ...updatedResponses[existingIndex], ...newResponse }
        } else {
          updatedResponses = [...surveyResponses, newResponse]
        }

        return {
          ...prev,
          [responseKey]: updatedResponses,
        }
      })

      // Extended Learning auto-answer logic for Library, Extended Learning survey
      if (
        selectedSurvey === "Library, Extended Learning" &&
        questionKey.toLowerCase().includes("are there extended learning spaces") &&
        answerChoice.toLowerCase().includes("there are extended learning spaces") &&
        response === "No"
      ) {
        // Use setTimeout to defer this heavy operation until after the UI updates
        setTimeout(() => {
          // Find all extended learning related questions in the current survey
          const extendedLearningQuestions = Object.entries(groupedData).filter(
            ([key, questions]) =>
              key.toLowerCase().includes("extended learning") && questions.some((q) => q.survey === selectedSurvey),
          )

          if (extendedLearningQuestions.length === 0) return // No extended learning questions to auto-answer

          setResponses((prev) => {
            const newResponses = { ...prev }

            extendedLearningQuestions.forEach(([extendedQuestionKey, questions]) => {
              // Skip the original "are there extended learning spaces" question
              if (extendedQuestionKey.toLowerCase().includes("are there extended learning spaces")) {
                return
              }

              questions.forEach((question, qItemIndex) => {
                const choices = getAnswerChoices(question)
                const responseKey = `${extendedQuestionKey}-${qItemIndex}`

                // Create responses for all choices in this question
                const questionResponses: Response[] = choices.map((choice) => ({
                  questionId: responseKey,
                  answerChoice: choice,
                  response: "No",
                }))

                newResponses[responseKey] = questionResponses
              })
            })

            const totalAutoAnswered = Object.keys(newResponses).length - Object.keys(prev).length
            console.log(`Auto-answered ${totalAutoAnswered} extended learning question groups with "No"`)

            return newResponses
          })
        }, 0)
      }
    }
  }

  const handleElaboration = (questionKey: string, itemIndex: number, answerChoice: string, elaboration: string) => {
    if (isMultiEntryCategory && currentEntry) {
      const responseKey = `${questionKey}-${itemIndex}-${answerChoice}`

      setClassroomEntries((prev) => ({
        ...prev,
        [selectedSurvey]: (prev[selectedSurvey] || []).map((entry) =>
          entry.id === currentEntryId
            ? {
                ...entry,
                responses: entry.responses.map((r) => (r.questionId === responseKey ? { ...r, elaboration } : r)),
              }
            : entry,
        ),
      }))
    } else {
      setResponses((prev) => {
        const responseKey = `${questionKey}-${itemIndex}`
        const surveyResponses = prev[responseKey] || []
        const existingIndex = surveyResponses.findIndex(
          (r) => r.questionId === responseKey && r.answerChoice === answerChoice,
        )

        if (existingIndex >= 0) {
          surveyResponses[existingIndex] = { ...surveyResponses[existingIndex], elaboration }
        }

        return {
          ...prev,
          [responseKey]: surveyResponses,
        }
      })
    }
  }

  const getResponse = useCallback(
    (questionKey: string, itemIndex: number, answerChoice: string): Response | undefined => {
      if (isMultiEntryCategory && currentEntry) {
        const responseKey = `${questionKey}-${itemIndex}-${answerChoice}`
        return currentEntry.responses.find((r) => r.questionId === responseKey)
      } else {
        const responseKey = `${questionKey}-${itemIndex}`
        const surveyResponses = responses[responseKey] || []
        return surveyResponses.find((r) => r.questionId === responseKey && r.answerChoice === answerChoice)
      }
    },
    [isMultiEntryCategory, currentEntry, responses],
  )

  const getAnswerChoices = useCallback(
    (question: SurveyQuestion): string[] => {
      // Only show this question if it belongs to the current survey
      if (question.survey !== selectedSurvey) {
        return [] // Don't show questions from other surveys
      }

      // For Specialized Classrooms, filter by room type
      if (selectedSurvey === "Specialized Classrooms" && currentEntry) {
        const roomType = currentEntry.roomDetails.roomType
        const questionText = question.question.toLowerCase()
        const answerChoicesText = question.answerChoices?.toLowerCase() || ""

        // Only filter out questions that explicitly mention other room types in a restrictive way
        if (questionText.includes("science classrooms only") && roomType !== "Science Classroom") {
          return [] // Don't show this question
        }
        if (questionText.includes("music classrooms only") && roomType !== "Music Classroom") {
          return [] // Don't show this question
        }
        if (questionText.includes("art classrooms only") && roomType !== "Art Classroom") {
          return [] // Don't show this question
        }
        if (questionText.includes("cte classrooms only") && roomType !== "CTE Classroom") {
          return [] // Don't show this question
        }

        // Check answer choices for room-type restrictions as well
        if (answerChoicesText.includes("science classrooms only") && roomType !== "Science Classroom") {
          return []
        }
        if (answerChoicesText.includes("music classrooms only") && roomType !== "Music Classroom") {
          return []
        }
        if (answerChoicesText.includes("art classrooms only") && roomType !== "Art Classroom") {
          return []
        }
        if (answerChoicesText.includes("cte classrooms only") && roomType !== "CTE Classroom") {
          return []
        }
      }

      if (!question.answerChoices || question.answerChoices === "To be updated") {
        return [question.question]
      }
      return question.answerChoices
        .split(",")
        .map((choice) => choice.trim())
        .filter(Boolean)
    },
    [selectedSurvey, currentEntry],
  )

  const canProceed = (): boolean => {
    if (isMultiEntryCategory) {
      if (!currentEntry) return false

      // Check room details are filled
      const { roomNumber, gradeServed, isPortable, ceilingHeight } = currentEntry.roomDetails
      if (!roomNumber || !gradeServed || !isPortable || !ceilingHeight) return false

      // Check all visible questions are answered
      return currentQuestions.every((question, itemIndex) => {
        const choices = getAnswerChoices(question)
        // Skip questions that are filtered out (empty choices array)
        if (choices.length === 0) return true

        return choices.every((choice) => {
          const response = getResponse(currentQuestionKey, itemIndex, choice)
          return response && response.response
        })
      })
    } else {
      return currentQuestions.every((question, itemIndex) => {
        const choices = getAnswerChoices(question)
        // Skip questions that are filtered out (empty choices array)
        if (choices.length === 0) return true

        return choices.every((choice) => {
          const response = getResponse(currentQuestionKey, itemIndex, choice)
          return response && response.response
        })
      })
    }
  }

  const handleSurveyChange = (surveyName: string) => {
    setSelectedSurvey(surveyName)

    // Scroll after state update
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }, 100)

    // If it's a multi-entry category and no entries exist, create the first one
    if (MULTI_ENTRY_SURVEYS.includes(surveyName) && !(classroomEntries[surveyName]?.length > 0)) {
      setTimeout(() => createNewClassroomEntry(), 200)
    }
  }

  const handleSubmitEntry = async () => {
    if (!currentEntry) return

    try {
      // Mark current entry as completed locally
      setClassroomEntries((prev) => ({
        ...prev,
        [selectedSurvey]: (prev[selectedSurvey] || []).map((entry) =>
          entry.id === currentEntryId ? { ...entry, completed: true } : entry,
        ),
      }))

      // Save to database if we have walker info
      if (walkerInfo.name && walkerInfo.email) {
        const result = await saveAllSurveyData(
          walkerInfo,
          walkerInfo.dateWalked,
          {},
          { [selectedSurvey]: [{ ...currentEntry, completed: true }] },
          groupedData,
        )

        if (result.success) {
          alert(`${selectedSurvey} entry for Room ${currentEntry.roomDetails.roomNumber} saved successfully!`)
          // Update progress after successful save
          setTimeout(updateSurveyProgress, 100)
        } else {
          alert(`Error saving room entry: ${result.error}`)
        }
      } else {
        alert(`${selectedSurvey} entry for Room ${currentEntry.roomDetails.roomNumber} marked as completed!`)
        // Update progress after marking complete
        setTimeout(updateSurveyProgress, 100)
      }

      // Reset to show entry selection
      setCurrentClassroomEntry((prev) => ({
        ...prev,
        [selectedSurvey]: "",
      }))
    } catch (error) {
      console.error("Error submitting entry:", error)
      alert("Failed to save room entry. Please try again.")
    }
  }

  const handleSubmit = async () => {
    try {
      // Only save responses for the current selected survey
      const currentSurveyResponses: Record<string, Response[]> = {}
      const currentClassroomEntries: Record<string, ClassroomEntry[]> = {}

      if (isMultiEntryCategory) {
        // For multi-entry categories, save only the current survey's classroom entries
        if (classroomEntries[selectedSurvey] && classroomEntries[selectedSurvey].length > 0) {
          currentClassroomEntries[selectedSurvey] = classroomEntries[selectedSurvey]
        }
      } else {
        // For regular surveys, filter responses to only include the current survey
        const currentSurveyQuestions = Object.entries(groupedData).filter(([_, questions]) =>
          questions.some((q) => q.survey === selectedSurvey),
        )

        currentSurveyQuestions.forEach(([questionKey, questions]) => {
          questions.forEach((question, itemIndex) => {
            if (question.survey === selectedSurvey) {
              const responseKey = `${questionKey}-${itemIndex}`
              const surveyResponses = responses[responseKey] || []

              if (surveyResponses.length > 0) {
                if (!currentSurveyResponses[selectedSurvey]) {
                  currentSurveyResponses[selectedSurvey] = []
                }
                currentSurveyResponses[selectedSurvey].push(...surveyResponses)
              }
            }
          })
        })
      }

      console.log("Saving only current survey data:", {
        survey: selectedSurvey,
        isMultiEntry: isMultiEntryCategory,
        regularResponses: Object.keys(currentSurveyResponses),
        classroomEntries: Object.keys(currentClassroomEntries),
        responseCount: Object.values(currentSurveyResponses).flat().length,
        entryCount: Object.values(currentClassroomEntries).flat().length,
      })

      const result = await saveAllSurveyData(
        walkerInfo,
        walkerInfo.dateWalked,
        currentSurveyResponses, // Only current survey responses
        currentClassroomEntries, // Only current survey classroom entries
        groupedData,
      )

      if (result.success) {
        setCurrentSubmissionId(result.submissionId)
        alert(`${selectedSurvey} survey data saved successfully!`)
        console.log("Survey saved with ID:", result.submissionId)
        // Update progress after successful save
        setTimeout(updateSurveyProgress, 100)
      } else {
        alert(`Error saving ${selectedSurvey} survey data: ${result.error}`)
        console.error("Save error:", result.error)
      }
    } catch (error) {
      console.error("Error submitting survey:", error)
      alert(`Failed to save ${selectedSurvey} survey data. Please try again.`)
    }
  }

  const needsElaboration = (response: string, questionKey: string, answerChoice: string): boolean => {
    // Standard elaboration for these responses
    if (response === "Does Not Apply" || response === "Not Able to View") {
      return true
    }

    return false
  }

  const getSectionDescription = (surveyCategory: string, question: SurveyQuestion): string | null => {
    // Check if this is a Shared Spaces question in the specified sections
    if (surveyCategory === "Shared Spaces") {
      const category = question.Category?.toLowerCase() || ""
      const subcategory = question.Subcategory?.toLowerCase() || ""

      if (
        (category.includes("presence") && subcategory.includes("community access")) ||
        (category.includes("community") && subcategory.includes("heart of the school"))
      ) {
        return 'Heart of a school: The heart of a school building is a central gathering space that anchors the school community. Like a "living room" for the school, it supports both planned and informal interaction, fostering connection, collaboration, and shared identity. This space might take the form of a central courtyard, media center hub, multipurpose cafeteria, commons, etc.'
      }
    }

    // Check if this is a Library and Extended Learning question in the specified sections
    if (surveyCategory === "Library, Extended Learning") {
      const category = question.Category?.toLowerCase() || ""
      const subcategory = question.Subcategory?.toLowerCase() || ""

      if (
        category.includes("extended learning") &&
        (subcategory.includes("quality") ||
          subcategory.includes("space infrastructure") ||
          subcategory.includes("technology and presentation") ||
          subcategory.includes("windows and transparency"))
      ) {
        return "Extended Learning Spaces: These spaces are informal, flexible areas located outside the classroom and throughout the campus. These are not enclosed rooms but rather gathering spots for 4–10 students to engage in small-group activities or work independently. Examples range from a picnic table in a niche outside a classroom to a larger space off a corridor with varied seating, whiteboards, and other learning tools."
      }
    }

    // Check if this is an Assembly Spaces question in the specified section
    if (surveyCategory === "Assembly Spaces") {
      const category = question.Category?.toLowerCase() || ""
      const subcategory = question.Subcategory?.toLowerCase() || ""

      if (category.includes("assembly") && subcategory.includes("adjacencies")) {
        return 'Heart of a school: The heart of a school building is a central gathering space that anchors the school community. Like a "living room" for the school, it supports both planned and informal interaction, fostering connection, collaboration, and shared identity. This space might take the form of a central courtyard, media center hub, multipurpose cafeteria, commons, etc.'
      }
    }

    return null
  }

  const canCompleteRoomDetails = (): boolean => {
    if (!currentEntry) return false
    const { roomNumber, gradeServed, isPortable, ceilingHeight, roomType, modeOfInstruction } = currentEntry.roomDetails

    // For Specialized Classrooms, also require room type
    if (selectedSurvey === "Specialized Classrooms") {
      return !!(roomNumber && gradeServed && isPortable && ceilingHeight && roomType && modeOfInstruction)
    }

    // For all classroom categories, require prominent mode of instruction
    return !!(roomNumber && gradeServed && isPortable && ceilingHeight && modeOfInstruction)
  }

  const isCurrentSurveyComplete = (): boolean => {
    if (!selectedSurvey) return false

    // Get all question keys for the current survey
    const currentSurveyQuestions = Object.entries(groupedData).filter(([_, questions]) =>
      questions.some((q) => q.survey === selectedSurvey),
    )

    if (isMultiEntryCategory) {
      // For multi-entry categories, check if at least one entry is completed
      const entries = classroomEntries[selectedSurvey] || []
      return entries.some((entry) => entry.completed)
    } else {
      // For regular surveys, check if all questions are answered
      return currentSurveyQuestions.every(([questionKey, questions]) => {
        return questions.every((question, itemIndex) => {
          const choices = getAnswerChoices(question)
          return choices.every((choice) => {
            const response = getResponse(questionKey, itemIndex, choice)
            return response && response.response
          })
        })
      })
    }
  }

  const getCurrentSurveyProgress = (): { completed: number; total: number } => {
    if (!selectedSurvey) return { completed: 0, total: 0 }

    const currentSurveyQuestions = Object.entries(groupedData).filter(([_, questions]) =>
      questions.some((q) => q.survey === selectedSurvey),
    )

    if (isMultiEntryCategory) {
      const entries = classroomEntries[selectedSurvey] || []
      return {
        completed: entries.filter((entry) => entry.completed).length,
        total: Math.max(entries.length, 1), // At least show 1 as total
      }
    } else {
      let completed = 0
      let total = 0

      currentSurveyQuestions.forEach(([questionKey, questions]) => {
        questions.forEach((question, itemIndex) => {
          const choices = getAnswerChoices(question)
          choices.forEach((choice) => {
            total++
            const response = getResponse(questionKey, itemIndex, choice)
            if (response && response.response) {
              completed++
            }
          })
        })
      })

      return { completed, total }
    }
  }

  const getAllItemsProgress = (): { completed: number; total: number } => {
    if (!selectedSurvey) return { completed: 0, total: 0 }

    const currentSurveyQuestions = Object.entries(groupedData).filter(([_, questions]) =>
      questions.some((q) => q.survey === selectedSurvey),
    )

    let completed = 0
    let total = 0

    if (isMultiEntryCategory && currentEntry) {
      // For multi-entry categories, count all items in the current entry
      currentSurveyQuestions.forEach(([questionKey, questions]) => {
        questions.forEach((question, itemIndex) => {
          const choices = getAnswerChoices(question)
          choices.forEach((choice) => {
            total++
            const response = getResponse(questionKey, itemIndex, choice)
            if (response && response.response) {
              completed++
            }
          })
        })
      })
    } else {
      // For regular surveys, count all items
      currentSurveyQuestions.forEach(([questionKey, questions]) => {
        questions.forEach((question, itemIndex) => {
          const choices = getAnswerChoices(question)
          choices.forEach((choice) => {
            total++
            const response = getResponse(questionKey, itemIndex, choice)
            if (response && response.response) {
              completed++
            }
          })
        })
      })
    }

    return { completed, total }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading survey data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!showSurvey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header with Logo */}
          <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardHeader className="text-center">
              <div className="flex justify-end">
                <div className="p-1 py-1 px-1.5 my-0 mx-0 rounded border-0 leading-5 bg-transparent">
                  <Image
                    src="/PE_Wordmark_01_White_CMYK.png"
                    alt="Perkins Eastman"
                    width={120}
                    height={30}
                    unoptimized
                    className="h-6 w-auto"
                  />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Educational Adequacy Survey</CardTitle>
              <CardDescription className="text-blue-100">
                Please provide your information before starting the survey
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Walker Information Form */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Walker Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 font-medium">
                    Walker Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={walkerInfo.name}
                      onChange={(e) => handleWalkerInfoChange("name", e.target.value)}
                      className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={walkerInfo.email}
                      onChange={(e) => handleWalkerInfoChange("email", e.target.value)}
                      className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-gray-700 font-medium">
                    Date Walked
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="date"
                      type="date"
                      value={walkerInfo.dateWalked}
                      onChange={(e) => handleWalkerInfoChange("dateWalked", e.target.value)}
                      className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school" className="text-gray-700 font-medium">
                    School
                  </Label>
                  <SchoolCombobox
                    value={walkerInfo.school}
                    onChange={(value) => handleWalkerInfoChange("school", value)}
                    placeholder="Select or type school name"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleStartSurvey}
                  disabled={!canStartSurvey()}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 text-lg shadow-lg"
                >
                  Start Survey
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

              {/* Link to Scoring Page */}
              <div className="pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3">Already completed all surveys? View your scores:</p>
                  <Link href="/scoring">
                    <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent">
                      <Calculator className="w-4 h-4 mr-2" />
                      View Survey Scores
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header with Walker Info and Logo */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardContent className="text-center">
            <div className="flex items-center flex-col gap-y-0">
              <div className="rounded p-2 py-1 px-1 my-2.5 mx-0 bg-transparent">
                <Image
                  src="/PE_Wordmark_01_White_CMYK.png"
                  alt="Perkins Eastman"
                  width={120}
                  height={30}
                  unoptimized
                  className="h-6 w-auto"
                />
              </div>
              <div className="flex flex-col items-center justify-between w-full text-sm text-white gap-2 sm:flex-row">
                <div className="my-0">
                  <span className="font-medium">{walkerInfo.name}</span> • {walkerInfo.school}
                </div>
                <div className="text-sm">{walkerInfo.dateWalked}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Survey Category Selector */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex justify-between flex-col items-start gap-y-0.5">
              <div>
                <CardTitle className="text-gray-800">Survey Categories</CardTitle>
              </div>
              <div className="text-right my-1.5 py-0">
                <div className="text-sm font-medium text-gray-800">
                  Progress: {getCompletedSurveysCount()}/{ALL_REQUIRED_SURVEYS.length} Surveys
                </div>
                <div className="w-32 mt-1">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(getCompletedSurveysCount() / ALL_REQUIRED_SURVEYS.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {surveyCategories.map((surveyName) => {
                const isCompleted = surveyProgress[surveyName] || false
                return (
                  <Button
                    key={surveyName}
                    variant={selectedSurvey === surveyName ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSurveyChange(surveyName)}
                    className={`text-xs transition-all relative ${
                      selectedSurvey === surveyName
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                        : isCompleted
                          ? "border-green-300 text-green-700 hover:bg-green-50 bg-green-50"
                          : "border-blue-200 text-blue-700 hover:bg-blue-50"
                    }`}
                  >
                    {surveyName}
                    {MULTI_ENTRY_SURVEYS.includes(surveyName) && <Building className="w-3 h-3 ml-1" />}
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </Button>
                )
              })}
            </div>

            {/* View Scores Button - Show when at least 8 surveys completed */}
            {areAllSurveysCompleted() && (
              <div className="pt-4 border-t border-gray-200">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-green-800 mb-1">
                        🎉{" "}
                        {getCompletedSurveysCount() === ALL_REQUIRED_SURVEYS.length
                          ? "All Surveys Completed!"
                          : "Almost Done!"}
                      </h3>
                      <p className="text-sm text-green-700">
                        You've completed {getCompletedSurveysCount()} out of {ALL_REQUIRED_SURVEYS.length} surveys.
                        {getCompletedSurveysCount() >= 8
                          ? " View your detailed scores now."
                          : " Complete more surveys to unlock scoring."}
                      </p>
                    </div>
                    <Link href="/scoring">
                      <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                        <Calculator className="w-4 h-4 mr-2" />
                        View Scores
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Details */}
            <div className="pt-2">
              <div className="text-xs text-gray-600">
                <span className="font-medium">Completed:</span>{" "}
                {ALL_REQUIRED_SURVEYS.filter((survey) => surveyProgress[survey]).join(", ") || "None"}
              </div>
              {getCompletedSurveysCount() < ALL_REQUIRED_SURVEYS.length && (
                <div className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">Remaining:</span>{" "}
                  {ALL_REQUIRED_SURVEYS.filter((survey) => !surveyProgress[survey]).join(", ")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Multi-Entry Management for Classrooms */}
        {isMultiEntryCategory && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-gray-800 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                {selectedSurvey} Entries
              </CardTitle>
              <CardDescription>Manage multiple {selectedSurvey.toLowerCase()} assessments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {currentEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2">
                    <Button
                      variant={currentEntryId === entry.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => selectClassroomEntry(entry.id)}
                      className={`text-xs ${
                        currentEntryId === entry.id
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                          : "border-gray-300"
                      }`}
                    >
                      Room {entry.roomDetails.roomNumber || "New"}
                      {entry.completed && <Check className="w-3 h-3 ml-1" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteClassroomEntry(entry.id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={createNewClassroomEntry}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 bg-transparent"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Room
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Room Details Form for Multi-Entry Categories */}
        {isMultiEntryCategory && currentEntry && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-gray-800">Room Details</CardTitle>
              <CardDescription>Provide details for this {selectedSurvey.toLowerCase().slice(0, -1)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Room Number</Label>
                  <Input
                    placeholder="e.g., 101"
                    value={currentEntry.roomDetails.roomNumber}
                    onChange={(e) => updateRoomDetails("roomNumber", e.target.value)}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Grade Served</Label>
                  <Input
                    placeholder="e.g., K-2, 3rd, 9-12"
                    value={currentEntry.roomDetails.gradeServed}
                    onChange={(e) => updateRoomDetails("gradeServed", e.target.value)}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                {selectedSurvey === "Specialized Classrooms" && (
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Room Type</Label>
                    <Select
                      value={currentEntry.roomDetails.roomType}
                      onValueChange={(value: string) => updateRoomDetails("roomType", value)}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOM_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Portable?</Label>
                  <Select
                    value={currentEntry.roomDetails.isPortable}
                    onValueChange={(value: "Y" | "N") => updateRoomDetails("isPortable", value)}
                  >
                    <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Y">Yes</SelectItem>
                      <SelectItem value="N">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Ceiling Height</Label>
                  <Input
                    placeholder="e.g., 9 ft"
                    value={currentEntry.roomDetails.ceilingHeight}
                    onChange={(e) => updateRoomDetails("ceilingHeight", e.target.value)}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Mode of Instruction</Label>
                  <Select
                    value={currentEntry.roomDetails.modeOfInstruction}
                    onValueChange={(value: string) => updateRoomDetails("modeOfInstruction", value)}
                  >
                    <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select instruction mode" />
                    </SelectTrigger>
                    <SelectContent className="w-44">
                      {INSTRUCTION_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!canCompleteRoomDetails() && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Please complete all room details before proceeding with the assessment questions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedSurvey === "Specialized Classrooms" && currentEntry && currentEntry.roomDetails.roomType && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Room Type Selected:</span> {currentEntry.roomDetails.roomType}
              <br />
              General specialized classroom questions will appear for all room types. Room-type-specific questions will
              be filtered based on your selection.
            </p>
          </div>
        )}

        {/* Question Navigation */}
        {selectedSurvey && (!isMultiEntryCategory || (currentEntry && canCompleteRoomDetails())) && (
          <QuestionNavigation
            surveyName={selectedSurvey}
            filteredQuestions={filteredQuestions}
            getAnswerChoices={getAnswerChoices}
            getResponse={getResponse}
            isMultiEntryCategory={isMultiEntryCategory}
            currentEntry={currentEntry}
          />
        )}

        {/* All Questions for Selected Survey */}
        {selectedSurvey && (!isMultiEntryCategory || (currentEntry && canCompleteRoomDetails())) && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">{selectedSurvey}</Badge>
                <Badge variant="outline" className="border-blue-200 text-blue-700">
                  {filteredQuestions.length} Question Groups
                </Badge>
                {isMultiEntryCategory && currentEntry && (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    Room {currentEntry.roomDetails.roomNumber}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl text-gray-800">{selectedSurvey} Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Photo Upload - One per survey category */}
              <div className="border-b border-gray-200 pb-6">
                <PhotoUpload
                  submissionId={currentSubmissionId || undefined}
                  surveyCategory={selectedSurvey}
                  roomNumber={isMultiEntryCategory && currentEntry ? currentEntry.roomDetails.roomNumber : undefined}
                  disabled={false}
                  onPhotoUploaded={(photoId) => {
                    console.log("Photo uploaded for survey:", selectedSurvey, photoId)
                  }}
                />
              </div>

              {filteredQuestions.map(([questionKey, questions], groupIndex) => {
                // Section Description - show once per survey if applicable
                const sectionDescription =
                  groupIndex === 0 && questions.length > 0 ? getSectionDescription(selectedSurvey, questions[0]) : null

                return (
                  <div
                    key={questionKey}
                    id={generateQuestionId(questionKey)}
                    className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm scroll-mt-6"
                  >
                    {/* Section Description */}
                    {sectionDescription && (
                      <div className="mb-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div>
                              <h4 className="font-semibold text-blue-900 mb-2">Section Information</h4>
                              <p className="text-sm text-blue-800 leading-relaxed">{sectionDescription}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <h2 className="text-md font-medium text-black-700">{questionKey}</h2>
                    </div>

                    <div className="space-y-6">
                      {questions
                        .map((question, itemIndex) => {
                          const answerChoices = getAnswerChoices(question)

                          // Skip this question if it's filtered out
                          if (answerChoices.length === 0) {
                            return null
                          }

                          return (
                            <div key={itemIndex} className="border-b border-gray-100 pb-6 last:border-b-0">
                              <div className="mb-4">
                                {question.Category && (
                                  <div className="text-sm text-gray-600 mb-3">
                                    <span className="font-medium">Category:</span> {question.Category}
                                    {question.Subcategory && (
                                      <span className="ml-2">
                                        <span className="font-medium">Subcategory:</span> {question.Subcategory}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4">
                                {answerChoices.map((choice, choiceIndex) => {
                                  const currentResponse = getResponse(questionKey, itemIndex, choice)

                                  return (
                                    <div key={choiceIndex} className="space-y-3">
                                      <div className="font-medium text-sm bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border-l-4 border-blue-500">
                                        {choice}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {RESPONSE_OPTIONS.map((option) => {
                                          const isSelected = currentResponse?.response === option

                                          let buttonClass = "text-xs h-auto py-2 px-3 transition-all duration-200"
                                          if (isSelected) {
                                            if (option === "Yes")
                                              buttonClass += " bg-green-600 hover:bg-green-700 text-white shadow-md"
                                            else if (option === "No")
                                              buttonClass += " bg-red-600 hover:bg-red-700 text-white shadow-md"
                                            else if (option === "Does Not Apply")
                                              buttonClass += " bg-yellow-600 hover:bg-yellow-700 text-white shadow-md"
                                            else buttonClass += " bg-gray-600 hover:bg-gray-700 text-white shadow-md"
                                          } else {
                                            if (option === "Yes")
                                              buttonClass += " border-green-300 text-green-700 hover:bg-green-50"
                                            else if (option === "No")
                                              buttonClass += " border-red-300 text-red-700 hover:bg-red-50"
                                            else if (option === "Does Not Apply")
                                              buttonClass += " border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                                            else buttonClass += " border-gray-300 text-gray-700 hover:bg-gray-50"
                                          }

                                          return (
                                            <Button
                                              key={option}
                                              variant={isSelected ? "default" : "outline"}
                                              size="sm"
                                              onClick={() => handleResponse(questionKey, itemIndex, choice, option)}
                                              className={buttonClass}
                                            >
                                              {isSelected && <Check className="w-3 h-3 mr-1" />}
                                              {option}
                                            </Button>
                                          )
                                        })}
                                      </div>

                                      {/* Elaboration box */}
                                      {currentResponse &&
                                        needsElaboration(currentResponse.response, questionKey, choice) && (
                                          <div className="mt-3 space-y-2">
                                            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                              <MessageSquare className="w-4 h-4" />
                                              {currentResponse.response === "Yes" &&
                                              questionKey === "The building is unclean throughout"
                                                ? "Please describe the cleanliness issues:"
                                                : "Please elaborate:"}
                                            </Label>
                                            <Textarea
                                              placeholder={
                                                currentResponse.response === "Yes" &&
                                                questionKey === "The building is unclean throughout"
                                                  ? "Describe specific areas or types of cleanliness issues observed..."
                                                  : "Provide additional details or explanation..."
                                              }
                                              value={currentResponse.elaboration || ""}
                                              onChange={(e) =>
                                                handleElaboration(questionKey, itemIndex, choice, e.target.value)
                                              }
                                              className="min-h-[80px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                            />
                                          </div>
                                        )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })
                        .filter(Boolean)}
                    </div>
                  </div>
                )
              })}

              {/* Submit Button for Multi-Entry Categories */}
              {isMultiEntryCategory && currentEntry && canCompleteRoomDetails() && (
                <div className="pt-6 border-t border-gray-200 space-y-4">
                  {/* Progress Note */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <div className="text-sm">
                        <p className="font-medium text-blue-900 mb-1">
                          Progress: {getAllItemsProgress().completed} of {getAllItemsProgress().total} items completed
                        </p>
                        <p className="text-blue-800">
                          All items must be completed before you can submit this room assessment.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmitEntry}
                    disabled={!canProceed()}
                    className={`w-full font-medium py-3 text-lg shadow-lg ${
                      canProceed()
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {canProceed() ? (
                      <>
                        Complete Room {currentEntry.roomDetails.roomNumber} Assessment
                        <Check className="w-5 h-5 ml-2" />
                      </>
                    ) : (
                      <>
                        Complete All Items to Submit
                        <div className="w-5 h-5 ml-2 border-2 border-gray-400 rounded-full"></div>
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Final Submit Button */}
              {!isMultiEntryCategory && (
                <div className="pt-6 border-t border-gray-200 space-y-4">
                  {/* Progress Note */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <div className="text-sm">
                        <p className="font-medium text-blue-900 mb-1">
                          Progress: {getAllItemsProgress().completed} of {getAllItemsProgress().total} items completed
                        </p>
                        <p className="text-blue-800">All items must be completed before you can submit this survey.</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={getAllItemsProgress().completed !== getAllItemsProgress().total}
                    className={`w-full font-medium py-3 text-lg shadow-lg ${
                      getAllItemsProgress().completed === getAllItemsProgress().total
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {getAllItemsProgress().completed === getAllItemsProgress().total ? (
                      <>
                        Save Survey Data
                        <Check className="w-5 h-5 ml-2" />
                      </>
                    ) : (
                      <>
                        Complete All Items to Submit
                        <div className="w-5 h-5 ml-2 border-2 border-gray-400 rounded-full"></div>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Overall Progress for Multi-Entry Categories */}
        {isMultiEntryCategory && currentEntries.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {selectedSurvey} Progress: {currentEntries.filter((entry) => entry.completed).length} of{" "}
                    {currentEntries.length} rooms completed
                  </p>
                </div>
                <Button
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  Save All Data
                  <Check className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
