'use client'

import { useCallback, useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { SavedJob, JobStatus, STATUS_CONFIG } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  ClipboardList,
  Building2,
  MapPin,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

const COLUMNS: JobStatus[] = ['saved', 'applied', 'interview', 'rejected', 'offer']

export default function TrackerPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/saved-jobs', fetcher)
  const supabase = createClient()
  const { toast } = useToast()
  const [statusChanging, setStatusChanging] = useState<string | null>(null)

  const handleStatusChange = useCallback(async (jobId: string, newStatus: JobStatus) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in',
        variant: 'destructive',
      })
      return
    }

    setStatusChanging(jobId)
    try {
      const response = await fetch('/api/saved-jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      mutate()
      toast({
        title: 'Success',
        description: `Application status updated to ${STATUS_CONFIG[newStatus].label}`,
      })
    } catch (error) {
      console.error('[v0] Status change error:', error)
      toast({
        title: 'Error',
        description: 'Failed to update application status',
        variant: 'destructive',
      })
    } finally {
      setStatusChanging(null)
    }
  }, [supabase, mutate, toast])

  const savedJobs: SavedJob[] = data?.data || []

  const jobsByStatus = COLUMNS.reduce((acc, status) => {
    acc[status] = savedJobs.filter((job) => job.status === status)
    return acc
  }, {} as Record<JobStatus, SavedJob[]>)

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Application Tracker</h1>
        <p className="mt-1 text-muted-foreground">
          Track your job applications through the hiring pipeline
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="py-16 text-center text-muted-foreground">
          Failed to load applications. Please try again.
        </div>
      )}

      {!isLoading && !error && savedJobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-medium">No Applications Yet</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Save jobs from the Job Search and they&apos;ll appear here so you can track your applications.
          </p>
        </div>
      )}

      {!isLoading && !error && savedJobs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((status) => (
            <div key={status} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">{STATUS_CONFIG[status].label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {jobsByStatus[status].length}
                </Badge>
              </div>
              <div className="flex flex-1 flex-col gap-3 rounded-lg bg-muted/50 p-3">
                {jobsByStatus[status].length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No jobs
                  </p>
                ) : (
                  jobsByStatus[status].map((job) => (
                    <TrackerCard
                      key={job.id}
                      job={job}
                      onStatusChange={handleStatusChange}
                      isChanging={statusChanging === job.job_id}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface TrackerCardProps {
  job: SavedJob
  onStatusChange: (jobId: string, status: JobStatus) => Promise<void>
  isChanging?: boolean
}

function TrackerCard({ job, onStatusChange, isChanging = false }: TrackerCardProps) {
  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium leading-tight truncate">
              {job.title}
            </CardTitle>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                <Building2 className="h-3 w-3 shrink-0" />
                {job.company}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{job.location}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex flex-wrap gap-1">
          {(Object.keys(STATUS_CONFIG) as JobStatus[]).map((status) => (
            <Button
              key={status}
              variant={job.status === status ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-6 px-2 text-xs',
                job.status === status && STATUS_CONFIG[status].color
              )}
              onClick={() => onStatusChange(job.job_id, status)}
              disabled={isChanging}
            >
              {isChanging && job.status === status ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                STATUS_CONFIG[status].label
              )}
            </Button>
          ))}
        </div>
        {job.url && job.url !== '#' && (
          <Button variant="ghost" size="sm" className="mt-2 h-7 w-full justify-start text-xs" asChild>
            <a href={job.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3 w-3" />
              View Job
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
