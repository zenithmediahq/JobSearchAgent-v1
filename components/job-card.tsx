'use client'

import { useState } from 'react'
import { Job, SavedJob, STATUS_CONFIG, JobStatus } from '@/lib/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  MapPin,
  Building2,
  Clock,
  Sparkles,
  Loader2,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobCardProps {
  job: Job | SavedJob
  isSaved?: boolean
  onSave?: (job: Job) => Promise<void>
  onUnsave?: (jobId: string) => Promise<void>
  onAnalyze?: (job: Job | SavedJob) => void
  onApplicationPack?: (job: Job | SavedJob) => void
  showStatus?: boolean
  onStatusChange?: (jobId: string, status: JobStatus) => Promise<void>
}

export function JobCard({
  job,
  isSaved = false,
  onSave,
  onUnsave,
  onAnalyze,
  onApplicationPack,
  showStatus = false,
  onStatusChange,
}: JobCardProps) {
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const savedJob = job as SavedJob

  const handleSaveToggle = async () => {
    setSaving(true)
    try {
      if (isSaved && onUnsave) {
        await onUnsave(job.id)
        toast({
          title: 'Success',
          description: 'Job removed from saved',
        })
      } else if (onSave) {
        await onSave(job)
        toast({
          title: 'Success',
          description: 'Job saved',
        })
      }
    } catch (error) {
      console.error('[v0] Save toggle error:', error)
      toast({
        title: 'Error',
        description: isSaved ? 'Failed to unsave job' : 'Failed to save job',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base leading-tight truncate">
                {job.title}
              </h3>
              {showStatus && savedJob.status && (
                <Badge
                  variant="secondary"
                  className={cn('text-xs', STATUS_CONFIG[savedJob.status].color)}
                >
                  {STATUS_CONFIG[savedJob.status].label}
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {savedJob.match_score !== undefined && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-medium',
                  savedJob.match_score >= 80 ? 'border-emerald-500 text-emerald-600' :
                    savedJob.match_score >= 60 ? 'border-amber-500 text-amber-600' :
                      'border-slate-300 text-slate-600'
                )}
              >
                {savedJob.match_score}% match
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSaveToggle}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSaved ? (
                <BookmarkCheck className="h-4 w-4 text-primary" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <Badge variant="secondary" className="text-xs font-normal">
            {job.job_type}
          </Badge>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(job.published_date)}
          </span>
          <span className="text-muted-foreground/60">via {job.source}</span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3">
          {job.summary}
        </p>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {onAnalyze && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAnalyze(job)}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Analyze Match
            </Button>
          )}
          {onApplicationPack && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApplicationPack(job)}
              className="gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              Application Pack
            </Button>
          )}
          {job.url && job.url !== '#' && (
            <Button variant="ghost" size="sm" asChild>
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                View Job <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          {showStatus && onStatusChange && (
            <div className="ml-auto flex gap-1">
              {(Object.keys(STATUS_CONFIG) as JobStatus[]).map((status) => (
                <Button
                  key={status}
                  variant={savedJob.status === status ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onStatusChange(savedJob.job_id, status)}
                >
                  {STATUS_CONFIG[status].label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
