import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { profileSchema } from '@/lib/api-schemas'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[v0] Supabase error fetching profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[v0] Error in GET /api/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validation = profileSchema.safeParse({ cvText: body.cv_text })
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        cv_text: validation.data.cvText,
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Supabase error updating profile:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[v0] Error in PUT /api/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
