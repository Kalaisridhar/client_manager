import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // 1. Fetch forms first (without the join)
  const { data: forms, error: formsError } = await supabase
    .from('forms')
    .select('*')
    .order('created_at', { ascending: false })

  if (formsError) {
    return NextResponse.json({ error: formsError.message }, { status: 500 })
  }

  if (!forms || forms.length === 0) {
    return NextResponse.json([])
  }

  // 2. Extract unique creator IDs
  const userIds = [...new Set(forms.map(f => f.created_by).filter(Boolean))]

  if (userIds.length > 0) {
    // 3. Fetch profiles for these users
    // Using full_name as per your original schema, or display_name if you renamed it
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', userIds)

    if (!profilesError && profiles) {
      // 4. Manually merge the profiles into the forms data
      const formsWithProfiles = forms.map(form => ({
        ...form,
        profiles: profiles.find(p => p.id === form.created_by) || {
          display_name: 'Unknown User',
          email: ''
        }
      }))
      return NextResponse.json(formsWithProfiles)
    }
  }

  return NextResponse.json(forms)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { form_name, form_description } = await request.json()

  if (!form_name) {
    return NextResponse.json({ error: 'Form name is required' }, { status: 400 })
  }

  const { data: form, error } = await supabase
    .from('forms')
    .insert({
      form_name,
      form_description,
      status: 'Draft',
      created_by: user.id,
      modified_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(form)
}
