import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiLaporanPerbaikan, terapkanLaporan } from '@/api/laporan'
import { segarkanKependudukan } from '@/api/segarkan'
import { formatWaktuRelatif } from '@/domain/format/tanggal'
import { kalimatPerbaikan, type LaporanData } from '@/domain/laporan/schema'
import { teksNilaiRiwayat } from '@/domain/penduduk/perubahan'
import { LABEL_FIELD } from '@/domain/penduduk/riwayat'
import type { Penduduk } from '@/domain/penduduk/schema'
import { boleh } from '@/domain/pengguna/hak-akses'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { DialogTolakLaporan } from './DialogTolakLaporan'

/** Laporan perbaikan dari warga, sebagai banner di atas lembar profil penduduk (SPEC §6.3). */
export function BannerLaporan({ penduduk, hariIni }: { penduduk: Penduduk; hariIni: Date }) {
  const { pengguna } = useSesiAdmin()
  const queryClient = useQueryClient()
  const kueri = useQuery(opsiLaporanPerbaikan(penduduk.id))
  const [ditolak, setDitolak] = useState<LaporanData | null>(null)
  const terapkan = useMutation({
    mutationFn: (l: LaporanData) => terapkanLaporan(l.id),
    onSuccess: ({ laporan }) => {
      void segarkanKependudukan(queryClient)
      if (laporan.isi.jenis === 'perbaikan') {
        tampilkanToast({ pesan: `${LABEL_FIELD[laporan.isi.field]} ${penduduk.nama} diperbarui dari laporan warga.`, nada: 'berhasil' })
      }
    },
    onError: (galat) => {
      // Mis. laporan sudah ditangani petugas lain: muat ulang supaya banner sesuai keadaan terbaru.
      void segarkanKependudukan(queryClient)
      tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' })
    },
  })
  const bolehUbah = boleh(pengguna.peran, 'penduduk.ubah')
  const daftar = kueri.data?.data ?? []
  if (daftar.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {daftar.map((l) => {
        if (l.isi.jenis !== 'perbaikan') return null
        const isi = l.isi
        const tercatat = teksNilaiRiwayat(isi.field, penduduk[isi.field]) ?? 'kosong'
        return (
          <Banner
            key={l.id}
            nada="peringatan"
            judul={kalimatPerbaikan(isi)}
            aksi={
              bolehUbah && (
                <div className="flex gap-2">
                  <Tombol
                    ukuran="kecil"
                    varian="utama"
                    memuat={terapkan.isPending && terapkan.variables?.id === l.id}
                    onPress={() => terapkan.mutate(l)}
                  >
                    Terapkan
                  </Tombol>
                  <Tombol ukuran="kecil" varian="teks" onPress={() => setDitolak(l)}>
                    Tolak
                  </Tombol>
                </div>
              )
            }
          >
            Tercatat sekarang: {tercatat} · dilaporkan {l.pelapor.nama}, {formatWaktuRelatif(l.dibuatPada, hariIni)}
            {isi.catatan && <span className="mt-1 block text-tinta-2">“{isi.catatan}”</span>}
          </Banner>
        )
      })}
      {ditolak && <DialogTolakLaporan laporan={ditolak} onTutup={() => setDitolak(null)} />}
    </div>
  )
}
