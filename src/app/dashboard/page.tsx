import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      roles (
        role_name
      )
    `)
    .eq('user_id', user.id)
    .single()

  // @ts-ignore
  const userRole = roleData?.roles?.role_name || 'user'

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 lg:px-10">
      <div className="bg-white border border-[#F0F0F0] rounded-[20px] p-10 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <h1 className="text-[26px] font-bold text-[#1F2937] tracking-tight mb-2">
          Welcome to your Dashboard
        </h1>
        <p className="text-[14px] text-[#6B7280] font-medium mb-8">
          Logged in as <span className="text-[#6366F1] font-bold">{user.email}</span>
        </p>
        
        <div className="bg-[#F9FAFB] border border-[#F0F0F0] overflow-hidden rounded-[16px]">
          <div className="px-6 py-5 bg-white border-b border-[#F0F0F0] flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-[#1F2937]">System Access Control</h3>
              <p className="text-[11px] text-[#9CA3AF] font-medium mt-0.5">Your current permissions and module access</p>
            </div>
            <span className="px-3 py-1 bg-[#F5F3FF] text-[#6366F1] text-[10px] font-black uppercase tracking-widest rounded-full ring-1 ring-[#6366F1]/10">
              {userRole}
            </span>
          </div>
          <div className="p-6">
            {userRole === 'admin' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'Users', desc: 'Manage permissions', icon: 'group' },
                  { title: 'System', desc: 'Global settings', icon: 'settings' },
                  { title: 'Reports', desc: 'View analytics', icon: 'analytics' },
                ].map((item) => (
                  <div key={item.title} className="p-4 bg-white border border-[#F0F0F0] rounded-[12px] hover:border-[#6366F1]/20 hover:shadow-sm transition-all cursor-pointer group">
                    <span className="material-symbols-outlined text-[#9CA3AF] group-hover:text-[#6366F1] transition-colors mb-3">{item.icon}</span>
                    <h4 className="text-[13px] font-bold text-[#1F2937]">{item.title}</h4>
                    <p className="text-[11px] text-[#6B7280] mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {[
                  { title: 'Profile', desc: 'Personal settings', icon: 'person' },
                  { title: 'Standard', desc: 'Core features', icon: 'widgets' },
                ].map((item) => (
                  <div key={item.title} className="p-4 bg-white border border-[#F0F0F0] rounded-[12px] hover:border-[#6366F1]/20 hover:shadow-sm transition-all cursor-pointer group">
                    <span className="material-symbols-outlined text-[#9CA3AF] group-hover:text-[#6366F1] transition-colors mb-3">{item.icon}</span>
                    <h4 className="text-[13px] font-bold text-[#1F2937]">{item.title}</h4>
                    <p className="text-[11px] text-[#6B7280] mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
