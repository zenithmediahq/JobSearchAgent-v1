import { NextRequest, NextResponse } from 'next/server'
import { jobSearchSchema } from '@/lib/api-schemas'

const JOBTECH_SEARCH_URL = 'https://jobsearch.api.jobtechdev.se/search'

type JobTechAd = {
  id?: string
  headline?: string
  employer?: {
    name?: string
  }
  workplace_address?: {
    municipality?: string
    region?: string
    country?: string
  }
  publication_date?: string
  application_deadline?: string
  employment_type?: {
    label?: string
  }
  description?: {
    text?: string
    text_formatted?: string
  }
  webpage_url?: string
  application_details?: {
    url?: string
  }
  must_have?: {
    skills?: Array<{ label?: string }>
    work_experiences?: Array<{ label?: string }>
  }
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function mapDatePostedToDays(datePosted: string) {
  switch (datePosted) {
    case 'past_24h':
      return '1'
    case 'past_week':
      return '7'
    case 'past_month':
      return '30'
    default:
      return ''
  }
}

function normalizeEmploymentType(employmentType: string) {
  switch (employmentType) {
    case 'FULLTIME':
      return 'Heltid'
    case 'PARTTIME':
      return 'Deltid'
    default:
      return ''
  }
}

function formatLocation(ad: JobTechAd) {
  const address = ad.workplace_address

  const parts = [
    address?.municipality,
    address?.region,
    address?.country,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : 'Sweden'
}

function summarize(ad: JobTechAd) {
  const description =
    ad.description?.text ||
    ad.description?.text_formatted ||
    ''

  const cleanDescription = stripHtml(description)

  if (cleanDescription.length > 0) {
    return cleanDescription.slice(0, 500)
  }

  const skills = ad.must_have?.skills
    ?.map((skill) => skill.label)
    .filter(Boolean)
    .join(', ')

  if (skills) {
    return `Required skills: ${skills}`
  }

  return 'No description available.'
}

function transformJobTechAd(ad: JobTechAd) {
  return {
    id: String(ad.id || crypto.randomUUID()),
    title: String(ad.headline || 'Untitled'),
    company: String(ad.employer?.name || 'Unknown employer'),
    location: formatLocation(ad),
    source: 'Platsbanken',
    published_date: String(ad.publication_date || new Date().toISOString()),
    deadline: ad.application_deadline || null,
    job_type: String(ad.employment_type?.label || 'Not specified'),
    summary: summarize(ad),
    url: String(ad.webpage_url || ad.application_details?.url || ''),
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const query = searchParams.get('query') || ''
    const page = searchParams.get('page')
      ? parseInt(searchParams.get('page')!, 10)
      : 1
    const datePosted = searchParams.get('date_posted') || 'any'
    const employmentType = searchParams.get('employment_types') || ''

    const validation = jobSearchSchema.safeParse({
      query,
      page,
      datePosted,
      employmentType,
    })

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid search parameters',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const limit = 20
    const offset = Math.max(page - 1, 0) * limit

    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
    })

    const publishedAfterDays = mapDatePostedToDays(datePosted)
    if (publishedAfterDays) {
      params.set('published-after', publishedAfterDays)
    }

    const normalizedEmploymentType = normalizeEmploymentType(employmentType)
    if (normalizedEmploymentType) {
      params.set('employment_type', normalizedEmploymentType)
    }

    const response = await fetch(`${JOBTECH_SEARCH_URL}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
      next: {
        revalidate: 300,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()

      console.error('[JobTech] API error:', {
        status: response.status,
        body: errorText,
      })

      return NextResponse.json(
        {
          error: 'Failed to search jobs from JobTech',
          source: 'jobtech',
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    const hits = Array.isArray(data.hits) ? data.hits : []
    const jobs = hits.map(transformJobTechAd)

    return NextResponse.json({
      data: jobs,
      total: data.total?.value ?? data.total ?? jobs.length,
      status: 'OK',
      source: 'jobtech',
      message: jobs.length
        ? 'Showing live job ads from Platsbanken/JobTech'
        : 'No jobs found from Platsbanken/JobTech',
    })
  } catch (error) {
    console.error('[JobTech] Job search error:', error)

    return NextResponse.json(
      {
        error: 'Failed to search jobs',
        source: 'jobtech',
      },
      { status: 500 }
    )
  }
}