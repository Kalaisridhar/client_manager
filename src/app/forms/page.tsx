'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Form {
  id: string
  form_name: string
  form_description: string
  status: 'Draft' | 'Publish'
  created_at: string
  profiles: {
    display_name: string | null
    email: string
  }
}

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newFormName, setNewFormName] = useState('')
  const [newFormDesc, setNewFormDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const fetchForms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/forms')
      const data = await res.json()
      if (Array.isArray(data)) {
        setForms(data)
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const filteredForms = forms.filter((form) => {
    const matchesSearch = form.form_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (form.form_description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'Published' ? form.status === 'Publish' : form.status === statusFilter)
    return matchesSearch && matchesStatus
  })

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFormName.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_name: newFormName,
          form_description: newFormDesc,
        }),
      })

      if (res.ok) {
        const newForm = await res.json()
        router.push(`/forms/${newForm.id}/designer`)
      }
    } catch (error) {
      console.error('Error creating form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitial = (name: string | null, email: string) => {
    if (name) return name.charAt(0).toUpperCase()
    return email.charAt(0).toUpperCase()
  }

  const handleDeactivate = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Publish' ? 'Draft' : 'Publish'
    try {
      const res = await fetch(`/api/forms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchForms()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 lg:px-10">
      {/* Page Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-[26px] font-bold text-[#1F2937] tracking-tight">Forms Management</h1>
          <p className="mt-1.5 text-[#6B7280] text-[13px] font-medium leading-relaxed max-w-md">
            Configure and monitor your strategic feedback channels.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-6 md:mt-0 inline-flex items-center justify-center px-5 py-2.5 rounded-[12px] shadow-sm text-[13px] font-bold text-white bg-[#6366F1] hover:bg-[#4F46E5] transition-all transform active:scale-95"
        >
          <span className="material-symbols-outlined mr-2 text-[18px]">add_circle</span>
          Create New Form
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white rounded-[16px] border border-[#F0F0F0] p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.02)] mb-6">
        <div className="relative flex-1 w-full max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-[#9CA3AF] text-[18px]">search</span>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2 border border-[#F0F0F0] rounded-[10px] bg-[#FAFAFA] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/5 focus:border-[#6366F1] text-[13px] font-medium transition-all"
            placeholder="Search forms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="bg-[#F3F4F6] p-1 rounded-[10px] flex items-center">
            {['All', 'Draft', 'Published'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 text-[12px] font-bold rounded-[8px] transition-all ${
                  statusFilter === status
                    ? 'bg-white text-[#6366F1] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#374151]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-[#F0F0F0] rounded-[10px] text-[12px] font-bold text-[#6B7280] hover:bg-gray-50 transition-all">
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Advanced
          </button>
        </div>
      </div>

      {/* Crisp Table */}
      <div className="bg-white border border-[#F0F0F0] rounded-[16px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <table className="min-w-full">
          <thead className="bg-[#F9FAFB] border-b border-[#F0F0F0]">
            <tr>
              <th className="px-6 py-3.5 text-left text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Form Identity</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Briefing</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Originator</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Timeline</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Status</th>
              <th className="px-6 py-3.5 text-right text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em]">Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6366F1]"></div>
                    <span className="text-[12px] text-[#6B7280] font-medium">Syncing data...</span>
                  </div>
                </td>
              </tr>
            ) : filteredForms.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-[13px] text-[#6B7280] font-medium">
                  No forms found.
                </td>
              </tr>
            ) : (
              filteredForms.map((form) => (
                <tr key={form.id} className="hover:bg-[#F9FAFB] transition-all group cursor-default">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F9FAFB] border border-[#F0F0F0] flex items-center justify-center text-[#9CA3AF] group-hover:text-[#6366F1] group-hover:border-[#6366F1]/20 transition-all">
                        <span className="material-symbols-outlined text-[16px]">description</span>
                      </div>
                      <span className="text-[13px] font-bold text-[#1F2937] group-hover:text-[#6366F1] transition-colors">{form.form_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-[12px] text-[#6B7280] max-w-[240px] font-medium truncate">
                      {form.form_description || 'No briefing available.'}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#6366F1] text-[10px] font-bold ring-2 ring-white">
                        {getInitial(form.profiles?.display_name, form.profiles?.email)}
                      </div>
                      <span className="text-[12px] text-[#4B5563] font-semibold">{form.profiles?.display_name || form.profiles?.email?.split('@')[0]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-[12px] text-[#6B7280] font-medium">
                      {new Date(form.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest ${
                      form.status === 'Publish' 
                        ? 'bg-[#ECFDF5] text-[#10B981]' 
                        : 'bg-[#FFF9E5] text-[#D97706]'
                    }`}>
                      {form.status === 'Publish' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <Link
                        href={`/designer/${form.id}`}
                        className="px-3 py-1.5 bg-white border border-[#F0F0F0] rounded-[8px] text-[11px] font-bold text-[#6B7280] hover:bg-gray-50 flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit_note</span>
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeactivate(form.id, form.status)}
                        className={`px-3 py-1.5 rounded-[8px] text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                          form.status === 'Publish' 
                            ? 'bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEE2E2]' 
                            : 'bg-[#ECFDF5] text-[#10B981] hover:bg-[#D1FAE5]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">{form.status === 'Publish' ? 'block' : 'check_circle'}</span>
                        {form.status === 'Publish' ? 'Deactivate' : 'Publish'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="mt-6 flex items-center justify-between px-2">
        <span className="text-[11px] text-[#9CA3AF] font-bold">Showing {filteredForms.length} records</span>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-lg border border-[#F0F0F0] flex items-center justify-center text-[#9CA3AF] hover:bg-white hover:text-[#1F2937] hover:shadow-sm transition-all">
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          <button className="w-8 h-8 rounded-lg border border-[#F0F0F0] flex items-center justify-center text-[#9CA3AF] hover:bg-white hover:text-[#1F2937] hover:shadow-sm transition-all">
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Form Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
          <div className="absolute inset-0 bg-[#1F2937]/30 backdrop-blur-[2px] transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleCreateForm} className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#6366F1] text-[20px]">add_task</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#1F2937]">New Form Configuration</h3>
                  <p className="text-[11px] text-[#6B7280] font-medium">Initialize a new strategic data point.</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-0.5 tracking-wider">Form Name *</label>
                  <input
                    type="text"
                    id="name"
                    className="w-full px-4 py-2 border border-[#F0F0F0] rounded-[10px] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/5 focus:border-[#6366F1] text-[13px] font-medium transition-all"
                    placeholder="e.g. Patient Feedback Survey"
                    value={newFormName}
                    onChange={(e) => setNewFormName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="desc" className="block text-[10px] font-bold text-[#9CA3AF] uppercase mb-1.5 ml-0.5 tracking-wider">Briefing Note</label>
                  <textarea
                    id="desc"
                    rows={3}
                    className="w-full px-4 py-2 border border-[#F0F0F0] rounded-[10px] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/5 focus:border-[#6366F1] text-[13px] font-medium transition-all resize-none"
                    placeholder="Briefly describe the purpose..."
                    value={newFormDesc}
                    onChange={(e) => setNewFormDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 text-[12px] font-bold text-[#6B7280] bg-[#F9FAFB] rounded-[10px] hover:bg-[#F3F4F6] transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-[12px] font-bold text-white bg-[#6366F1] rounded-[10px] hover:bg-[#4F46E5] shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Configuring...' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
