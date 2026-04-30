'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, Save, FileText, CheckCircle2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ProfilePage() {
  const { data, mutate, isLoading } = useSWR('/api/profile', fetcher)
  const [cvText, setCvText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data?.data?.cv_text) {
      setCvText(data.data.cv_text)
    }
  }, [data])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_text: cvText }),
      })
      mutate()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">CV Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Add your CV to get personalized job match analysis
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Your CV / Resume
              </CardTitle>
              <CardDescription>
                Paste your CV text below. This will be used to analyze how well you match job postings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cv">CV Content</Label>
                    <Textarea
                      id="cv"
                      placeholder="Paste your CV content here...

Example:
John Doe
Software Engineer

Experience:
- Senior Software Engineer at TechCorp (2020-Present)
  - Led development of microservices architecture
  - Mentored junior developers
  
Skills:
- JavaScript, TypeScript, React, Node.js
- Python, Django
- AWS, Docker, Kubernetes

Education:
- BS Computer Science, University Name"
                      value={cvText}
                      onChange={(e) => setCvText(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={handleSave} disabled={saving || !cvText.trim()}>
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : saved ? (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {saved ? 'Saved!' : 'Save CV'}
                    </Button>
                    {saved && (
                      <span className="text-sm text-emerald-600">
                        Your CV has been saved successfully.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  1
                </span>
                <p>Paste your CV or resume text in the editor</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  2
                </span>
                <p>Search for jobs in the Job Search section</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  3
                </span>
                <p>Click &quot;Analyze Match&quot; on any job to see how well you fit</p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  4
                </span>
                <p>Get personalized tips to improve your application</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips for Better Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Include your complete work experience with dates</p>
              <p>List all relevant technical skills</p>
              <p>Add certifications and education</p>
              <p>Include key achievements with metrics</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
