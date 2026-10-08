import { cn } from '../cn'

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block animate-pulse rounded-1 bg-kertas-2', className)} />
}

/** Baris kerangka untuk daftar yang sedang dimuat (SPEC §4.4). */
export function BarisKerangka({ jumlah = 5, label = 'Memuat data…' }: { jumlah?: number; label?: string }) {
  return (
    <div role="status" className="flex flex-col gap-3 py-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: jumlah }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
