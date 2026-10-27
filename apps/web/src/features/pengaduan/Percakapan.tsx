import { Paperclip } from '@phosphor-icons/react'
import { formatAngka } from '@/domain/format/angka'
import { formatWaktuLog } from '@/domain/format/tanggal'
import type { EntriPengaduan } from '@/domain/pengaduan/schema'
import { cn } from '@/ui/cn'

/**
 * Percakapan pengaduan seperti berkas surat-menyurat (SPEC §8), bukan gelembung obrolan: pesan warga dan balasan desa
 * berurutan waktu, perubahan status sebagai catatan kecil di antaranya. Dipakai lagi oleh layanan warga (Tahap 4).
 */
export function Percakapan({ percakapan, pelapor }: { percakapan: readonly EntriPengaduan[]; pelapor: string }) {
  return (
    <ol aria-label="Percakapan" className="flex flex-col gap-4">
      {percakapan.map((e) =>
        e.jenis === 'status' ? (
          <li key={e.id} className="text-teks-kecil text-tinta-2">
            {e.status === 'selesai' ? 'Ditandai selesai' : 'Dibuka kembali'} oleh {e.oleh.nama} ·{' '}
            <time dateTime={e.waktu}>{formatWaktuLog(e.waktu)}</time>
          </li>
        ) : (
          <li key={e.id} className={cn('border-l-2 py-1 pl-4', e.jenis === 'desa' ? 'ml-6 border-biru' : 'border-garis')}>
            <p className="text-teks-kecil">
              <span className="font-medium">{e.jenis === 'desa' ? e.oleh.nama : pelapor}</span>
              <span className="text-tinta-2">
                {' '}
                · {e.jenis === 'desa' ? e.jabatan : 'Warga pelapor'} · <time dateTime={e.waktu}>{formatWaktuLog(e.waktu)}</time>
              </span>
            </p>
            <p className="mt-1 whitespace-pre-line">{e.isi}</p>
            {e.jenis === 'warga' && e.foto && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-teks-kecil text-tinta-2">
                <Paperclip aria-hidden size={14} />
                Foto: {e.foto.berkas} · {formatAngka(e.foto.ukuranKb)} KB
              </p>
            )}
          </li>
        ),
      )}
    </ol>
  )
}
