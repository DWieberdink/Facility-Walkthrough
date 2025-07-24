"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getSurveySubmissions } from "../../lib/database"
import { Calendar, User, School, Building, FileText, Download, Check } from "lucide-react"
import { PhotoGallery } from "../../components/photo-gallery"

interface SurveySubmission {
  id: string
  date_walked: string
  submitted_at: string
  walkers: {
    name: string
    email: string
    school: string
  }
  survey_responses: Array<{
    survey_category: string
    question_key: string
    response: string
    elaboration?: string
  }>
  classroom_entries: Array<{
    survey_category: string
    room_number: string
    grade_served: string
    is_portable: boolean
    ceiling_height: string
    completed: boolean
    classroom_responses: Array<{
      question_key: string
      response: string
      elaboration?: string
    }>
  }>
}

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<SurveySubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSubmissions()
  }, [])

  const loadSubmissions = async () => {
    try {
      setLoading(true)
      const data = await getSurveySubmissions()
      setSubmissions(data as SurveySubmission[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submissions")
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = (submission: SurveySubmission) => {
    const csvData = []

    // Add header
    csvData.push([
      "Submission ID",
      "Walker Name",
      "Walker Email",
      "School",
      "Date Walked",
      "Survey Category",
      "Room Number",
      "Grade Served",
      "Is Portable",
      "Ceiling Height",
      "Question",
      "Response",
      "Elaboration",
    ])

    // Add regular survey responses
    submission.survey_responses.forEach((response) => {
      csvData.push([
        submission.id,
        submission.walkers.name,
        submission.walkers.email,
        submission.walkers.school,
        submission.date_walked,
        response.survey_category,
        "",
        "",
        "",
        "",
        response.question_key,
        response.response,
        response.elaboration || "",
      ])
    })

    // Add classroom responses
    submission.classroom_entries.forEach((entry) => {
      entry.classroom_responses.forEach((response) => {
        csvData.push([
          submission.id,
          submission.walkers.name,
          submission.walkers.email,
          submission.walkers.school,
          submission.date_walked,
          entry.survey_category,
          entry.room_number,
          entry.grade_served,
          entry.is_portable ? "Yes" : "No",
          entry.ceiling_height,
          response.question_key,
          response.response,
          response.elaboration || "",
        ])
      })
    })

    // Convert to CSV string
    const csvString = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    // Download file
    const blob = new Blob([csvString], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `survey-${submission.id}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading survey submissions...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <Card className="shadow-lg border-red-200">
            <CardContent className="p-6">
              <div className="text-center text-red-600">
                <p className="text-lg font-semibold mb-2">Error Loading Data</p>
                <p>{error}</p>
                <Button onClick={loadSubmissions} className="mt-4">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Survey Administration</CardTitle>
            <CardDescription className="text-blue-100">View and manage survey submissions</CardDescription>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-800">{submissions.length}</p>
                  <p className="text-sm text-gray-600">Total Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {submissions.reduce((acc, sub) => acc + sub.classroom_entries.length, 0)}
                  </p>
                  <p className="text-sm text-gray-600">Classroom Assessments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <School className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {new Set(submissions.map((sub) => sub.walkers.school)).size}
                  </p>
                  <p className="text-sm text-gray-600">Schools</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      {submission.walkers.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <School className="w-4 h-4" />
                        {submission.walkers.school}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(submission.date_walked).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  <Button onClick={() => exportToCSV(submission)} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-1" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Regular Survey Categories */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Survey Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(submission.survey_responses.map((r) => r.survey_category))).map(
                        (category) => (
                          <Badge key={category} variant="outline" className="border-blue-200 text-blue-700">
                            {category}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Classroom Entries */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Classroom Assessments</h4>
                    <div className="space-y-1">
                      {submission.classroom_entries.map((entry, index) => (
                        <div key={index} className="text-sm text-gray-600 flex items-center gap-2">
                          <Building className="w-3 h-3" />
                          <span>
                            {entry.survey_category} - Room {entry.room_number}
                          </span>
                          {entry.completed && <Check className="w-3 h-3 text-green-600" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Submitted: {new Date(submission.submitted_at).toLocaleString()}</span>
                    <span>ID: {submission.id.slice(0, 8)}...</span>
                  </div>
                </div>
                {/* Add this after the existing content in each submission card */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <PhotoGallery submissionId={submission.id} canDelete={true} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {submissions.length === 0 && (
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No survey submissions found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
