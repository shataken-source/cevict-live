import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.petType || !body.color || !body.location || !body.date_found) {
      return NextResponse.json(
        { error: 'Missing required fields: petType, color, location, and date_found are required' },
        { status: 400 }
      )
    }

    // Insert into database
    const { data, error } = await supabase
      .from('lost_pets')
      .insert({
        pet_name: body.petName || null,
        pet_type: body.petType,
        breed: body.breed || null,
        color: body.color,
        size: body.size || null,
        age: body.age || null,
        gender: body.gender || null,
        description: body.description || null,
        location: body.location,
        date_found: body.date_found,
        status: 'found',
        owner_name: body.finder_name || null,
        owner_email: body.finder_email || null,
        owner_phone: body.finder_phone || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting found pet:', error)
      return NextResponse.json(
        { error: 'Failed to submit report', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Error in report-found API:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
