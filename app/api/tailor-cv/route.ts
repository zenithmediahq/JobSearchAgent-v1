import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { tailorCvSchema } from '@/lib/api-schemas'

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
    const validation = tailorCvSchema.safeParse({
      cv: profile.cv_text,
      jobDescription: body.jobDescription,
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      prompt: `You are an expert career advisor helping someone tailor their CV for a specific job application.

Job Title: ${body.jobTitle || 'Not specified'}
Job Description: ${validation.data.jobDescription}

Current CV:
${validation.data.cv}

Please provide specific suggestions to tailor this CV for the job above. Include:

1. **Key Skills to Highlight**: Skills from the CV that match the job requirements
2. **Experience to Emphasize**: Which experiences should be highlighted and how
3. **Keywords to Add**: Important keywords from the job description to include
4. **Suggested Modifications**: Specific changes to make the CV more relevant
5. **Summary/Objective Suggestion**: A tailored professional summary for this role

Format your response clearly with sections and bullet points.`,
    })

    if (!result.text) {
      return NextResponse.json(
        { error: 'Failed to generate tailored suggestions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tailoredCV: result.text })
  } catch (error) {
    console.error('[v0] Tailor CV error:', error)
    return NextResponse.json(
      { error: 'Failed to tailor CV. Please try again.' },
      { status: 500 }
    )
  }
}
