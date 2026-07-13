'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { AnalysisSource, Job, MatchAnalysis, SavedJob } from '@/lib/types'
import { JobCard } from '@/components/job-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Loader2, AlertCircle } from 'lucide-react'
import { MatchAnalysisModal } from '@/components/match-analysis-modal'

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

export default function DashboardPage() {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [datePosted, setDatePosted] = useState('any')
  const [employmentType, setEmploymentType] = useState('')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedSavedJob, setSelectedSavedJob] = useState<SavedJob | null>(null)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  // Build search URL
  const employmentTypeParam =
    employmentType && employmentType !== 'all'
      ? `&employment_types=${employmentType}`
      : ''

  const locationParam = searchLocation
    ? `&location=${encodeURIComponent(searchLocation)}`
    : ''

  const searchUrl = searchQuery
    ? `/api/jobs/search?query=${encodeURIComponent(searchQuery)}${locationParam}&date_posted=${datePosted}${employmentTypeParam}`
    : null

  const { data, error, isLoading } = useSWR(searchUrl, fetcher)

  // Fetch saved jobs to check which ones are saved
  const { data: savedJobsData, mutate: mutateSavedJobs } = useSWR(
    '/api/saved-jobs',
    fetcher
  )

  const savedJobIds = new Set(
    savedJobsData?.data?.map((job: SavedJob) => job.job_id) || []
  )

  const savedJobsByJobId = new Map<string, SavedJob>(
    savedJobsData?.data?.map((job: SavedJob) => [job.job_id, job]) || []
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) {
      toast({
        title: 'Empty search',
        description: 'Please enter a search query',
        variant: 'destructive',
      })
      return
    }
    setSearchQuery(query)
    setSearchLocation(location)
  }

  const handleSaveJob = useCallback(async (job: Job) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch('/api/saved-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          source: job.source,
          publishedDate: job.published_date,
          jobType: job.job_type,
          summary: job.summary,
          url: job.url,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 409) {
          toast({
            title: 'Already saved',
            description: 'This job is already in your saved list',
          })
        } else {
          throw new Error(data.error || 'Failed to save')
        }
        return
      }

      mutateSavedJobs()
      toast({
        title: 'Saved',
        description: 'Job added to your saved list',
      })
    } catch (error) {
      console.error('[v0] Save job error:', error)
      toast({
        title: 'Error',
        description: 'Failed to save job. Please try again.',
        variant: 'destructive',
      })
    }
  }, [supabase, mutateSavedJobs, toast])

  const handleUnsaveJob = useCallback(async (jobId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch('/api/saved-jobs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })

      if (!response.ok) {
        throw new Error('Failed to unsave')
      }

      mutateSavedJobs()
      toast({
        title: 'Removed',
        description: 'Job removed from your saved list',
      })
    } catch (error) {
      console.error('[v0] Unsave job error:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove job. Please try again.',
        variant: 'destructive',
      })
    }
  }, [supabase, mutateSavedJobs, toast])

  const handleAnalyze = (job: Job) => {
    setSelectedJob(job)
    setSelectedSavedJob(savedJobsByJobId.get(job.id) ?? null)
    setShowAnalysisModal(true)
  }

  const jobs: Job[] = data?.data || []

  const handleAnalysisSaved = useCallback((analysis: MatchAnalysis, source: AnalysisSource) => {
    mutateSavedJobs(
      (currentData: { data: SavedJob[] } | undefined) => currentData ? {
        ...currentData,
        data: currentData.data.map((job) =>
          job.id === selectedSavedJob?.id
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
  }, [mutateSavedJobs, selectedSavedJob?.id])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Find Your Next Role</h1>
        <p className="mt-1 text-muted-foreground">
          Search for jobs and get AI-powered match analysis
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">
              Search jobs
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Job title, company, or keywords..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full sm:w-56">
            <Label htmlFor="location" className="sr-only">
              Location
            </Label>
            <Input
              id="location"
              placeholder="Location, e.g. Skåne"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <Select value={datePosted} onValueChange={setDatePosted}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Date posted" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">All time</SelectItem>
              <SelectItem value="past_24h">Today</SelectItem>
              <SelectItem value="past_week">Past week</SelectItem>
              <SelectItem value="past_month">Past month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={employmentType || "all"} onValueChange={setEmploymentType}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Job type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="FULLTIME">Full-time</SelectItem>
              <SelectItem value="PARTTIME">Part-time</SelectItem>
              <SelectItem value="CONTRACTOR">Contract</SelectItem>
              <SelectItem value="INTERN">Internship</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={!query.trim()}>
            Search
          </Button>
        </div>
      </form>

      {!searchQuery && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-medium">Start Your Search</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Enter a job title, company name, or keywords to find matching opportunities.
            Add your CV in the Profile section to get AI-powered match scores.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm text-muted-foreground">
            Failed to load jobs. Please try again.
          </p>
        </div>
      )}

      {!isLoading && !error && jobs.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found {jobs.length} jobs matching &quot;{searchQuery}
            {searchLocation ? ` in ${searchLocation}` : ''}&quot;
          </p>
          <div className="grid gap-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSaved={savedJobIds.has(job.id)}
                onSave={handleSaveJob}
                onUnsave={handleUnsaveJob}
                onAnalyze={handleAnalyze}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !error && searchQuery && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">
            No jobs found for &quot;{searchQuery}&quot;. Try different keywords.
          </p>
        </div>
      )}

      <MatchAnalysisModal
        job={selectedJob}
        savedJobId={selectedSavedJob?.id}
        initialAnalysis={selectedSavedJob?.match_analysis}
        initialAnalysisSource={selectedSavedJob?.match_analysis?.source}
        onAnalysisSaved={handleAnalysisSaved}
        open={showAnalysisModal}
        onOpenChange={setShowAnalysisModal}
      />
    </div>
  )
}
