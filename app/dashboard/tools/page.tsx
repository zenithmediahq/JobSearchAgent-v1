'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { SavedJob } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, FileEdit, MessageSquare, Copy, CheckCircle2, Sparkles } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ToolsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">AI Tools</h1>
        <p className="mt-1 text-muted-foreground">
          AI-powered helpers for your job search
        </p>
      </div>

      <Tabs defaultValue="tailor" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tailor" className="gap-2">
            <FileEdit className="h-4 w-4" />
            CV Tailoring
          </TabsTrigger>
          <TabsTrigger value="interview" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Interview Prep
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tailor">
          <CVTailoringTool />
        </TabsContent>

        <TabsContent value="interview">
          <InterviewPrepTool />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CVTailoringTool() {
  const { data: savedJobsData } = useSWR('/api/saved-jobs', fetcher)
  const { data: profileData } = useSWR('/api/profile', fetcher)
  
  const [selectedJobId, setSelectedJobId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const savedJobs: SavedJob[] = savedJobsData?.data || []
  const cvText = profileData?.data?.cv_text || ''
  const hasCV = !!cvText

  const handleTailor = async () => {
    if (!selectedJobId) return
    
    const job = savedJobs.find((j) => j.job_id === selectedJobId)
    if (!job) return

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/tailor-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          jobDescription: job.summary,
          cv: cvText,
        }),
      })

      if (!res.ok) throw new Error('Failed to tailor CV')

      const data = await res.json()
      setResult(data.tailoredCV)
    } catch {
      setResult('Failed to generate tailored CV. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Tailor Your CV
          </CardTitle>
          <CardDescription>
            Get AI suggestions to customize your CV for a specific job
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasCV ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Add your CV in the Profile section first to use this feature.
              </p>
              <Button className="mt-4" asChild>
                <a href="/dashboard/profile">Go to Profile</a>
              </Button>
            </div>
          ) : savedJobs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Save some jobs first to tailor your CV for them.
              </p>
              <Button className="mt-4" asChild>
                <a href="/dashboard">Search Jobs</a>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select a job to tailor for</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a saved job" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedJobs.map((job) => (
                      <SelectItem key={job.job_id} value={job.job_id}>
                        {job.title} at {job.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleTailor}
                disabled={!selectedJobId || loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Tailored CV
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Tailored CV Suggestions</CardTitle>
            {result && (
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : result ? (
            <div className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
              {result}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Select a job and click generate to see tailored suggestions
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InterviewPrepTool() {
  const { data: savedJobsData } = useSWR('/api/saved-jobs', fetcher)
  const { data: profileData } = useSWR('/api/profile', fetcher)
  
  const [selectedJobId, setSelectedJobId] = useState('')
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<string[] | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)

  const savedJobs: SavedJob[] = savedJobsData?.data || []
  const cvText = profileData?.data?.cv_text || ''

  const handleGenerateQuestions = async () => {
    if (!selectedJobId) return
    
    const job = savedJobs.find((j) => j.job_id === selectedJobId)
    if (!job) return

    setLoading(true)
    setQuestions(null)
    setSelectedQuestion(null)
    setFeedback(null)

    try {
      const res = await fetch('/api/interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          jobDescription: job.summary,
          cv: cvText,
        }),
      })

      if (!res.ok) throw new Error('Failed to generate questions')

      const data = await res.json()
      setQuestions(data.questions)
    } catch {
      setQuestions(['Failed to generate questions. Please try again.'])
    } finally {
      setLoading(false)
    }
  }

  const handleGetFeedback = async () => {
    if (!selectedQuestion || !userAnswer.trim()) return

    setFeedbackLoading(true)
    setFeedback(null)

    try {
      const job = savedJobs.find((j) => j.job_id === selectedJobId)
      
      const res = await fetch('/api/interview-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: selectedQuestion,
          userAnswer,
          jobContext: job ? `${job.title} at ${job.company}` : 'Selected job',
        }),
      })

      if (!res.ok) throw new Error('Failed to get feedback')

      const data = await res.json()
      setFeedback(data.feedback)
    } catch {
      setFeedback('Failed to get feedback. Please try again.')
    } finally {
      setFeedbackLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Interview Practice
          </CardTitle>
          <CardDescription>
            Practice interview questions for your target jobs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {savedJobs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Save some jobs first to practice interviews.
              </p>
              <Button className="mt-4" asChild>
                <a href="/dashboard">Search Jobs</a>
              </Button>
            </div>
          ) : !cvText ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Add your CV in the Profile section first to generate tailored interview questions.
              </p>
              <Button className="mt-4" asChild>
                <a href="/dashboard/profile">Go to Profile</a>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select a job to practice for</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a saved job" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedJobs.map((job) => (
                      <SelectItem key={job.job_id} value={job.job_id}>
                        {job.title} at {job.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerateQuestions}
                disabled={!selectedJobId || loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Interview Questions
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Practice Questions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : questions ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedQuestion(q)
                      setFeedback(null)
                      setUserAnswer('')
                    }}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                      selectedQuestion === q
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="font-medium text-muted-foreground">Q{i + 1}:</span>{' '}
                    {q}
                  </button>
                ))}
              </div>

              {selectedQuestion && (
                <div className="space-y-3 border-t pt-4">
                  <Label>Your Answer</Label>
                  <Textarea
                    placeholder="Type your answer here..."
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <Button
                    onClick={handleGetFeedback}
                    disabled={!userAnswer.trim() || feedbackLoading}
                    className="w-full"
                  >
                    {feedbackLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Get AI Feedback
                  </Button>

                  {feedback && (
                    <div className="rounded-lg bg-muted p-4 text-sm">
                      <p className="mb-2 font-medium">Feedback:</p>
                      <p className="whitespace-pre-wrap text-muted-foreground">{feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Select a job and generate questions to start practicing
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
