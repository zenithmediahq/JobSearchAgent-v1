import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { interviewFeedbackSchema } from '@/lib/api-schemas'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validation = interviewFeedbackSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      prompt: `You are an expert interviewer providing feedback on a candidate's interview response.

Job Title/Context: ${validation.data.jobContext}

Interview Question: ${validation.data.question}

Candidate's Answer: ${validation.data.userAnswer}

Please provide constructive feedback on this answer, including:

1. **Strengths**: What the candidate did well
2. **Areas for Improvement**: What could be better
3. **Suggested Improvements**: Specific tips to strengthen the answer
4. **Example Enhancement**: A brief example of how to improve one part of the answer

Be encouraging but honest. Help them improve for their real interview.`,
    })

    if (!result.text) {
      return NextResponse.json(
        { error: 'Failed to generate feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ feedback: result.text })
  } catch (error) {
    console.error('[v0] Interview feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to get feedback. Please try again.' },
      { status: 500 }
    )
  }
}
