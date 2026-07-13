'use client'

import { useCallback, useState } from 'react'
import useSWR from 'swr'
import { AnalysisSource, ApplicationPack, MatchAnalysis, SavedJob } from '@/lib/types'
import { JobCard } from '@/components/job-card'
import { MatchAnalysisModal } from '@/components/match-analysis-modal'
import { Loader2, BookmarkX } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface SavedJobsResponse {
  data: SavedJob[]
}

export default function SavedJobsPage() {
  const { data, error, isLoading, mutate } = useSWR<SavedJobsResponse>('/api/saved-jobs', fetcher)
  const [selectedJob, setSelectedJob] = useState<SavedJob | null>(null)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)

  const handleUnsave = useCallback(async (jobId: string) => {
    const response = await fetch('/api/saved-jobs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    })

    if (!response.ok) {
      throw new Error('Failed to remove saved job')
    }

    mutate()
  }, [mutate])

  const handleAnalyze = useCallback((job: SavedJob) => {
    setSelectedJob(job)
    setShowAnalysisModal(true)
  }, [])

  const handleApplicationPackSaved = useCallback((applicationPack: ApplicationPack) => {
    mutate(
      (currentData) => currentData ? {
        ...currentData,
        data: currentData.data.map((job: SavedJob) =>
          job.id === selectedJob?.id
            ? { ...job, application_pack: applicationPack }
            : job
        ),
      } : currentData,
      { revalidate: false },
    )
  }, [mutate, selectedJob?.id])

  const handleAnalysisSaved = useCallback((analysis: MatchAnalysis, source: AnalysisSource) => {
    mutate(
      (currentData) => currentData ? {
        ...currentData,
        data: currentData.data.map((job: SavedJob) =>
          job.id === selectedJob?.id
            ? {
                ...job,
                match_score: analysis.score,
                match_analysis: { ...analysis, source },
              }
            : job
        ),
      } : currentData,
      { revalidate: false },
    )
  }, [mutate, selectedJob?.id])

  const savedJobs: SavedJob[] = data?.data || []

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Saved Jobs</h1>
        <p className="mt-1 text-muted-foreground">
          Jobs you&apos;ve bookmarked for later
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="py-16 text-center text-muted-foreground">
          Failed to load saved jobs. Please try again.
        </div>
      )}

      {!isLoading && !error && savedJobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <BookmarkX className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-medium">No Saved Jobs</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Start by searching for jobs and clicking the bookmark icon to save them here.
          </p>
        </div>
      )}

      {!isLoading && !error && savedJobs.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {savedJobs.length} saved job{savedJobs.length !== 1 ? 's' : ''}
          </p>
          <div className="grid gap-4">
            {savedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSaved
                onUnsave={handleUnsave}
                onAnalyze={() => handleAnalyze(job)}
                showStatus
              />
            ))}
          </div>
        </div>
      )}

      <MatchAnalysisModal
        job={selectedJob}
        savedJobId={selectedJob?.id}
        initialAnalysis={selectedJob?.match_analysis}
        initialAnalysisSource={selectedJob?.match_analysis?.source}
        onAnalysisSaved={handleAnalysisSaved}
        initialApplicationPack={selectedJob?.application_pack}
        onApplicationPackSaved={handleApplicationPackSaved}
        open={showAnalysisModal}
        onOpenChange={setShowAnalysisModal}
      />
    </div>
  )
}
