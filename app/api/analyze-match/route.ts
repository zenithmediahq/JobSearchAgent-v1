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

const commonWords = new Set([
  'och',
  'att',
  'som',
  'för',
  'med',
  'till',
  'har',
  'kan',
  'ska',
  'det',
  'den',
  'ett',
  'din',
  'dig',
  'du',
  'vi',
  'är',
  'på',
  'av',
  'i',
  'en',
  'the',
  'and',
  'for',
  'with',
  'you',
  'are',
  'this',
  'that',
  'will',
  'work',
  'job',
  'role',
])

function extractKeywords(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s+#.-]/gu, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3 && !commonWords.has(word))
    )
  )
}

function fallbackAnalyzeMatch(cv: string, jobTitle: string, jobSummary: string) {
  const cvKeywords = extractKeywords(cv)
  const jobKeywords = extractKeywords(`${jobTitle} ${jobSummary}`)

  const matchedKeywords = jobKeywords.filter((keyword) =>
    cvKeywords.includes(keyword)
  )

  const missingKeywords = jobKeywords
    .filter((keyword) => !cvKeywords.includes(keyword))
    .slice(0, 8)

  const matchRatio =
    jobKeywords.length > 0 ? matchedKeywords.length / jobKeywords.length : 0

  const score = Math.min(95, Math.max(20, Math.round(matchRatio * 100)))

  const strengths =
    matchedKeywords.length > 0
      ? matchedKeywords
        .slice(0, 6)
        .map(
          (keyword) =>
            `Your CV mentions "${keyword}", which appears relevant to this role.`
        )
      : [
        'Your CV is saved, but the fallback scanner found few direct keyword matches.',
      ]

  const gaps =
    missingKeywords.length > 0
      ? missingKeywords.map(
        (keyword) =>
          `The job ad mentions "${keyword}", but it was not clearly found in your CV.`
      )
      : ['No major keyword gaps found by the fallback scanner.']

  const tips = [
    'Mirror the most important job keywords naturally in your CV and application.',
    'Add concrete examples that prove your experience instead of only listing skills.',
    'Be honest. Do not overclaim skills you do not have.',
    'For Swedish job ads, use the same language as the ad when possible.',
  ]

  return {
    score,
    summary: `Fallback keyword analysis found ${matchedKeywords.length} matching keywords out of ${jobKeywords.length}. This is a basic estimate used when AI analysis is unavailable.`,
    strengths,
    gaps,
    tips,
  }
}

export async function POST(request: NextRequest) {
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

  try {
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

Keep the answer practical, honest, and concise.`,
    })

    if (!result.output) {
      throw new Error('Gemini returned no output')
    }

    return NextResponse.json({
      analysis: result.output,
      source: 'gemini',
    })
  } catch (aiError) {
    console.error('[v0] Gemini analysis failed, using fallback:', aiError)

    const fallbackAnalysis = fallbackAnalyzeMatch(
      validation.data.cv,
      validation.data.jobTitle,
      validation.data.jobSummary
    )

    return NextResponse.json({
      analysis: fallbackAnalysis,
      source: 'fallback',
      message: 'Gemini was unavailable, so fallback keyword scoring was used.',
    })
  }
}