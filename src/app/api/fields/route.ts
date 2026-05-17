import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: fields, error } = await supabase
    .from('fields')
    .select(`
      *,
      field_options (*)
    `)
    .eq('status', 1)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const filteredFields = fields?.map((field: any) => ({
    ...field,
    field_options: field.field_options?.filter((opt: any) => opt.status === 1) || []
  }))

  return NextResponse.json(filteredFields)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { 
    field_name, 
    field_label, 
    field_type, 
    is_required, 
    select_type,
    options // Comma separated string for dropdowns
  } = await request.json()

  if (!field_name || !field_label || !field_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 1. Insert the field
  const { data: field, error: fieldError } = await supabase
    .from('fields')
    .insert({
      field_name,
      field_label,
      field_type,
      is_required,
      select_type: select_type || 'single',
      status: 1,
      created_by: user.id,
      modified_by: user.id,
    })
    .select()
    .single()

  if (fieldError) {
    return NextResponse.json({ error: fieldError.message }, { status: 500 })
  }

  // 2. Insert options if type is DROPDOWN
  if (field_type === 'DROPDOWN' && options) {
    const optionList = options.split(',').map((opt: string) => opt.trim()).filter((opt: string) => opt.length > 0)
    
    if (optionList.length > 0) {
      const optionsToInsert = optionList.map((name: string) => ({
        field_id: field.id,
        option_name: name,
        status: 1,
        created_by: user.id,
        modified_by: user.id,
      }))

      const { error: optionsError } = await supabase
        .from('field_options')
        .insert(optionsToInsert)

      if (optionsError) {
        // We might want to handle this differently, but for now just return the field
        console.error('Error inserting field options:', optionsError)
      }
    }
  }

  // Fetch the field again with options
  const { data: finalField } = await supabase
    .from('fields')
    .select(`*, field_options(*)`)
    .eq('id', field.id)
    .single()

  return NextResponse.json(finalField)
}
