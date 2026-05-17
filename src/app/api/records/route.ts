import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const formId = searchParams.get('form_id')

  if (!formId) {
    return NextResponse.json({ error: 'Form ID is required' }, { status: 400 })
  }

  // 1. Fetch all submissions for the form, including the submitter's profile
  const { data: submissions, error: subError } = await supabase
    .from('form_submissions')
    .select(`
      id,
      created_at,
      profiles:created_by (
        display_name,
        email
      )
    `)
    .eq('form_id', formId)
    .order('created_at', { ascending: false })

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 })
  }

  // 2. Fetch fields to check for multi-select dropdown type definitions
  const { data: fieldsData } = await supabase
    .from('fields')
    .select('id, select_type')
    .eq('status', 1)

  const selectTypeMap = new Map(fieldsData?.map(f => [f.id, f.select_type]) || [])

  // 3. Fetch all answers for these submissions with option names for dropdowns
  const { data: answers, error: ansError } = await supabase
    .from('form_answers')
    .select(`
      id,
      submission_id,
      field_id,
      field_type,
      num_answer,
      text_answer,
      textarea_answer,
      int_answer,
      date_answer,
      dropdown_answer,
      field_options:dropdown_answer (
        option_name
      )
    `)
    .eq('form_id', formId)

  if (ansError) {
    return NextResponse.json({ error: ansError.message }, { status: 500 })
  }

  // 4. Map submissions and reconstruct the answers map in-memory for fast consumption
  const responseData = submissions.map(sub => {
    const subAnswers = answers.filter(a => a.submission_id === sub.id)
    const answersMap: Record<string, any> = {}

    subAnswers.forEach(ans => {
      let val = null
      const optionName = ans.field_options 
        ? (Array.isArray(ans.field_options) 
            ? ans.field_options[0]?.option_name 
            : (ans.field_options as any).option_name) 
        : null

      if (ans.field_type === 'TEXT') val = ans.text_answer
      else if (ans.field_type === 'TEXTAREA') val = ans.textarea_answer
      else if (ans.field_type === 'DATE') val = ans.date_answer
      else if (ans.field_type === 'DROPDOWN') val = optionName || ans.dropdown_answer
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

    return {
      id: sub.id,
      created_at: sub.created_at,
      profiles: sub.profiles || { display_name: 'Unknown User', email: '' },
      answers: answersMap
    }
  })

  return NextResponse.json(responseData)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { form_id, answers } = await request.json()

  if (!form_id || !answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Missing form_id or answers' }, { status: 400 })
  }

  // 1. Create a submission record
  const { data: submission, error: subError } = await supabase
    .from('form_submissions')
    .insert({
      form_id,
      created_by: user.id
    })
    .select()
    .single()

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 })
  }

  // 2. Fetch the form's fields to verify type mapping
  const { data: fields, error: fieldsError } = await supabase
    .from('fields')
    .select('id, field_type, select_type')
    .eq('status', 1)

  if (fieldsError || !fields) {
    return NextResponse.json({ error: 'Error fetching form fields definition' }, { status: 500 })
  }

  const fieldTypeMap = new Map(fields.map(f => [f.id, f.field_type]))
  const selectTypeMap = new Map(fields.map(f => [f.id, f.select_type]))

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

  // 3. Prepare answers for bulk insertion, supporting relational flatMap inserts
  const answersToInsert: AnswerToInsert[] = Object.entries(answers).flatMap(([fieldId, value]) => {
    const fieldType = fieldTypeMap.get(fieldId) || 'TEXT'
    const isMultiple = selectTypeMap.get(fieldId) === 'multiple'

    if (fieldType === 'DROPDOWN' && isMultiple && Array.isArray(value)) {
      return value.map(optId => ({
        submission_id: submission.id,
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
        dropdown_answer = String(value) // Option UUID
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
      submission_id: submission.id,
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

  // 4. Perform bulk insert of answers
  const { error: ansInsertError } = await supabase
    .from('form_answers')
    .insert(answersToInsert)

  if (ansInsertError) {
    // If answer insert fails, delete submission to maintain consistency
    await supabase.from('form_submissions').delete().eq('id', submission.id)
    return NextResponse.json({ error: ansInsertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, submission_id: submission.id })
}
