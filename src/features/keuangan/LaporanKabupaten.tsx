import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { kunciNotifikasi } from '@/api/notifikasi'
import { batalkanDikirim, kunciTenggatDesa, opsiTenggatDesa } from '@/api/tenggat'
import { formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { kalimatSisa, LABEL_STATUS_KIRIM, sisaHari, statusKirim, type ButirTenggatDesa } from '@/domain/kabupaten/tenggat'
import { boleh } from '@/domain/pengguna/hak-akses'
import { cn } from '@/ui/cn'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { DialogTandaiDikirim } from './DialogTandaiDikirim'

const ID_LAPORAN_KABUPATEN = 'laporan-kabupaten'

function teksStatus(t: ButirTenggatDesa, hariIni: string): string {
  if (t.dikirim) return `${LABEL_STATUS_KIRIM[statusKirim(t.tanggal, t.dikirim.tanggal, hariIni)]} ${formatTanggal(t.dikirim.tanggal)} oleh ${t.dikirim.olehNama}`
  return LABEL_STATUS_KIRIM[statusKirim(t.tanggal, null, hariIni)]
}

/**
 * Laporan ke kabupaten di halaman Keuangan (SPEC-V0.2 §8.3 butir 4): tenggat yang diatur kabupaten dan tanda kirim desa ini.
 * Tidak tampil untuk desa yang bukan sasaran tenggat. Pemegang `keuangan.lapor` bisa menandai dan membatalkan.
 */
export function LaporanKabupaten({ sekarang = new Date() }: { sekarang?: Date }) {
  const { pengguna } = useSesiAdmin()
  const queryClient = useQueryClient()
  const kueri = useQuery(opsiTenggatDesa())
  const [tandai, setTandai] = useState<ButirTenggatDesa | null>(null)
  const wadah = useRef<HTMLElement>(null)
  const hariIni = tanggalIsoWib(sekarang)
  const bolehLapor = boleh(pengguna.peran, 'keuangan.lapor')
  const batal = useMutation({
    mutationFn: batalkanDikirim,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: kunciTenggatDesa })
      void queryClient.invalidateQueries({ queryKey: ['beranda'] })
      void queryClient.invalidateQueries({ queryKey: kunciNotifikasi })
      tampilkanToast({ pesan: 'Tanda kirim dibatalkan.', nada: 'info' })
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
  })
  const ada = kueri.data !== undefined && kueri.data.kabupaten !== null
  // Tautan dari Beranda dan notifikasi membawa #laporan-kabupaten; bagian ini baru ada setelah datanya termuat.
  useEffect(() => {
    if (ada && window.location.hash === `#${ID_LAPORAN_KABUPATEN}`) wadah.current?.scrollIntoView({ block: 'start' })
  }, [ada])
  if (!kueri.data || kueri.data.kabupaten === null) return null
  const kabupaten = kueri.data.kabupaten
  const judul = `Laporan ke Kabupaten ${kabupaten}`
  return (
    <section ref={wadah} id={ID_LAPORAN_KABUPATEN} aria-label={judul} className="flex flex-col gap-2 scroll-mt-6">
      <h2 className="text-label font-medium text-tinta-2 uppercase">{judul}</h2>
      {kueri.data.data.length === 0 ? (
        <p className="text-tinta-2">Kabupaten belum mengatur tenggat laporan.</p>
      ) : (
        <ul className="divide-y divide-garis border-y border-garis bg-lembar">
          {kueri.data.data.map((t) => {
            const status = statusKirim(t.tanggal, t.dikirim?.tanggal ?? null, hariIni)
            return (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{t.nama}</span>
                  <span className="text-teks-kecil text-tinta-2">
                    {`${formatTanggal(t.tanggal)} · ${kalimatSisa(sisaHari(t.tanggal, hariIni))}`}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className={cn('text-teks-kecil', status === 'lewat' ? 'font-medium text-merah' : t.dikirim ? 'text-tinta' : 'text-tinta-2')}>
                    {teksStatus(t, hariIni)}
                  </span>
                  {bolehLapor &&
                    (t.dikirim ? (
                      <Tombol ukuran="kecil" memuat={batal.isPending && batal.variables === t.id} onPress={() => batal.mutate(t.id)}>
                        Batalkan tanda
                      </Tombol>
                    ) : (
                      <Tombol ukuran="kecil" onPress={() => setTandai(t)}>
                        Tandai sudah dikirim
                      </Tombol>
                    ))}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {tandai && <DialogTandaiDikirim tenggat={tandai} kabupaten={kabupaten} hariIni={hariIni} onTutup={() => setTandai(null)} />}
    </section>
  )
}
