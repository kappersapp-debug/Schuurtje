'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminNav() {
  const router = useRouter()

  async function uitloggen() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
  }

  return (
    <nav className="border-b border-zinc-200 bg-white sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 flex items-center h-14 gap-4">
        <span className="font-bold text-sm">Schuurtje Admin</span>
        <Link href="/admin/kappers" className="text-sm text-zinc-600 hover:text-zinc-900">Kappers</Link>
        <button onClick={uitloggen} className="ml-auto text-xs text-zinc-400 hover:text-zinc-600">Uitloggen</button>
      </div>
    </nav>
  )
}
