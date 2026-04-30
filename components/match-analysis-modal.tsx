'use client'

import { useState, useEffect } from 'react'
import { Job, MatchAnalysis } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle2, AlertCircle, Lightbulb, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MatchAnalysisModalProps {
  job: Job | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MatchAnalysisModal({ job, open, onOpenChange }: MatchAnalysisModalProps) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasCV, setHasCV] = useState<boolean | null>(null)

  useEffect(() => {
    if (open && job) {
      checkCVAndAnalyze()
    }
  }, [open, job])

  const checkCVAndAnalyze = async () => {
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      // Check if user has a CV
      const profileRes = await fetch('/api/profile')
      const profileData = await profileRes.json()
      
      if (!profileData.data?.cv_text) {
        setHasCV(false)
        setLoading(false)
        return
      }
      
      setHasCV(true)

      // Analyze the match
      const res = await fetch('/api/analyze-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job?.title,
          jobDescription: job?.summary,
          company: job?.company,
        }),
      })

      if (!res.ok) throw new Error('Failed to analyze match')

      const data = await res.json()
      setAnalysis(data.analysis)
    } catch {
      setError('Failed to analyze the match. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-slate-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match'
    if (score >= 60) return 'Good Match'
    if (score >= 40) return 'Moderate Match'
    return 'Low Match'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CV Match Analysis</DialogTitle>
          <DialogDescription>
            {job?.title} at {job?.company}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Analyzing your CV match...</p>
          </div>
        )}

        {!loading && hasCV === false && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium">No CV Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your CV in the Profile section to get AI-powered match analysis.
            </p>
            <Button className="mt-4" onClick={() => onOpenChange(false)} asChild>
              <a href="/dashboard/profile">Go to Profile</a>
            </Button>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="mt-2 text-sm text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={checkCVAndAnalyze}>
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && analysis && (
          <div className="space-y-6">
            {/* Score */}
            <div className="text-center">
              <div className={cn('text-5xl font-bold', getScoreColor(analysis.score))}>
                {analysis.score}%
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {getScoreLabel(analysis.score)}
              </p>
              <Progress 
                value={analysis.score} 
                className="mt-4 h-2" 
              />
            </div>

            {/* Summary */}
            <div>
              <p className="text-sm text-muted-foreground">{analysis.summary}</p>
            </div>

            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Your Strengths
                </h4>
                <ul className="mt-2 space-y-1">
                  {analysis.strengths.map((strength, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gaps */}
            {analysis.gaps.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-medium text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Areas to Improve
                </h4>
                <ul className="mt-2 space-y-1">
                  {analysis.gaps.map((gap, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            {analysis.tips.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Lightbulb className="h-4 w-4" />
                  Tips for Your Application
                </h4>
                <ui className="mt-2 list-none space-y-2">
                  {analysis.tips.map((tip, i) => (
                    <li key={i} className="rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                      {tip}
                    </li>
                  ))}
                </ui>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
