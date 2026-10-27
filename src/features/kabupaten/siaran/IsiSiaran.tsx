import { Paperclip } from '@phosphor-icons/react'
import { formatUkuranKb } from '@/domain/format/angka'
import type { LampiranSiaran } from '@/domain/kabupaten/siaran'

/**
 * Isi siaran sebagai teks biasa: paragraf dipisah baris kosong, baris tunggal dipertahankan. Tidak pernah dirender sebagai
 * HTML (keputusan rencana 7B-3), jadi markup dari isian tampil apa adanya. Dipakai di dasbor kabupaten dan panel desa.
 */
export function IsiSiaran({ isi, lampiran }: { isi: string; lampiran: LampiranSiaran | null }) {
  return (
    <div className="flex max-w-prose flex-col gap-4">
      <article aria-label="Isi siaran" className="flex flex-col gap-3">
        {isi.split(/\n\s*\n/).map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </article>
      {lampiran && (
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 border border-garis bg-lembar px-3 py-2">
            <Paperclip aria-hidden size={18} className="shrink-0 text-tinta-2" />
            <span className="min-w-0 truncate">{`${lampiran.berkas} · ${formatUkuranKb(lampiran.ukuranKb)}`}</span>
          </p>
          <p className="text-teks-kecil text-tinta-2">Demo hanya menyimpan nama dan ukuran berkasnya.</p>
        </div>
      )}
    </div>
  )
}
