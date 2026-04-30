import { NextRequest, NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { analyzeMatchSchema } from '@/lib/api-schemas'

const matchAnalysisSchema = z.object({
  score: z.number().min(0).max(100).describe('Match score from 0 to 100'),
  summary: z.string().describe('Brief summary of the match analysis'),
  strengths: z.array(z.string()).describe('List of candidate strengths that match the job'),
  gaps: z.array(z.string()).describe('List of skills or experience gaps'),
  tips: z.array(z.string()).describe('Tips for improving the application'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's CV
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('cv_text')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[v0] Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (!profile?.cv_text) {
      return NextResponse.json({ error: 'CV not found. Please upload your CV first.' }, { status: 400 })
    }

    const body = await request.json()

    // Validate input
    const validation = analyzeMatchSchema.safeParse({
      cv: profile.cv_text,
      jobTitle: body.jobTitle,
      jobSummary: body.jobDescription,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid analysis data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const result = await generateText({
      model: google('gemini-2.5-flash-lite'),
      output: Output.object({ schema: matchAnalysisSchema }),
      prompt: `You are a career advisor analyzing how well a candidate's CV matches a job posting.

Job Title: ${validation.data.jobTitle}
Job Description: ${validation.data.jobSummary}

Candidate's CV:
${validation.data.cv}

Analyze the match between this CV and the job posting. Provide:
1. A match score from 0-100 based on skills, experience, and requirements alignment
2. A brief summary of the overall match
3. Key strengths the candidate has for this role
4. Gaps or areas where the candidate might be lacking
5. Practical tips for improving their application

Be constructive and helpful in your analysis.`,
    })

    if (!result.output) {
      return NextResponse.json(
        { error: 'Failed to generate analysis' },
        { status: 500 }
      )
    }

    return NextResponse.json({ analysis: result.output })
  } catch (error) {
    console.error('[v0] Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze job match. Please try again.' },
      { status: 500 }
    )
  }
}
