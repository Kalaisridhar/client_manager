'use client'

import { useState } from 'react'
import { User, LogOut } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  userEmail?: string
  userName?: string
}

export default function Header({ userEmail, userName }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = userName ? userName.charAt(0).toUpperCase() : userEmail ? userEmail.charAt(0).toUpperCase() : 'U'
  const displayName = userName || userEmail || 'User'

  return (
    <header className="h-20 bg-white border-b border-[#F0F0F0] flex items-center justify-end px-12 z-40 shadow-[0_4px_24px_rgba(0,0,0,0.01)]">
      <div className="flex items-center gap-8">
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F9F9F9] transition-all relative"
          >
            <span className="material-symbols-outlined text-[#666666] text-[24px]">notifications</span>
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-white"></span>
          </button>
          
          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-[20px] shadow-2xl border border-[#F0F0F0] overflow-hidden z-[60] animate-in slide-in-from-top-2 duration-200">
              <div className="p-5 border-b border-[#F9F9F9] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#2D2D2D] text-[15px]">Notifications</h3>
                  <span className="bg-[#F5F3FF] text-[#6366F1] text-[10px] font-bold px-2 py-0.5 rounded-full">2</span>
                </div>
                <button className="text-[11px] font-bold text-[#6366F1] hover:underline">Mark all as read</button>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {[1, 2].map((i) => (
                  <div key={i} className="p-5 border-b border-[#F9F9F9] hover:bg-[#FAFAFA] transition-all cursor-pointer flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[#6366F1] text-[20px]">notifications_active</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#2D2D2D] leading-tight mb-1">New form submission received!</p>
                      <p className="text-[11px] text-[#999999]">{i} hour ago • System</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 py-2 px-3 rounded-[12px] hover:bg-[#F9F9F9] transition-all"
          >
            <span className="text-[14px] font-bold text-[#2D2D2D] hidden md:block">{displayName}</span>
            <div className="w-10 h-10 rounded-[12px] bg-[#6366F1] flex items-center justify-center text-white text-[15px] font-bold shadow-md shadow-indigo-100 overflow-hidden">
              {initial}
            </div>
            <span className="material-symbols-outlined text-[#999999] text-[18px]">expand_more</span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-[20px] shadow-2xl border border-[#F0F0F0] overflow-hidden z-[60] animate-in slide-in-from-top-2 duration-200">
              <div className="p-5 border-b border-[#F9F9F9]">
                <p className="text-[14px] font-bold text-[#2D2D2D] truncate">{displayName}</p>
                <p className="text-[11px] text-[#999999] truncate">{userEmail}</p>
              </div>
              <div className="p-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-[13px] font-bold text-[#666666] hover:bg-[#F9F9F9] hover:text-[#2D2D2D] transition-all">
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-[13px] font-bold text-[#EF4444] hover:bg-[#FEF2F2] transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
