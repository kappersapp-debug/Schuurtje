import { getKapperSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PortaalNav from './PortaalNav'

export default async function PortaalLayout({ children }: { children: React.ReactNode }) {
  const session = await getKapperSession()
  if (!session) redirect('/portaal')

  return (
    <div className="min-h-screen flex flex-col">
      <PortaalNav naam={session.naam} slug={session.slug} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
