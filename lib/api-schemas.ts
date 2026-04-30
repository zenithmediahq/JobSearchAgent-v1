import { z } from 'zod'

// Job search validation
export const jobSearchSchema = z.object({
  query: z.string().min(1, 'Search query required').max(200),
  page: z.number().int().positive().optional().default(1),
  datePosted: z.enum(['past_24h', 'past_week', 'past_month', 'any']).optional().default('any'),
  employmentType: z.string().optional(),
})

export type JobSearchRequest = z.infer<typeof jobSearchSchema>

// Save job validation
export const saveJobSchema = z.object({
  jobId: z.string().min(1, 'Job ID required').max(100),
  title: z.string().min(1).max(500),
  company: z.string().min(1).max(500),
  location: z.string().max(500).nullable(),
  source: z.string().max(100).optional(),
  publishedDate: z.string().max(100).optional(),
  jobType: z.string().max(100).optional(),
  summary: z.string().max(5000).optional(),
  url: z.string().url('Invalid URL').optional(),
})

export type SaveJobRequest = z.infer<typeof saveJobSchema>

// Update job status validation
export const updateJobStatusSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(['saved', 'applied', 'interview', 'rejected', 'offer']),
})

export type UpdateJobStatusRequest = z.infer<typeof updateJobStatusSchema>

// Analyze match validation
export const analyzeMatchSchema = z.object({
  jobTitle: z.string().min(1).max(500),
  jobSummary: z.string().min(1).max(5000),
  cv: z.string().min(10, 'CV content required').max(50000, 'CV too long'),
})

export type AnalyzeMatchRequest = z.infer<typeof analyzeMatchSchema>

// Profile validation
export const profileSchema = z.object({
  cvText: z.string().min(10, 'CV should be at least 10 characters').max(50000, 'CV too long'),
})

export type ProfileRequest = z.infer<typeof profileSchema>

// Tailor CV validation
export const tailorCvSchema = z.object({
  cv: z.string().min(10).max(50000),
  jobDescription: z.string().min(1).max(5000),
})

export type TailorCvRequest = z.infer<typeof tailorCvSchema>

// Interview questions validation
export const interviewQuestionsSchema = z.object({
  jobTitle: z.string().min(1).max(500),
  jobDescription: z.string().min(1).max(5000),
  cv: z.string().min(10).max(50000),
})

export type InterviewQuestionsRequest = z.infer<typeof interviewQuestionsSchema>

// Interview feedback validation
export const interviewFeedbackSchema = z.object({
  question: z.string().min(1).max(1000),
  userAnswer: z.string().min(1).max(5000),
  jobContext: z.string().min(1).max(1000),
})

export type InterviewFeedbackRequest = z.infer<typeof interviewFeedbackSchema>
