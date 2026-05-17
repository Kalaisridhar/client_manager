'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
  { name: 'Forms', icon: 'description', href: '/forms' },
  { name: 'Records', icon: 'folder_open', href: '/records' },
]

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside className={`bg-white border-r border-[#F0F0F0] flex flex-col transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${isCollapsed ? 'w-20' : 'w-[260px]'}`}>
      {/* Logo Section */}
      <div className="h-20 flex items-center px-8 border-b border-[#F9F9F9]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-100">
            M
          </div>
          {!isCollapsed && <span className="font-bold text-[22px] text-[#2D2D2D] tracking-tight">MyApp</span>}
        </Link>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-[12px] transition-all group ${isActive
                  ? 'bg-[#F5F3FF] text-[#6366F1] shadow-sm'
                  : 'text-[#666666] hover:bg-[#F9F9F9] hover:text-[#2D2D2D]'
                }`}
            >
              <span className={`material-symbols-outlined text-[22px] ${isActive ? 'text-[#6366F1]' : 'text-[#999999] group-hover:text-[#2D2D2D]'}`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className={`text-[14px] font-bold ${isActive ? 'text-[#6366F1]' : ''}`}>
                  {item.name}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-4 flex items-center justify-center text-[#999999] hover:text-[#2D2D2D] transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">
          {isCollapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>
    </aside>
  )
}
