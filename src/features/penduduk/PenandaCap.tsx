import type { PenandaPenduduk } from '@/domain/penduduk/penanda'
import { Cap } from '@/ui/cap/Cap'

export function PenandaCap({ penanda }: { penanda: readonly PenandaPenduduk[] }) {
  if (penanda.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1">
      {penanda.map((p) => (
        <Cap key={p} varian={p} />
      ))}
    </span>
  )
}
