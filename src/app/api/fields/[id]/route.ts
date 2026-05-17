import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  // 1. Update the main field
  const { data: field, error: fieldError } = await supabase
    .from('fields')
    .update({
      field_name,
      field_label,
      field_type,
      is_required,
      select_type: select_type || 'single',
      modified_by: user.id,
      modified_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (fieldError) {
    return NextResponse.json({ error: fieldError.message }, { status: 500 })
  }

  // 2. Manage options if dropdown
  if (field_type === 'DROPDOWN' && options !== undefined) {
    const incomingOptions = options.split(',')
      .map((opt: string) => opt.trim())
      .filter((opt: string) => opt.length > 0)

    // Fetch existing options
    const { data: existingOptions } = await supabase
      .from('field_options')
      .select('*')
      .eq('field_id', id)

    const existingOpts = existingOptions || []

    // Map existing options by option_name
    const existingMap = new Map(existingOpts.map(opt => [opt.option_name, opt]))

    // Identify updates and inserts
    const toInsert = []
    const toUpdateActive = []

    for (const optName of incomingOptions) {
      if (existingMap.has(optName)) {
        const existing = existingMap.get(optName)!
        if (existing.status !== 1) {
          toUpdateActive.push(existing.id)
        }
      } else {
        toInsert.push({
          field_id: id,
          option_name: optName,
          status: 1,
          created_by: user.id,
          modified_by: user.id,
        })
      }
    }

    // Identify options to soft-delete (status: 0)
    // Options in DB that are active (status: 1) but NOT in incomingOptions
    const incomingSet = new Set(incomingOptions)
    const toSoftDelete = existingOpts
      .filter(opt => opt.status === 1 && !incomingSet.has(opt.option_name))
      .map(opt => opt.id)

    // Perform DB operations
    if (toInsert.length > 0) {
      await supabase.from('field_options').insert(toInsert)
    }

    if (toUpdateActive.length > 0) {
      await supabase
        .from('field_options')
        .update({ status: 1, modified_by: user.id, modified_at: new Date().toISOString() })
        .in('id', toUpdateActive)
    }

    if (toSoftDelete.length > 0) {
      await supabase
        .from('field_options')
        .update({ status: 0, modified_by: user.id, modified_at: new Date().toISOString() })
        .in('id', toSoftDelete)
    }
  }

  // Fetch the final field with its active options (status = 1)
  const { data: finalField } = await supabase
    .from('fields')
    .select(`
      *,
      field_options (*)
    `)
    .eq('id', id)
    .single()

  // Filter out status 0 options if they exist
  if (finalField && finalField.field_options) {
    finalField.field_options = finalField.field_options.filter((opt: any) => opt.status === 1)
  }

  return NextResponse.json(finalField)
}
