'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface FieldOption {
  id: string
  option_name: string
}

interface Field {
  id: string
  field_name: string
  field_label: string
  field_type: 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'CURRENCY' | 'TEXTAREA'
  is_required: boolean
  select_type?: 'single' | 'multiple'
  field_options?: FieldOption[]
}

interface FormStructure {
  column1: string[]
  column2: string[]
}

interface Form {
  id: string
  form_name: string
  form_description: string
  form_columns: FormStructure | null
}

export default function AddOrEditRecordPage({
  params
}: {
  params: Promise<{ form_id: string; submission_id?: string[] }>
}) {
  const { form_id: formId, submission_id: submissionIdArr } = use(params)
  const submissionId = submissionIdArr && submissionIdArr.length > 0 ? submissionIdArr[0] : null

  const [form, setForm] = useState<Form | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const router = useRouter()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [formRes, fieldsRes] = await Promise.all([
        fetch(`/api/forms/${formId}`),
        fetch('/api/fields')
      ])

      const formData = await formRes.json()
      const fieldsData = await fieldsRes.json()

      setForm(formData)
      setFields(fieldsData)

      // If we are editing, fetch the existing answers
      if (submissionId) {
        const subRes = await fetch(`/api/records/${submissionId}`)
        if (subRes.ok) {
          const subData = await subRes.json()
          setFormAnswers(subData.answers || {})
        }
      }
    } catch (error) {
      console.error('Error syncing dynamic form dataset:', error)
    } finally {
      setLoading(false)
    }
  }, [formId, submissionId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleInputChange = (fieldId: string, val: any) => {
    setFormAnswers(prev => ({
      ...prev,
      [fieldId]: val
    }))
  }

  const getFieldById = (id: string) => fields.find(f => f.id === id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = submissionId ? `/api/records/${submissionId}` : '/api/records'
      const method = submissionId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          answers: formAnswers
        })
      })

      if (res.ok) {
        router.push(`/records/${formId}`)
        router.refresh()
      }
    } catch (error) {
      console.error('Error saving record row:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-[#F9FAFB]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6366F1]"></div>
        <span className="text-[12px] text-[#6B7280] font-bold">Syncing layout workspace...</span>
      </div>
    )
  }

  // Generate form layout columns matching Form Designer
  const column1Fields = form?.form_columns?.column1 || []
  const column2Fields = form?.form_columns?.column2 || []

  const renderFieldInput = (field: Field) => {
    const commonClasses = "w-full px-3.5 py-2 border border-[#F0F0F0] rounded-[10px] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/5 focus:border-[#6366F1] text-[13px] font-medium transition-all text-[#4B5563]"

    return (
      <div key={field.id} className="space-y-1.5 bg-white border border-[#F0F0F0] rounded-[12px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-gray-300 transition-all">
        <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">
          {field.field_label}
          {field.is_required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {field.field_type === 'TEXTAREA' ? (
          <textarea
            className={`${commonClasses} resize-none`}
            rows={4}
            required={field.is_required}
            value={formAnswers[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={`Enter ${field.field_label.toLowerCase()}...`}
          />
        ) : field.field_type === 'DROPDOWN' ? (
          field.select_type === 'multiple' ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {field.field_options?.map(opt => {
                const currentSelections = Array.isArray(formAnswers[field.id]) ? formAnswers[field.id] : [];
                const isSelected = currentSelections.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      let nextVals;
                      if (currentSelections.includes(opt.id)) {
                        nextVals = currentSelections.filter((id: string) => id !== opt.id);
                      } else {
                        nextVals = [...currentSelections, opt.id];
                      }
                      handleInputChange(field.id, nextVals);
                    }}
                    className={`px-3 py-1.5 rounded-[8px] text-[12px] font-bold border transition-all flex items-center gap-1.5 ${
                      isSelected 
                        ? 'bg-[#EEF2FF] border-[#6366F1] text-[#6366F1] shadow-sm' 
                        : 'bg-white border-[#F0F0F0] text-[#6B7280] hover:border-gray-300'
                    }`}
                  >
                    {isSelected && <span className="material-symbols-outlined text-[14px]">done</span>}
                    {opt.option_name}
                  </button>
                );
              })}
            </div>
          ) : (
            <select
              className={commonClasses}
              required={field.is_required}
              value={formAnswers[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
            >
              <option value="">Select option...</option>
              {field.field_options?.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.option_name}</option>
              ))}
            </select>
          )
        ) : field.field_type === 'DATE' ? (
          <input
            type="date"
            className={commonClasses}
            required={field.is_required}
            value={formAnswers[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        ) : field.field_type === 'CURRENCY' ? (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <span className="text-[12px] text-[#9CA3AF] font-bold">$</span>
            </div>
            <input
              type="number"
              step="0.01"
              className="w-full pl-8 pr-4 py-2 border border-[#F0F0F0] rounded-[10px] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/5 focus:border-[#6366F1] text-[13px] font-medium transition-all text-[#4B5563]"
              required={field.is_required}
              value={formAnswers[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder="0.00"
            />
          </div>
        ) : (
          <input
            type={field.field_type === 'NUMBER' ? 'number' : 'text'}
            className={commonClasses}
            required={field.is_required}
            value={formAnswers[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={`Enter ${field.field_label.toLowerCase()}...`}
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#F9FAFB]">
      {/* Workspace Header */}
      <div className="bg-white border-b border-[#F0F0F0] px-8 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-5">
          <Link href={`/records/${formId}`} className="w-9 h-9 flex items-center justify-center hover:bg-[#F9F9F9] rounded-[10px] border border-[#F0F0F0] transition-all">
            <span className="material-symbols-outlined text-[#6B7280] text-[20px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-[16px] font-bold text-[#1F2937]">{form?.form_name}</h1>
            <p className="text-[11px] text-[#9CA3AF] font-bold uppercase tracking-wider mt-0.5">
              {submissionId ? 'Edit Record response' : 'New Record Entry'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/records/${formId}`}
            className="px-4 py-2 text-[12px] font-bold text-[#6B7280] bg-white border border-[#F0F0F0] rounded-[10px] hover:bg-gray-50 flex items-center gap-2 transition-all"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-[12px] font-bold text-white bg-[#6366F1] rounded-[10px] hover:bg-[#4F46E5] flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {saving ? 'Saving...' : submissionId ? 'Update Record' : 'Submit Record'}
          </button>
        </div>
      </div>

      {/* Dynamic Two-Column Layout Form */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* <div className="flex items-center justify-between pb-1.5 border-b border-[#F0F0F0]">
                <span className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">Left Side Columns</span>
              </div> */}
              {column1Fields.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-[#9CA3AF] font-medium border-2 border-dashed border-[#F3F4F6] rounded-[12px]">
                  No columns mapped on left side
                </div>
              ) : (
                column1Fields.map(id => {
                  const field = getFieldById(id)
                  return field ? renderFieldInput(field) : null
                })
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* <div className="flex items-center justify-between pb-1.5 border-b border-[#F0F0F0]">
                <span className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">Right Side Columns</span>
              </div> */}
              {column2Fields.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-[#9CA3AF] font-medium border-2 border-dashed border-[#F3F4F6] rounded-[12px]">
                  No columns mapped on right side
                </div>
              ) : (
                column2Fields.map(id => {
                  const field = getFieldById(id)
                  return field ? renderFieldInput(field) : null
                })
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
