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

interface Submission {
  id: string
  created_at: string
  profiles: {
    display_name: string | null
    email: string
  }
  answers: Record<string, any>
}

const formatDateToDMY = (dateStr: string) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const year = parts[0]
    const monthIndex = parseInt(parts[1], 10) - 1
    const day = parts[2]
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthName = months[monthIndex] || parts[1]
    return `${day}-${monthName}-${year}`
  }
  
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const day = String(d.getDate()).padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = months[d.getMonth()]
  const year = d.getFullYear()
  return `${day}-${monthName}-${year}`
}

const getTagStyles = (name: string) => {
  const colors = [
    { bg: 'bg-[#EFF6FF]', text: 'text-[#1E40AF]', border: 'border-[#BFDBFE]' }, // Blue
    { bg: 'bg-[#ECFDF5]', text: 'text-[#065F46]', border: 'border-[#A7F3D0]' }, // Green
    { bg: 'bg-[#FDF2F8]', text: 'text-[#9D174D]', border: 'border-[#FBCFE8]' }, // Pink
    { bg: 'bg-[#FFFBEB]', text: 'text-[#92400E]', border: 'border-[#FDE68A]' }, // Amber
    { bg: 'bg-[#F5F3FF]', text: 'text-[#5B21B6]', border: 'border-[#DDD6FE]' }, // Purple
    { bg: 'bg-[#F0FDF4]', text: 'text-[#166534]', border: 'border-[#BBF7D0]' }, // Emerald
    { bg: 'bg-[#FFF1F2]', text: 'text-[#9F1239]', border: 'border-[#FECDD3]' }, // Rose
    { bg: 'bg-[#F0F9FF]', text: 'text-[#075985]', border: 'border-[#BAE6FD]' }, // Sky
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

export default function FormRecordsPage({ params }: { params: Promise<{ form_id: string }> }) {
  const { form_id: formId } = use(params)
  const [form, setForm] = useState<Form | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const router = useRouter()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [formRes, fieldsRes, subRes] = await Promise.all([
        fetch(`/api/forms/${formId}`),
        fetch('/api/fields'),
        fetch(`/api/records?form_id=${formId}`)
      ])

      const formData = await formRes.json()
      const fieldsData = await fieldsRes.json()
      const subData = await subRes.json()

      setForm(formData)
      setFields(fieldsData)
      if (Array.isArray(subData)) {
        setSubmissions(subData)
      }
    } catch (error) {
      console.error('Error syncing records dataset:', error)
    } finally {
      setLoading(false)
    }
  }, [formId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Get active fields structured in columns
  const getActiveFields = () => {
    if (!form || !form.form_columns) return []
    const activeIds = [
      ...(form.form_columns.column1 || []),
      ...(form.form_columns.column2 || [])
    ]
    return activeIds
      .map(id => fields.find(f => f.id === id))
      .filter((f): f is Field => !!f)
  }

  const activeFields = getActiveFields()


  // Filter submissions by search term across all answer values
  const filteredSubmissions = submissions.filter(sub => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()

    // Check originator
    if (sub.profiles?.display_name?.toLowerCase().includes(term) || sub.profiles?.email.toLowerCase().includes(term)) {
      return true
    }

    // Check answer values
    return Object.values(sub.answers).some(val =>
      val !== null && String(val).toLowerCase().includes(term)
    )
  })

  const getInitial = (name: string | null, email: string) => {
    if (name) return name.charAt(0).toUpperCase()
    return email.charAt(0).toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-[#F9FAFB]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6366F1]"></div>
        <span className="text-[12px] text-[#6B7280] font-bold">Syncing records...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 lg:px-10">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/records" className="w-9 h-9 flex items-center justify-center hover:bg-white rounded-[10px] border border-[#F0F0F0] bg-white/50 transition-all">
            <span className="material-symbols-outlined text-[#6B7280] text-[20px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-[26px] font-bold text-[#1F2937] tracking-tight">{form?.form_name}</h1>
            <p className="mt-1 text-[#6B7280] text-[13px] font-medium max-w-md line-clamp-1">
              {form?.form_description || 'No description provided.'}
            </p>
          </div>
        </div>
        <Link
          href={`/records/${formId}/add-record`}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-[12px] shadow-sm text-[13px] font-bold text-white bg-[#6366F1] hover:bg-[#4F46E5] transition-all transform active:scale-95"
        >
          <span className="material-symbols-outlined mr-2 text-[18px]">add_circle</span>
          Add Record
        </Link>
      </div>

      {/* Dynamic Columns Search Bar */}
      <div className="bg-white rounded-[16px] border border-[#F0F0F0] p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.02)] mb-6">
        <div className="relative flex-1 w-full max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-[#9CA3AF] text-[18px]">search</span>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2 border border-[#F0F0F0] rounded-[10px] bg-[#FAFAFA] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/5 focus:border-[#6366F1] text-[13px] font-medium transition-all"
            placeholder="Search records dataset..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="text-[11px] text-[#9CA3AF] font-bold uppercase tracking-wider">
          {filteredSubmissions.length} Responses
        </span>
      </div>

      {/* Dynamic Data Table */}
      <div className="bg-white border border-[#F0F0F0] rounded-[16px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-x-auto">
        <table className="min-w-full divide-y divide-[#F3F4F6]">
          <thead className="bg-[#F9FAFB]">
            <tr>
              <th className="px-6 py-3.5 text-left text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Originator</th>
              {activeFields.map(field => (
                <th key={field.id} className="px-6 py-3.5 text-left text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] whitespace-nowrap">
                  {field.field_label}
                </th>
              ))}
              <th className="px-6 py-3.5 text-left text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] whitespace-nowrap">Created At</th>
              <th className="px-6 py-3.5 text-right text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6] bg-white">
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan={activeFields.length + 3} className="px-6 py-16 text-center text-[13px] text-[#6B7280] font-medium">
                  No records matching the filter.
                </td>
              </tr>
            ) : (
              filteredSubmissions.map(sub => (
                <tr key={sub.id} className="hover:bg-[#F9FAFB] transition-all group cursor-default">
                  <td className="px-6 py-4.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#6366F1] text-[10px] font-bold">
                        {getInitial(sub.profiles?.display_name, sub.profiles?.email)}
                      </div>
                      <span className="text-[12px] text-[#4B5563] font-semibold">
                        {sub.profiles?.display_name || sub.profiles?.email.split('@')[0]}
                      </span>
                    </div>
                  </td>
                  {activeFields.map(field => {
                    const value = sub.answers[field.id]
                    return (
                      <td key={field.id} className="px-6 py-4.5 text-[12px] text-[#4B5563] font-medium max-w-[220px]">
                        {value === null || value === undefined ? (
                          <span className="text-[#D1D5DB] italic">empty</span>
                        ) : field.field_type === 'DATE' ? (
                          formatDateToDMY(String(value))
                        ) : field.field_type === 'CURRENCY' ? (
                          `$${Number(value).toFixed(2)}`
                        ) : field.field_type === 'DROPDOWN' && field.select_type === 'multiple' && Array.isArray(value) ? (
                          <div className="flex flex-wrap gap-1">
                            {value.map((tag, idx) => {
                              const styles = getTagStyles(tag)
                              return (
                                <span 
                                  key={idx} 
                                  className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold border ${styles.bg} ${styles.text} ${styles.border} whitespace-nowrap`}
                                >
                                  {tag}
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="truncate block max-w-[200px]">{String(value)}</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-6 py-4.5 text-[12px] text-[#6B7280] font-medium whitespace-nowrap">
                    {new Date(sub.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/records/${formId}/add-record/${sub.id}`}
                        className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-[#9CA3AF] hover:text-[#6366F1] transition-all"
                        title="Edit entry row"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

