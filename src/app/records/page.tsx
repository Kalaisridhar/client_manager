'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Form {
  id: string
  form_name: string
  form_description: string
  created_at: string
  profiles: {
    display_name: string | null
    email: string
  }
}

export default function RecordsListPage() {
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchPublishedForms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/forms')
      const data = await res.json()
      if (Array.isArray(data)) {
        // Filter only published forms
        setForms(data.filter((f: any) => f.status === 'Publish'))
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPublishedForms()
  }, [fetchPublishedForms])

  const filteredForms = forms.filter((form) =>
    form.form_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (form.form_description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  const getInitial = (name: string | null, email: string) => {
    if (name) return name.charAt(0).toUpperCase()
    return email.charAt(0).toUpperCase()
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 lg:px-10">
      {/* Page Heading */}
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-[#1F2937] tracking-tight">Records Hub</h1>
        <p className="mt-1.5 text-[#6B7280] text-[13px] font-medium leading-relaxed max-w-md">
          Access published forms, view response sheets, and insert new data records.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-[16px] border border-[#F0F0F0] p-4 flex gap-4 items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.02)] mb-6">
        <div className="relative flex-1 w-full max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-[#9CA3AF] text-[18px]">search</span>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2 border border-[#F0F0F0] rounded-[10px] bg-[#FAFAFA] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/5 focus:border-[#6366F1] text-[13px] font-medium transition-all"
            placeholder="Search active datasets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-[11px] text-[#9CA3AF] font-bold uppercase tracking-wider">
          {filteredForms.length} Active Forms
        </div>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#6366F1]"></div>
          <span className="text-[12px] text-[#6B7280] font-medium">Syncing datasets...</span>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white border border-[#F0F0F0] rounded-[16px] py-16 text-center shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <span className="material-symbols-outlined text-[#D1D5DB] text-[48px] mb-3">folder_off</span>
          <p className="text-[13px] text-[#6B7280] font-medium">No published forms available for data entry.</p>
          <p className="text-[11px] text-[#9CA3AF] mt-1">Publish forms from the Forms Management page to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form) => (
            <div 
              key={form.id}
              className="bg-white border border-[#F0F0F0] rounded-[16px] p-6 hover:border-[#6366F1]/30 hover:shadow-md transition-all flex flex-col justify-between group shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-[#6366F1] group-hover:bg-[#6366F1] group-hover:text-white transition-all duration-300">
                    <span className="material-symbols-outlined text-[18px]">table_chart</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest bg-[#ECFDF5] text-[#10B981]">
                    Active
                  </span>
                </div>

                <Link 
                  href={`/records/${form.id}`}
                  className="block text-[15px] font-bold text-[#1F2937] hover:text-[#6366F1] transition-colors leading-tight mb-2"
                >
                  {form.form_name}
                </Link>
                
                <p className="text-[12px] text-[#6B7280] font-medium line-clamp-2 mb-6">
                  {form.form_description || 'No description provided.'}
                </p>
              </div>

              <div className="border-t border-[#F9F9F9] pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#6366F1] text-[9px] font-bold">
                    {getInitial(form.profiles?.display_name, form.profiles?.email)}
                  </div>
                  <span className="text-[11px] text-[#6B7280] font-semibold">
                    {form.profiles?.display_name || form.profiles?.email.split('@')[0]}
                  </span>
                </div>
                <span className="text-[11px] text-[#9CA3AF] font-medium">
                  {new Date(form.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
