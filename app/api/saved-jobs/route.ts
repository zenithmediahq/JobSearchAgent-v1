import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { saveJobSchema, updateJobStatusSchema } from '@/lib/api-schemas'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('saved_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Supabase error fetching saved jobs:', error)
      return NextResponse.json({ error: 'Failed to fetch saved jobs' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[v0] Error in GET /api/saved-jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validation = saveJobSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid job data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('saved_jobs')
      .insert([
        {
          user_id: user.id,
          job_id: validation.data.jobId,
          title: validation.data.title,
          company: validation.data.company,
          location: validation.data.location,
          source: validation.data.source,
          published_date: validation.data.publishedDate,
          job_type: validation.data.jobType,
          summary: validation.data.summary,
          url: validation.data.url,
        },
      ])
      .select()

    if (error) {
      console.error('[v0] Supabase error saving job:', error)
      // Check if it's a duplicate
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Job already saved' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to save job' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('[v0] Error in POST /api/saved-jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const jobId = body.jobId

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('user_id', user.id)
      .eq('job_id', jobId)

    if (error) {
      console.error('[v0] Supabase error deleting job:', error)
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error in DELETE /api/saved-jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validation = updateJobStatusSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid status data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('saved_jobs')
      .update({ status: validation.data.status })
      .eq('user_id', user.id)
      .eq('job_id', validation.data.jobId)
      .select()

    if (error) {
      console.error('[v0] Supabase error updating job status:', error)
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[v0] Error in PATCH /api/saved-jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
