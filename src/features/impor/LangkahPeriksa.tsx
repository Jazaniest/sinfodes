import { useState } from 'react'
import { ProgressBar } from 'react-aria-components'
import { formatAngka } from '@/domain/format/angka'
import { kalimatPeriksa, periksaImpor, type HasilBaris, type NilaiBaris, type PilihanImpor } from '@/domain/impor/periksa'
import type { LaporanImpor } from '@/domain/impor/schema'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import { cn } from '@/ui/cn'
import { Tombol } from '@/ui/tombol/Tombol'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { DialogPerbaiki } from './DialogPerbaiki'

export type UbahPeriksa = { perbaikan?: Record<string, NilaiBaris>; lewati?: number[]; galatServer?: Record<string, string> }

type Props = {
  laporan: LaporanImpor
  pilihan: PilihanImpor
  /** Pesan penolakan dari server per nomor baris (konfirmasi yang ditolak). */
  galatServer: Readonly<Record<string, string>>
  memuat: boolean
  hariIni: Date
  onUbah: (ubah: UbahPeriksa) => void
  onKembali: () => void
  onImpor: () => void
}

const sel = 'px-3 py-2 align-top'

/** Langkah 3 impor (SPEC §6.8): ringkasan pemeriksaan; baris bermasalah diperbaiki atau dilewati. */
export function LangkahPeriksa({ laporan, pilihan, galatServer, memuat, hariIni, onUbah, onKembali, onImpor }: Props) {
  const { desa, dusun } = useSesiAdmin()
  const [diperbaiki, setDiperbaiki] = useState<number | null>(null)
  const hasil = periksaImpor(laporan, pilihan, { hariIni, dusun, istilah: desa.istilahWilayah })
  // Baris yang ditolak server tetap bermasalah sampai diperbaiki atau dilewati.
  const pesanServer = (b: HasilBaris) => (b.dilewati ? undefined : galatServer[String(b.nomor)])
  const bermasalah = hasil.baris.filter((b) => !b.dilewati && (b.masalah.length > 0 || pesanServer(b)))
  const ditampilkan = hasil.baris.filter((b) => b.dilewati || b.masalah.length > 0 || b.peringatan.length > 0 || pesanServer(b))
  const siap = hasil.baris.filter((b) => b.siap && !pesanServer(b)).length
  const berperingatan = hasil.baris.filter((b) => b.siap && b.peringatan.length > 0).length
  const barisDialog = hasil.baris.find((b) => b.nomor === diperbaiki)
  const lewati = (nomor: number, ya: boolean) =>
    onUbah({ lewati: ya ? [...pilihan.lewati, nomor] : pilihan.lewati.filter((n) => n !== nomor) })

  const simpanPerbaikan = (nomor: number, nilai: NilaiBaris) => {
    const kunci = String(nomor)
    onUbah({
      perbaikan: { ...pilihan.perbaikan, [kunci]: { ...pilihan.perbaikan[kunci], ...nilai } },
      galatServer: Object.fromEntries(Object.entries(galatServer).filter(([k]) => k !== kunci)),
    })
    setDiperbaiki(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="font-serif text-judul-bagian font-medium">{kalimatPeriksa(hasil)}</p>
        {berperingatan > 0 && (
          <p className="text-teks-kecil text-tinta-2">
            {formatAngka(berperingatan)} baris berperingatan tetap bisa diimpor; datanya bisa diperbaiki nanti lewat Ubah.
          </p>
        )}
      </div>
      {ditampilkan.length > 0 && (
        <div className="overflow-x-auto border-y border-garis bg-lembar">
          <table className="w-full text-teks">
            <caption className="sr-only">Baris yang perlu diperhatikan</caption>
            <thead>
              <tr className="border-b border-garis text-left text-label text-tinta-2 uppercase">
                <th scope="col" className={cn(sel, 'font-medium')}>Baris</th>
                <th scope="col" className={cn(sel, 'font-medium')}>Nama</th>
                <th scope="col" className={cn(sel, 'font-medium')}>NIK</th>
                <th scope="col" className={cn(sel, 'font-medium')}>Masalah</th>
                <th scope="col" className={cn(sel, 'text-right font-medium')}>
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ditampilkan.map((b) => {
                const server = pesanServer(b)
                const perlu = b.masalah.length > 0 || Boolean(server)
                return (
                  <tr key={b.nomor} className={cn('border-b border-garis last:border-b-0', b.dilewati && 'text-tinta-3')}>
                    <td className={cn(sel, 'font-mono tabular-nums')}>{b.nomor}</td>
                    <td className={sel}>{b.nilai.nama || '—'}</td>
                    <td className={cn(sel, 'font-mono whitespace-nowrap tabular-nums')}>
                      {b.nilai.nik ? kelompokkanNik(b.nilai.nik.replace(/\D/g, '')) : '—'}
                    </td>
                    <td className={sel}>
                      {b.dilewati ? (
                        'Dilewati'
                      ) : (
                        <ul className="flex flex-col gap-0.5">
                          {b.masalah.map((m) => (
                            <li key={`${m.jenis}-${m.field}`} className="text-merah">
                              {m.pesan}
                            </li>
                          ))}
                          {server && <li className="text-merah">{server}</li>}
                          {b.peringatan.map((p) => (
                            <li key={p} className="text-oker">
                              Peringatan: {p}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className={sel}>
                      <div className="flex flex-wrap justify-end gap-1">
                        {!b.dilewati && perlu && (
                          <Tombol ukuran="kecil" aria-label={`Perbaiki baris ${b.nomor}`} onPress={() => setDiperbaiki(b.nomor)}>
                            Perbaiki
                          </Tombol>
                        )}
                        {(b.dilewati || perlu) && (
                          <Tombol
                            ukuran="kecil"
                            varian="teks"
                            aria-label={`${b.dilewati ? 'Batal lewati' : 'Lewati'} baris ${b.nomor}`}
                            onPress={() => lewati(b.nomor, !b.dilewati)}
                          >
                            {b.dilewati ? 'Batal lewati' : 'Lewati'}
                          </Tombol>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {memuat ? (
        <ProgressBar isIndeterminate aria-label={`Mengimpor ${formatAngka(siap)} baris`} className="flex flex-col gap-2">
          <p className="text-teks-kecil text-tinta-2">Mengimpor {formatAngka(siap)} baris…</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-kertas-2">
            <div className="h-full w-1/3 bg-biru motion-safe:animate-pulse" />
          </div>
        </ProgressBar>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-garis pt-4">
          {bermasalah.length > 0 && (
            <p className="mr-auto text-teks-kecil text-tinta-2">
              Perbaiki atau lewati {formatAngka(bermasalah.length)} baris bermasalah dulu.
            </p>
          )}
          {bermasalah.length > 0 && (
            <Tombol onPress={() => onUbah({ lewati: [...pilihan.lewati, ...bermasalah.map((b) => b.nomor)] })}>
              Lewati semua yang bermasalah
            </Tombol>
          )}
          <Tombol onPress={onKembali}>Kembali</Tombol>
          <Tombol varian="utama" isDisabled={bermasalah.length > 0 || siap === 0} onPress={onImpor}>
            Impor {formatAngka(siap)} baris
          </Tombol>
        </div>
      )}
      {barisDialog && (
        <DialogPerbaiki
          baris={barisDialog}
          pesanServer={pesanServer(barisDialog)}
          onTutup={() => setDiperbaiki(null)}
          onSimpan={(nilai) => simpanPerbaikan(barisDialog.nomor, nilai)}
        />
      )}
    </div>
  )
}
