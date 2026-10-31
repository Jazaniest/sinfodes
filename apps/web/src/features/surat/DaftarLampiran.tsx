import { FileImage, FilePdf } from '@phosphor-icons/react'
import { bisaBukaBerkas, urlBerkasLampiran } from '@/api/berkas'
import { formatAngka } from '@/domain/format/angka'
import type { Permohonan } from '@/domain/surat/permohonan'
import { Tautan } from '@/ui/navigasi/Tautan'

/**
 * Berkas persyaratan dari layanan warga. Demo tidak menyimpan gambarnya, jadi hanya nama dan ukurannya; di server nyata setiap
 * lampiran bisa dibuka di tab baru (foto tampil, PDF diunduh).
 */
export function DaftarLampiran({ p }: { p: Pick<Permohonan, 'id' | 'kanal' | 'lampiran'> }) {
  if (p.kanal === 'loket') return <p className="text-tinta-2">Permohonan loket: berkas persyaratan diperiksa langsung di kantor desa.</p>
  if (p.lampiran.length === 0) return <p className="text-tinta-2">Tidak ada lampiran.</p>
  const bisaBuka = bisaBukaBerkas()
  return (
    <ul aria-label="Lampiran dari warga" className="flex flex-col gap-2">
      {p.lampiran.map((l) => (
        <li key={l.id} className="flex items-center gap-3 rounded-1 border border-garis bg-lembar px-3 py-2">
          {l.berkas.endsWith('.pdf') ? (
            <FilePdf aria-hidden size={20} className="shrink-0 text-tinta-2" />
          ) : (
            <FileImage aria-hidden size={20} className="shrink-0 text-tinta-2" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{l.syarat}</span>
            <span className="block truncate text-teks-kecil text-tinta-2">
              {l.berkas} · {formatAngka(l.ukuranKb)} KB
            </span>
          </span>
          {bisaBuka && (
            <Tautan href={urlBerkasLampiran(p.id, l.id)} target="_blank" rel="noopener noreferrer" aria-label={`Buka ${l.syarat}`} className="shrink-0 text-teks-kecil">
              Buka
            </Tautan>
          )}
        </li>
      ))}
    </ul>
  )
}
