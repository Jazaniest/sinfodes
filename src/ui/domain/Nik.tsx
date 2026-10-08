import { Copy } from '@phosphor-icons/react'
import { Button } from 'react-aria-components'
import { artiNik, kelompokkanNik, periksaNik } from '@/domain/penduduk/nik'
import { Cap } from '../cap/Cap'
import { cn } from '../cn'
import { tampilkanToast } from '../toast/antrean'
import { Tooltip } from '../tooltip/Tooltip'

/** NIK per makna: wilayah · tanggal lahir · nomor urut (SPEC §4.5). Disalin tanpa spasi. */
export function Nik({ nik, salin = false, className }: { nik: string | null; salin?: boolean; className?: string }) {
  if (nik === null) return <Cap varian="belum-ada-nik" />
  const hasil = periksaNik(nik)
  const salinNik = () => {
    void navigator.clipboard?.writeText(nik).then(() => tampilkanToast({ pesan: 'NIK disalin', nada: 'berhasil' }))
  }
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span
        title={hasil.status === 'valid' ? artiNik(hasil) : undefined}
        className="inline-flex gap-[0.35em] font-mono text-teks-kecil tabular-nums"
      >
        {kelompokkanNik(nik)
          .split(' ')
          .map((bagian, i) => (
            <span key={i}>{bagian}</span>
          ))}
      </span>
      {salin && (
        <Tooltip isi="Salin NIK">
          <Button
            aria-label="Salin NIK"
            onPress={salinNik}
            className="rounded-1 p-0.5 text-tinta-2 outline-none hover:text-tinta data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru"
          >
            <Copy size={14} />
          </Button>
        </Tooltip>
      )}
    </span>
  )
}
