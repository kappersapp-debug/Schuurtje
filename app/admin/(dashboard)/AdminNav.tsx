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
    <nav className="bg-[#0e0e0e] border-b border-[#1e1e1e] sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 flex items-center h-14 gap-6">
        <div className="flex items-center gap-2">
          <span className="text-[#2176d4] text-lg">✂</span>
          <span className="font-[family-name:var(--font-bebas)] tracking-widest text-white text-lg">Schuurtje</span>
          <span className="text-gray-700 text-sm font-medium">/ Admin</span>
        </div>
        <Link href="/admin/kappers" className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">
          Kappers
        </Link>
        <Link href="/admin/reviews" className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">
          Reviews
        </Link>
        <button onClick={uitloggen}
          className="ml-auto text-xs font-bold text-gray-600 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-400/10">
          Uitloggen
        </button>
      </div>
    </nav>
  )
}
