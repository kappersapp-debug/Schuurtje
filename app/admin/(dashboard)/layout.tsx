import { getAdminSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminNav from './AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  if (!session) redirect('/admin')

  return (
    <div className="min-h-screen bg-[#0c0c0c] font-[family-name:var(--font-barlow)]">
      <AdminNav />
      <main className="max-w-4xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
