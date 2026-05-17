'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface FieldOption {
  id: string
  option_name: string
  status: number
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
  column1: string[] // Array of field IDs
  column2: string[] // Array of field IDs
}

interface Form {
  id: string
  form_name: string
  form_description: string
  form_columns: FormStructure | null
  status: string
}

export default function FormDesigner({ params }: { params: Promise<{ id: string }> }) {
  const { id: formId } = use(params)
  const [form, setForm] = useState<Form | null>(null)
  const [existingFields, setExistingFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeColumn, setActiveColumn] = useState<'column1' | 'column2' | null>(null)
  const [editingField, setEditingField] = useState<Field | null>(null)
  const [showFieldCreator, setShowFieldCreator] = useState(false)
  const [newField, setNewField] = useState({
    field_name: '',
    field_label: '',
    field_type: 'TEXT' as Field['field_type'],
    is_required: false,
    select_type: 'single' as 'single' | 'multiple',
    options: ''
  })

  const [columns, setColumns] = useState<FormStructure>({
    column1: [],
    column2: []
  })

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
      if (formData.form_columns) {
        setColumns(formData.form_columns)
      }
      setExistingFields(fieldsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [formId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async (publish: boolean = false) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_columns: columns,
          status: publish ? 'Publish' : (form?.status || 'Draft')
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setForm(updated)
      }
    } catch (error) {
      console.error('Error saving form:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateOrUpdateField = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newField.field_name || !newField.field_label) return

    try {
      const url = editingField ? `/api/fields/${editingField.id}` : '/api/fields'
      const method = editingField ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newField),
      })
      
      if (res.ok) {
        const field = await res.json()
        
        if (editingField) {
          setExistingFields(prev => prev.map(f => f.id === field.id ? field : f))
          setEditingField(null)
        } else {
          setExistingFields([field, ...existingFields])
          
          if (activeColumn) {
            setColumns(prev => ({
              ...prev,
              [activeColumn]: [...prev[activeColumn], field.id]
            }))
          }
        }
        
        setShowFieldCreator(false)
        setNewField({
          field_name: '',
          field_label: '',
          field_type: 'TEXT',
          is_required: false,
          select_type: 'single',
          options: ''
        })
      }
    } catch (error) {
      console.error('Error saving field:', error)
    }
  }

  const addExistingField = (fieldId: string) => {
    if (!activeColumn) return
    if (columns.column1.includes(fieldId) || columns.column2.includes(fieldId)) return
    setColumns(prev => ({
      ...prev,
      [activeColumn]: [...prev[activeColumn], fieldId]
    }))
    setActiveColumn(null)
  }

  const removeField = (col: 'column1' | 'column2', index: number) => {
    setColumns(prev => {
      const newCol = [...prev[col]]
      newCol.splice(index, 1)
      return { ...prev, [col]: newCol }
    })
  }

  const getFieldById = (id: string) => existingFields.find(f => f.id === id)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6366F1]"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#F9FAFB]">
      {/* Workspace Header */}
      <div className="bg-white border-b border-[#F0F0F0] px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-5">
          <Link href="/forms" className="w-9 h-9 flex items-center justify-center hover:bg-[#F9F9F9] rounded-[10px] border border-[#F0F0F0] transition-all">
            <span className="material-symbols-outlined text-[#6B7280] text-[20px]">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-[16px] font-bold text-[#1F2937]">{form?.form_name}</h1>
            <p className="text-[11px] text-[#9CA3AF] font-bold uppercase tracking-wider mt-0.5">Form Designer • {form?.status}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 text-[12px] font-bold text-[#6B7280] bg-white border border-[#F0F0F0] rounded-[10px] hover:bg-gray-50 flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-4 py-2 text-[12px] font-bold text-white bg-[#6366F1] rounded-[10px] hover:bg-[#4F46E5] flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
            Publish Form
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Designer Sidebar */}
        <div className="w-[300px] bg-white border-r border-[#F0F0F0] flex flex-col">
          <div className="p-6 border-b border-[#F9F9F9]">
            <button
              onClick={() => {
                if (editingField) {
                  setEditingField(null)
                  setNewField({
                    field_name: '',
                    field_label: '',
                    field_type: 'TEXT',
                    is_required: false,
                    select_type: 'single',
                    options: ''
                  })
                } else {
                  setShowFieldCreator(!showFieldCreator)
                }
              }}
              className="w-full py-2.5 bg-[#F5F3FF] text-[#6366F1] rounded-[10px] text-[12px] font-bold hover:bg-[#EDE9FE] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showFieldCreator || editingField ? 'close' : 'add_circle'}
              </span>
              {showFieldCreator || editingField ? 'Cancel' : 'Create New Field'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {showFieldCreator || editingField ? (
              <form onSubmit={handleCreateOrUpdateField} className="space-y-5 animate-in fade-in duration-300">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest ml-0.5">
                    {editingField ? 'Edit Field' : 'New Field Configuration'}
                  </h3>
                  <div>
                    <label className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-0.5 tracking-wider">Internal Field Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#F0F0F0] rounded-[8px] text-[12px] font-medium outline-none focus:border-[#6366F1] transition-all"
                      placeholder="e.g. first_name"
                      value={newField.field_name}
                      onChange={e => setNewField({...newField, field_name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-0.5 tracking-wider">Field Label</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#F0F0F0] rounded-[8px] text-[12px] font-medium outline-none focus:border-[#6366F1] transition-all"
                      placeholder="e.g. First Name"
                      value={newField.field_label}
                      onChange={e => setNewField({...newField, field_label: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-0.5 tracking-wider">Field Type</label>
                    <select
                      className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#F0F0F0] rounded-[8px] text-[12px] font-bold text-[#4B5563] outline-none appearance-none"
                      value={newField.field_type}
                      onChange={e => setNewField({...newField, field_type: e.target.value as Field['field_type']})}
                    >
                      {['TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'CURRENCY', 'TEXTAREA'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {newField.field_type === 'DROPDOWN' && (
                    <div className="space-y-3.5 animate-in zoom-in duration-200">
                      <div>
                        <label className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-0.5 tracking-wider">Options (CSV)</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#F0F0F0] rounded-[8px] text-[12px] font-medium outline-none transition-all"
                          placeholder="Option 1, Option 2..."
                          value={newField.options}
                          onChange={e => setNewField({...newField, options: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-0.5 tracking-wider">Selection Type</label>
                        <select
                          className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#F0F0F0] rounded-[8px] text-[12px] font-bold text-[#4B5563] outline-none"
                          value={newField.select_type || 'single'}
                          onChange={e => setNewField({...newField, select_type: e.target.value as any})}
                        >
                          <option value="single">Single Select</option>
                          <option value="multiple">Multiple Select</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[12px] font-bold text-[#6B7280]">Is Required?</span>
                    <button
                      type="button"
                      onClick={() => setNewField({...newField, is_required: !newField.is_required})}
                      className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors ${newField.is_required ? 'bg-[#6366F1]' : 'bg-[#E5E7EB]'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${newField.is_required ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#1F2937] text-white rounded-[8px] text-[12px] font-bold hover:bg-black transition-all"
                  >
                    {editingField ? 'Update Field' : 'Add to Library'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest ml-0.5">Field Library</h3>
                <div className="grid grid-cols-1 gap-3">
                  {existingFields.map(field => (
                    <div 
                      key={field.id}
                      className="p-3 border border-[#F0F0F0] rounded-[10px] bg-white hover:border-[#6366F1] hover:shadow-sm transition-all group cursor-pointer"
                      onClick={() => activeColumn ? addExistingField(field.id) : null}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[12px] font-bold text-[#1F2937] truncate max-w-[150px]">{field.field_label}</p>
                          <p className="text-[9px] text-[#9CA3AF] font-bold uppercase tracking-wider mt-0.5">{field.field_type}</p>
                        </div>
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setEditingField(field)
                              setNewField({
                                field_name: field.field_name,
                                field_label: field.field_label,
                                field_type: field.field_type,
                                is_required: field.is_required,
                                select_type: field.select_type || 'single',
                                options: field.field_options?.map(o => o.option_name).join(', ') || ''
                              })
                            }}
                            className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-[#9CA3AF] hover:text-[#6366F1] transition-all"
                            title="Edit field definition"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          {activeColumn && (
                            <button
                              onClick={() => addExistingField(field.id)}
                              className="w-7 h-7 rounded-md hover:bg-indigo-50 flex items-center justify-center text-[#6366F1] transition-all"
                              title="Add to selected column"
                            >
                              <span className="material-symbols-outlined text-[18px]">add_circle</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Designer Canvas */}
        <div className="flex-1 overflow-y-auto p-12">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-8 min-h-[600px]">
              {(['column1', 'column2'] as const).map(colKey => (
                <div 
                  key={colKey}
                  className={`flex flex-col gap-4 p-6 rounded-[20px] border border-[#F0F0F0] transition-all ${
                    activeColumn === colKey ? 'bg-[#F5F3FF]/50 border-[#6366F1]/30 ring-4 ring-[#6366F1]/5' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">{colKey === 'column1' ? 'Left Column' : 'Right Column'}</span>
                  </div>

                  {columns[colKey].map((fieldId, index) => {
                    const field = getFieldById(fieldId)
                    if (!field) return null
                    return (
                      <div key={`${colKey}-${fieldId}-${index}`} className="relative group bg-white border border-[#F0F0F0] rounded-[12px] p-4 hover:border-[#6366F1]/20 hover:shadow-md transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                        <button 
                          onClick={() => removeField(colKey, index)}
                          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                        
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-[#E5E7EB] mt-0.5 cursor-grab">drag_indicator</span>
                          <div className="flex-1 pr-6">
                            <label className="block text-[12px] font-bold text-[#374151] mb-2">
                              {field.field_label}
                              {field.is_required && <span className="text-[#EF4444] ml-1">*</span>}
                            </label>
                            
                            <div className="w-full h-8 bg-[#F9FAFB] rounded-[6px] border border-[#F0F0F0] flex items-center px-3 text-[11px] text-[#9CA3AF] font-medium italic">
                              Live Preview: {field.field_type}{field.field_type === 'DROPDOWN' ? ` (${field.select_type || 'single'})` : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <button 
                    onClick={() => setActiveColumn(activeColumn === colKey ? null : colKey)}
                    className={`mt-2 py-4 border-2 border-dashed rounded-[14px] flex flex-col items-center justify-center gap-1.5 transition-all ${
                      activeColumn === colKey 
                        ? 'bg-white border-[#6366F1] text-[#6366F1] shadow-lg shadow-indigo-100' 
                        : 'border-[#F3F4F6] text-[#9CA3AF] hover:border-[#6366F1]/30 hover:bg-white hover:text-[#6366F1]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {activeColumn === colKey ? 'grid_view' : 'add_circle'}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">{activeColumn === colKey ? 'Select from library' : 'Add Field'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
