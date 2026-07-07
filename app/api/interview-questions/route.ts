import { NextRequest, NextResponse } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { interviewQuestionsSchema } from '@/lib/api-schemas'
import { createClient } from '@/lib/supabase/server'

const questionsSchema = z.object({
  questions: z.array(z.string()).describe('List of interview questions'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validation = interviewQuestionsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({ schema: questionsSchema }),
      prompt: `You are an expert interviewer preparing questions for a job candidate.

Job Title: ${body.jobTitle || 'Not specified'}
Job Description: ${validation.data.jobDescription}

Generate 5 relevant interview questions for this position. Include a mix of:
- Technical/skill-based questions relevant to the job
- Behavioral questions (STAR format)
- Questions about experience and background
- Questions to assess cultural fit

Make the questions specific to this role where possible.`,
    })

    if (!result.output?.questions || result.output.questions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate interview questions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ questions: result.output.questions })
  } catch (error) {
    console.error('[v0] Interview questions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate interview questions. Please try again.' },
      { status: 500 }
    )
  }
}
