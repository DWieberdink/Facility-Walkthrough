"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ChevronRight, Check, User, Mail, Calendar, Plus, Trash2, Building, Calculator, Camera, LogOut } from "lucide-react"
import { saveAllSurveyData } from "../lib/database"
import { SchoolCombobox } from "../components/school-combobox"
import Image from "next/image"
import { QuestionNavigation } from "../components/question-navigation"
import { generateQuestionId } from "../lib/utils"
import Link from "next/link"
import { sessionUtils, type UserSession } from "../lib/session"
import dynamic from "next/dynamic"

// Dynamic imports for heavy components
const PhotoUpload = dynamic(() => import("../components/photo-upload").then(mod => ({ default: mod.PhotoUpload })), {
  loading: () => <div className="flex items-center justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
  ssr: false
})

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
  isPortable: "Y" | "N"
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
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  // Add progress tracking state
  const [surveyProgress, setSurveyProgress] = useState<Record<string, boolean>>({})

  // Define simplified survey categories
  const ALL_REQUIRED_SURVEYS = [
    "Photo Documentation",
  ]

  // Simplified survey completion logic
  const isSurveyCompleted = (surveyName: string): boolean => {
    // For photo documentation, consider it always complete
    return true
  }

  // Function to update survey progress
  const updateSurveyProgress = () => {
    const newProgress: Record<string, boolean> = {}
    ALL_REQUIRED_SURVEYS.forEach((surveyName) => {
      newProgress[surveyName] = isSurveyCompleted(surveyName)
    })
    setSurveyProgress(newProgress)

  }

  // Get completed surveys count
  const getCompletedSurveysCount = (): number => {
    return Object.values(surveyProgress).filter(Boolean).length
  }

  // Check if all surveys are completed - Simplified
  const areAllSurveysCompleted = (): boolean => {
    return true // Always allow access since we only have photo documentation
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

  const createSubmissionForSession = async (session: any) => {
    try {
      const walkerInfoForSubmission = {
        name: session.name,
        email: "",
        dateWalked: new Date().toISOString().split("T")[0],
        school: "",
      }
      
      const result = await saveAllSurveyData(
        walkerInfoForSubmission,
        walkerInfoForSubmission.dateWalked,
        {}, // empty responses initially
        {}, // empty classroom entries initially
        groupedData,
      )

      if (result.success) {
        setCurrentSubmissionId(result.submissionId)
        console.log("Created submission for restored session:", result.submissionId)
      } else {
        console.error("Failed to create submission for restored session:", result.error)
      }
    } catch (error) {
      console.error("Error creating submission for restored session:", error)
    }
  }

  const handleLogout = () => {
    sessionUtils.clearSession()
    setIsLoggedIn(false)
    setShowSurvey(false)
    setWalkerInfo({
      name: "",
      email: "",
      dateWalked: new Date().toISOString().split("T")[0],
      school: "",
    })
    setCurrentSubmissionId(null)
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
    
    // Check for existing session
    const session = sessionUtils.getSession()
    if (session) {
      setWalkerInfo({
        name: session.name,
        email: "",
        dateWalked: new Date().toISOString().split("T")[0], // Always use current date
        school: "",
      })
      setIsLoggedIn(true)
      setShowSurvey(true)
      
      // Create a new submission for the restored session
      createSubmissionForSession(session)
    }
    setSessionChecked(true)
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
    // Skip fetching survey data - we don't need questions
    setLoading(false)
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
    return walkerInfo.name.trim() !== ""
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
          
          // Save session
          sessionUtils.saveSession({
            name: walkerInfo.name,
            email: "",
            dateWalked: walkerInfo.dateWalked,
            school: "",
          })
          
          setShowSurvey(true)
          setIsLoggedIn(true)
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
        isPortable: "N",
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

  if (loading || !sessionChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading survey data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!showSurvey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header with Logo */}
          <Card className="shadow-lg border-0 bg-gradient-to-r from-orange-600 to-orange-700 text-white" style={{ background: 'linear-gradient(to right, #FF530D, #E64A0C)' }}>
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
              <CardTitle className="text-2xl font-bold">Facilities Assessment</CardTitle>

            </CardHeader>
          </Card>

          {/* Walker Information Form */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5 text-orange-600" />
                Walker Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    className="pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleStartSurvey}
                  disabled={!canStartSurvey()}
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-medium py-3 text-lg shadow-lg"
                  style={{ background: 'linear-gradient(to right, #FF530D, #E64A0C)' }}
                >
                                        Start Walk
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>


            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header with Walker Info and Logo */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-orange-600 to-orange-700 text-white" style={{ background: 'linear-gradient(to right, #FF530D, #E64A0C)' }}>
          <CardContent className="text-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-col gap-y-0 flex-1">
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
                  <span className="font-medium">{walkerInfo.name}</span>
                </div>
                <div className="text-sm">{walkerInfo.dateWalked}</div>
              </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-white border-white hover:bg-white hover:text-orange-600 bg-transparent font-medium"
                style={{ backgroundColor: 'transparent' }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Photo Documentation Section */}
        <Card className="shadow-lg border-0">
          <CardHeader>
                          <CardTitle className="text-gray-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-orange-600" />
                Photo Documentation
              </CardTitle>
            <CardDescription>
              Take photos and place them on the floorplan to document your walkthrough
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo Upload Component */}
            <PhotoUpload
              submissionId={currentSubmissionId || undefined}
              surveyCategory="Photo Documentation"
              disabled={false}
              onPhotoUploaded={(photoId) => {
                console.log("Photo uploaded:", photoId)
              }}
            />

            {/* Instructions */}
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="text-sm text-orange-800">
                  <p className="font-medium mb-2">How to use Photo Documentation:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Click "Take Photo" to use your device camera</li>
                    <li>• Click "Choose from Gallery" to upload existing photos</li>
                    <li>• Add an optional caption to describe what the photo shows</li>
                    <li>• After uploading, you'll be prompted to place the photo on the floorplan</li>
                    <li>• Select the floor (First or Second) and click where the photo was taken</li>
                    <li>• Photos are automatically saved with their location coordinates</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* View Photo Gallery Button */}
            <div className="text-center pt-4">
              <Link href="/scoring">
                <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 bg-transparent">
                  <Camera className="w-4 h-4 mr-2" />
                  View Photo Gallery
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  )
}
