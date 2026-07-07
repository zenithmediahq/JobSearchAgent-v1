'use client'

import { useCallback, useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { SavedJob } from '@/lib/types'
import { JobCard } from '@/components/job-card'
import { ApplicationPackModal } from '@/components/application-pack-modal'
import { Loader2, BookmarkX } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SavedJobsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/saved-jobs', fetcher)
  const supabase = createClient()
  const [selectedJob, setSelectedJob] = useState<SavedJob | null>(null)
  const [showApplicationPackModal, setShowApplicationPackModal] = useState(false)

  const handleUnsave = useCallback(async (jobId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('saved_jobs')
      .delete()
      .eq('user_id', user.id)
      .eq('job_id', jobId)

    mutate()
  }, [supabase, mutate])

  const handleApplicationPack = useCallback((job: SavedJob) => {
    setSelectedJob(job)
    setShowApplicationPackModal(true)
  }, [])

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
                onApplicationPack={handleApplicationPack}
                showStatus
              />
            ))}
          </div>
        </div>
      )}

      <ApplicationPackModal
        job={selectedJob}
        open={showApplicationPackModal}
        onOpenChange={setShowApplicationPackModal}
      />
    </div>
  )
}
