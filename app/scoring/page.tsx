"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calculator,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  User,
  Building,
  Calendar,
  FileText,
  BarChart3,
  ChevronLeft,
} from "lucide-react"
import { getAllSubmissions, calculateSubmissionScores, type OverallScore } from "../../lib/scoring"
import Image from "next/image"
import Link from "next/link"

interface SubmissionWithScore {
  id: string
  created_at: string
  walkers: {
    name: string
    email: string
    school: string
  }
  scores?: OverallScore
  isCalculating?: boolean
}

export default function ScoringPage() {
  const [submissions, setSubmissions] = useState<SubmissionWithScore[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<SubmissionWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSchool, setSelectedSchool] = useState<string>("all")
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set())
  const [calculatedScores, setCalculatedScores] = useState<Record<string, OverallScore>>({})

  useEffect(() => {
    loadSubmissions()
  }, [])

  useEffect(() => {
    filterSubmissions()
  }, [submissions, searchTerm, selectedSchool])

  const loadSubmissions = async () => {
    try {
      setLoading(true)
      const data = await getAllSubmissions()
      setSubmissions(data)
    } catch (error) {
      console.error("Error loading submissions:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterSubmissions = () => {
    let filtered = submissions

    // Filter by search term (name, email, or school)
    if (searchTerm) {
      filtered = filtered.filter(
        (submission) =>
          submission.walkers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          submission.walkers?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          submission.walkers?.school?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by school
    if (selectedSchool !== "all") {
      filtered = filtered.filter((submission) => submission.walkers?.school === selectedSchool)
    }

    setFilteredSubmissions(filtered)
  }

  const calculateScores = async (submissionId: string) => {
    try {
      // Mark as calculating
      setSubmissions((prev) => prev.map((sub) => (sub.id === submissionId ? { ...sub, isCalculating: true } : sub)))

      const scores = await calculateSubmissionScores(submissionId)

      // Store calculated scores
      setCalculatedScores((prev) => ({
        ...prev,
        [submissionId]: scores,
      }))

      // Update submission with scores
      setSubmissions((prev) =>
        prev.map((sub) => (sub.id === submissionId ? { ...sub, scores, isCalculating: false } : sub)),
      )
    } catch (error) {
      console.error("Error calculating scores:", error)
      // Remove calculating state on error
      setSubmissions((prev) => prev.map((sub) => (sub.id === submissionId ? { ...sub, isCalculating: false } : sub)))
    }
  }

  const toggleExpanded = (submissionId: string) => {
    const newExpanded = new Set(expandedSubmissions)
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId)
    } else {
      newExpanded.add(submissionId)
      // Calculate scores when expanding if not already calculated
      if (!calculatedScores[submissionId]) {
        calculateScores(submissionId)
      }
    }
    setExpandedSubmissions(newExpanded)
  }

  const exportScores = (submission: SubmissionWithScore, scores: OverallScore) => {
    const csvData = [
      ["Survey Category", "Category", "Subcategory", "Score", "Max Score", "Percentage"],
      ...scores.surveyScores.flatMap((survey) =>
        survey.categories.map((category) => [
          survey.surveyCategory,
          category.category,
          category.subcategory,
          category.totalScore.toFixed(2),
          category.maxPossibleScore.toFixed(2),
          category.percentage.toFixed(1) + "%",
        ]),
      ),
      [],
      [
        "Overall Score",
        "",
        "",
        scores.totalScore.toFixed(2),
        scores.maxPossibleScore.toFixed(2),
        scores.percentage.toFixed(1) + "%",
      ],
    ]

    const csvContent = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `scores-${submission.walkers?.name?.replace(/\s+/g, "-")}-${submission.walkers?.school?.replace(/\s+/g, "-")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAllScores = () => {
    const submissionsWithScores = filteredSubmissions.filter((sub) => sub.scores)

    if (submissionsWithScores.length === 0) {
      alert("No calculated scores to export. Please calculate scores first.")
      return
    }

    const csvData = [
      [
        "Walker Name",
        "Email",
        "School",
        "Date",
        "Survey Category",
        "Category",
        "Subcategory",
        "Score",
        "Max Score",
        "Percentage",
      ],
      ...submissionsWithScores.flatMap((submission) =>
        submission.scores!.surveyScores.flatMap((survey) =>
          survey.categories.map((category) => [
            submission.walkers?.name || "",
            submission.walkers?.email || "",
            submission.walkers?.school || "",
            new Date(submission.created_at).toLocaleDateString(),
            survey.surveyCategory,
            category.category,
            category.subcategory,
            category.totalScore.toFixed(2),
            category.maxPossibleScore.toFixed(2),
            category.percentage.toFixed(1) + "%",
          ]),
        ),
      ),
    ]

    const csvContent = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `all-survey-scores-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getUniqueSchools = () => {
    const schools = submissions
      .map((sub) => sub.walkers?.school)
      .filter(Boolean)
      .filter((school, index, arr) => arr.indexOf(school) === index)
    return schools.sort()
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadgeColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-100 text-green-800"
    if (percentage >= 60) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading submissions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardHeader className="text-center relative">
            {/* Back to Survey Button - Top Left */}
            <div className="absolute top-4 left-4">
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back to Survey
                </Button>
              </Link>
            </div>

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
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Survey Scores Dashboard
            </CardTitle>
            <CardDescription className="text-blue-100">
              View and analyze educational adequacy survey results from all walkers
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Submissions</p>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Calculated Scores</p>
                  <p className="text-2xl font-bold">{Object.keys(calculatedScores).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Schools</p>
                  <p className="text-2xl font-bold">{getUniqueSchools().length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold">
                    {Object.values(calculatedScores).length > 0
                      ? (
                          Object.values(calculatedScores).reduce((sum, score) => sum + score.percentage, 0) /
                          Object.values(calculatedScores).length
                        ).toFixed(1) + "%"
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-gray-800">Filters & Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or school..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Filter by school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {getUniqueSchools().map((school) => (
                    <SelectItem key={school} value={school}>
                      {school}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={exportAllScores} className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Export All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submissions List */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-gray-800">Survey Submissions</CardTitle>
            <CardDescription>Click on a submission to calculate and view detailed scores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No submissions found matching your criteria.</p>
              </div>
            ) : (
              filteredSubmissions.map((submission) => {
                const isExpanded = expandedSubmissions.has(submission.id)
                const scores = calculatedScores[submission.id]

                return (
                  <div key={submission.id} className="border border-gray-200 rounded-lg">
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleExpanded(submission.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                            <User className="w-5 h-5 text-blue-600" />
                          </div>

                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {submission.walkers?.name || "Unknown Walker"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {submission.walkers?.email} • {submission.walkers?.school}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(submission.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {submission.isCalculating && (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="text-sm text-gray-600">Calculating...</span>
                            </div>
                          )}

                          {scores && (
                            <Badge className={getScoreBadgeColor(scores.percentage)}>
                              {scores.percentage.toFixed(1)}% Overall
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        {submission.isCalculating ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">Calculating scores...</p>
                          </div>
                        ) : scores ? (
                          <div className="space-y-4">
                            {/* Overall Score */}
                            <div className="bg-white p-4 rounded-lg border">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">Overall Score</h4>
                                <Button onClick={() => exportScores(submission, scores)} size="sm" variant="outline">
                                  <Download className="w-3 h-3 mr-1" />
                                  Export
                                </Button>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <Progress value={scores.percentage} className="h-3" />
                                </div>
                                <div className="text-right">
                                  <p className={`text-lg font-bold ${getScoreColor(scores.percentage)}`}>
                                    {scores.percentage.toFixed(1)}%
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {scores.totalScore.toFixed(1)} / {scores.maxPossibleScore.toFixed(1)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Survey Category Scores */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {scores.surveyScores.map((survey) => (
                                <div key={survey.surveyCategory} className="bg-white p-4 rounded-lg border">
                                  <h5 className="font-medium text-gray-900 mb-3">{survey.surveyCategory}</h5>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">Overall</span>
                                      <span className={`text-sm font-medium ${getScoreColor(survey.percentage)}`}>
                                        {survey.percentage.toFixed(1)}%
                                      </span>
                                    </div>
                                    <Progress value={survey.percentage} className="h-2" />

                                    {/* Category breakdown */}
                                    <div className="mt-3 space-y-1">
                                      {survey.categories.slice(0, 3).map((category) => (
                                        <div
                                          key={`${category.category}-${category.subcategory}`}
                                          className="flex justify-between text-xs"
                                        >
                                          <span className="text-gray-500 truncate">{category.subcategory}</span>
                                          <span className={getScoreColor(category.percentage)}>
                                            {category.percentage.toFixed(1)}%
                                          </span>
                                        </div>
                                      ))}
                                      {survey.categories.length > 3 && (
                                        <div className="text-xs text-gray-400">
                                          +{survey.categories.length - 3} more categories
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-600 mb-2">Scores not calculated yet</p>
                            <Button onClick={() => calculateScores(submission.id)} size="sm">
                              <Calculator className="w-3 h-3 mr-1" />
                              Calculate Scores
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
