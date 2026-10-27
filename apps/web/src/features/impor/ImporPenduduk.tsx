import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { konfirmasiImpor } from '@/api/impor'
import { segarkanKependudukan } from '@/api/segarkan'
import type { Pemetaan } from '@/domain/impor/kolom'
import type { NilaiBaris } from '@/domain/impor/periksa'
import type { HasilImpor, LaporanImpor } from '@/domain/impor/schema'
import { useBoleh } from '@/features/admin/useBoleh'
import { Stepper } from '@/ui/navigasi/Stepper'
import { tampilkanToast } from '@/ui/toast/antrean'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { LangkahCocokkan } from './LangkahCocokkan'
import { LangkahHasil } from './LangkahHasil'
import { LangkahPeriksa } from './LangkahPeriksa'
import { LangkahUnggah } from './LangkahUnggah'

type Periksa = {
  langkah: 'periksa'
  laporan: LaporanImpor
  pemetaan: Pemetaan
  perbaikan: Record<string, NilaiBaris>
  lewati: number[]
  galatServer: Record<string, string>
}
type Tahap =
  | { langkah: 'unggah' }
  | { langkah: 'cocokkan'; laporan: LaporanImpor; pemetaan: Pemetaan }
  | Periksa
  | { langkah: 'hasil'; laporan: LaporanImpor; hasil: HasilImpor }

const LANGKAH = [
  { id: 'unggah', label: 'Unggah berkas' },
  { id: 'cocokkan', label: 'Cocokkan kolom' },
  { id: 'periksa', label: 'Periksa hasil' },
  { id: 'hasil', label: 'Impor' },
]

type Props = { onKotor?: (kotor: boolean) => void; onLihatDaftar: () => void; sekarang?: Date }

/** Impor penduduk dari Excel dalam empat langkah (SPEC §6.8). Data baru tersimpan di langkah terakhir. */
export function ImporPenduduk({ onKotor, onLihatDaftar, sekarang }: Props) {
  const { dusun } = useSesiAdmin()
  const boleh = useBoleh()
  const queryClient = useQueryClient()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const [tahap, setTahap] = useState<Tahap>({ langkah: 'unggah' })
  const kotor = tahap.langkah === 'cocokkan' || tahap.langkah === 'periksa'

  useEffect(() => {
    onKotor?.(kotor)
  }, [kotor, onKotor])

  const impor = useMutation({
    mutationFn: (t: Periksa) => konfirmasiImpor(t.laporan.id, { pemetaan: [...t.pemetaan], perbaikan: t.perbaikan, lewati: t.lewati }),
    onSuccess: (hasil, t) => {
      void segarkanKependudukan(queryClient)
      setTahap({ langkah: 'hasil', laporan: t.laporan, hasil })
    },
    onError: (galat, t) => {
      tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' })
      // Server memeriksa ulang dengan data terbaru; baris yang ditolaknya ditandai supaya bisa diperbaiki atau dilewati.
      if (galat instanceof GalatApi && galat.kode === 'VALIDATION') {
        const galatServer = Object.fromEntries(
          Object.entries(galat.fields).flatMap(([kunci, pesan]) => {
            const cocok = /^baris\.(\d+)$/.exec(kunci)
            return cocok ? [[cocok[1], pesan]] : []
          }),
        )
        setTahap({ ...t, galatServer })
      }
    },
  })

  // Setiap penduduk dicatat dengan dusun, RW, dan RT-nya: desa baru menyusun wilayahnya dulu (tahap 6C).
  if (dusun.length === 0) {
    return (
      <EmptyState
        judul="Atur wilayah desa dulu"
        keterangan="Setiap penduduk dicatat dengan dusun, RW, dan RT-nya, dan desa ini belum punya dusun. Tambahkan dusun, RW, dan RT di Pengaturan › Wilayah, lalu kembali ke sini."
        aksi={
          boleh('pengaturan.kelola') && (
            <TautanTombol href="/admin/pengaturan/wilayah" varian="utama">
              Buka Pengaturan › Wilayah
            </TautanTombol>
          )
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Stepper label="Langkah impor" langkah={LANGKAH} aktif={tahap.langkah} />
      {tahap.langkah === 'unggah' && (
        <LangkahUnggah onTerbaca={(laporan) => setTahap({ langkah: 'cocokkan', laporan, pemetaan: laporan.kolom.map((k) => k.field) })} />
      )}
      {tahap.langkah === 'cocokkan' && (
        <LangkahCocokkan
          laporan={tahap.laporan}
          pemetaan={tahap.pemetaan}
          onUbah={(pemetaan) => setTahap({ ...tahap, pemetaan })}
          onKembali={() => setTahap({ langkah: 'unggah' })}
          onLanjut={() =>
            setTahap({ langkah: 'periksa', laporan: tahap.laporan, pemetaan: tahap.pemetaan, perbaikan: {}, lewati: [], galatServer: {} })
          }
        />
      )}
      {tahap.langkah === 'periksa' && (
        <LangkahPeriksa
          laporan={tahap.laporan}
          pilihan={tahap}
          galatServer={tahap.galatServer}
          memuat={impor.isPending}
          hariIni={hariIni}
          onUbah={(ubah) => setTahap({ ...tahap, ...ubah })}
          onKembali={() => setTahap({ langkah: 'cocokkan', laporan: tahap.laporan, pemetaan: tahap.pemetaan })}
          onImpor={() => impor.mutate(tahap)}
        />
      )}
      {tahap.langkah === 'hasil' && (
        <LangkahHasil laporan={tahap.laporan} hasil={tahap.hasil} onLihatDaftar={onLihatDaftar} onUlang={() => setTahap({ langkah: 'unggah' })} />
      )}
    </div>
  )
}
