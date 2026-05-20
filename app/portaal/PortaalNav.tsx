'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const links = [
  { href: '/portaal/dashboard', label: 'Dashboard' },
  { href: '/portaal/agenda', label: 'Agenda' },
  { href: '/portaal/afspraken', label: 'Afspraken' },
  { href: '/portaal/klanten', label: 'Klanten' },
  { href: '/portaal/wachtlijst', label: 'Wachtlijst' },
  { href: '/portaal/instellingen', label: 'Instellingen' },
]

export default function PortaalNav({ naam, slug }: { naam: string; slug: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function uitloggen() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/portaal')
  }

  return (
    <nav className="border-b border-zinc-200 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 h-14 overflow-x-auto">
        <span className="font-semibold text-sm mr-3 whitespace-nowrap">{naam}</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              pathname.startsWith(l.href)
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {l.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/${slug}`} target="_blank" className="text-xs text-zinc-400 hover:text-zinc-600 whitespace-nowrap">
            Boekingspagina
          </Link>
          <button onClick={uitloggen} className="text-xs text-zinc-400 hover:text-zinc-600 whitespace-nowrap">
            Uitloggen
          </button>
        </div>
      </div>
    </nav>
  )
}
