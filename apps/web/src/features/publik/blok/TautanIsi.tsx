import type { ReactNode } from 'react'
import { Tautan } from '@/ui/navigasi/Tautan'

/**
 * Tautan isi blok (SPEC-V0.2 11.4): alamat halaman (diawali `/`) memakai tautan dalam aplikasi; alamat web dibuka di tab
 * baru dengan penanda untuk pembaca layar.
 */
export function TautanIsi({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  if (href.startsWith('/')) return <Tautan href={href} className={className}>{children}</Tautan>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (membuka situs lain)</span>
    </a>
  )
}
