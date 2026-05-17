import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ submission_id: string }> }
) {
  const { submission_id } = await params
  const supabase = await createClient()

  // 1. Fetch submission details
  const { data: submission, error: subError } = await supabase
    .from('form_submissions')
    .select(`
      id,
      form_id,
      created_at,
      profiles:created_by (
        display_name,
        email
      )
    `)
    .eq('id', submission_id)
    .single()

  if (subError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // 2. Fetch fields to check for multi-select dropdown type definitions
  const { data: fields, error: fieldsError } = await supabase
    .from('fields')
    .select('id, field_type, select_type')
    .eq('status', 1)

  if (fieldsError || !fields) {
    return NextResponse.json({ error: 'Error fetching fields metadata' }, { status: 500 })
  }

  const selectTypeMap = new Map(fields.map(f => [f.id, f.select_type]))

  // 3. Fetch answers
  const { data: answers, error: ansError } = await supabase
    .from('form_answers')
    .select(`
      field_id,
      field_type,
      num_answer,
      text_answer,
      textarea_answer,
      int_answer,
      date_answer,
      dropdown_answer
    `)
    .eq('submission_id', submission_id)

  if (ansError) {
    return NextResponse.json({ error: ansError.message }, { status: 500 })
  }

  // 4. Map values to simple key-value pairs
  const answersMap: Record<string, any> = {}
  answers?.forEach(ans => {
    let val = null
    if (ans.field_type === 'TEXT') val = ans.text_answer
    else if (ans.field_type === 'TEXTAREA') val = ans.textarea_answer
    else if (ans.field_type === 'DATE') val = ans.date_answer
    else if (ans.field_type === 'DROPDOWN') val = ans.dropdown_answer
    else if (ans.field_type === 'CURRENCY') val = ans.num_answer
    else if (ans.field_type === 'NUMBER') val = ans.int_answer !== null ? ans.int_answer : ans.num_answer

    const isMultiple = selectTypeMap.get(ans.field_id) === 'multiple'
    if (isMultiple && ans.field_type === 'DROPDOWN') {
      if (!answersMap[ans.field_id]) answersMap[ans.field_id] = []
      if (val !== null) answersMap[ans.field_id].push(val)
    } else {
      answersMap[ans.field_id] = val
    }
  })

  return NextResponse.json({
    id: submission.id,
    form_id: submission.form_id,
    created_at: submission.created_at,
    profiles: submission.profiles || { display_name: 'Unknown User', email: '' },
    answers: answersMap
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ submission_id: string }> }
) {
  const { submission_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { form_id, answers } = await request.json()

  if (!form_id || !answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Missing form_id or answers' }, { status: 400 })
  }

  // 1. Fetch current submission to confirm ownership/existence
  const { data: submission, error: subError } = await supabase
    .from('form_submissions')
    .select('id')
    .eq('id', submission_id)
    .single()

  if (subError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // 2. Fetch the form's fields to map type definitions correctly
  const { data: fields, error: fieldsError } = await supabase
    .from('fields')
    .select('id, field_type, select_type')
    .eq('status', 1)

  if (fieldsError || !fields) {
    return NextResponse.json({ error: 'Error fetching fields definition' }, { status: 500 })
  }

  const fieldTypeMap = new Map(fields.map(f => [f.id, f.field_type]))
  const selectTypeMap = new Map(fields.map(f => [f.id, f.select_type]))

  // 3. Clear existing answers to avoid duplicates and handle updates simply
  const { error: deleteError } = await supabase
    .from('form_answers')
    .delete()
    .eq('submission_id', submission_id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  interface AnswerToInsert {
    submission_id: string
    form_id: string
    field_id: string
    field_type: string
    num_answer: number | null
    text_answer: string | null
    textarea_answer: string | null
    int_answer: number | null
    date_answer: string | null
    dropdown_answer: string | null
  }

  // 4. Map and prepare the new updated answers, supporting relational flatMap inserts
  const answersToInsert: AnswerToInsert[] = Object.entries(answers).flatMap(([fieldId, value]) => {
    const fieldType = fieldTypeMap.get(fieldId) || 'TEXT'
    const isMultiple = selectTypeMap.get(fieldId) === 'multiple'

    if (fieldType === 'DROPDOWN' && isMultiple && Array.isArray(value)) {
      return value.map(optId => ({
        submission_id,
        form_id,
        field_id: fieldId,
        field_type: fieldType,
        num_answer: null,
        text_answer: null,
        textarea_answer: null,
        int_answer: null,
        date_answer: null,
        dropdown_answer: optId
      } as AnswerToInsert))
    }
    
    let num_answer = null
    let text_answer = null
    let textarea_answer = null
    let int_answer = null
    let date_answer = null
    let dropdown_answer = null

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      if (fieldType === 'TEXT') {
        text_answer = String(value)
      } else if (fieldType === 'TEXTAREA') {
        textarea_answer = String(value)
      } else if (fieldType === 'DATE') {
        date_answer = String(value)
      } else if (fieldType === 'DROPDOWN') {
        dropdown_answer = String(value) // UUID
      } else if (fieldType === 'CURRENCY') {
        num_answer = parseFloat(String(value))
      } else if (fieldType === 'NUMBER') {
        const valStr = String(value)
        if (Number.isInteger(Number(valStr))) {
          int_answer = parseInt(valStr, 10)
        } else {
          num_answer = parseFloat(valStr)
        }
      }
    }

    return [{
      submission_id,
      form_id,
      field_id: fieldId,
      field_type: fieldType,
      num_answer,
      text_answer,
      textarea_answer,
      int_answer,
      date_answer,
      dropdown_answer
    } as AnswerToInsert]
  })

  // 5. Bulk insert updated answers
  const { error: ansInsertError } = await supabase
    .from('form_answers')
    .insert(answersToInsert)

  if (ansInsertError) {
    return NextResponse.json({ error: ansInsertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
