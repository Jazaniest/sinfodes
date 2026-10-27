import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { beriAksesSinfodes, cabutAksesSinfodes, kunciPengaturan, opsiAksesSinfodes } from '@/api/pengaturan'
import { formatTanggal, formatWaktuLog } from '@/domain/format/tanggal'
import {
  LABEL_LAMA_AKSES, LAMA_AKSES_JAM, ringkasJejak, type AksesSinfodes as DataAkses, type LamaAksesJam, type RiwayatAkses,
} from '@/domain/pengaturan/akses-sinfodes'
import { Checkbox } from '@/ui/isian/Checkbox'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { KepalaPengaturan } from './TabPengaturan'

const judulBagian = 'font-serif text-judul-bagian font-medium'
const kepala = 'border-b border-garis py-1.5 pr-4 text-left text-label font-medium text-tinta-2 uppercase'
const sel = 'border-b border-garis py-2.5 pr-4 align-top'

const LABEL_BERAKHIR: Readonly<Record<NonNullable<RiwayatAkses['berakhir']>, string>> = {
  habis: 'Habis waktunya',
  dicabut: 'Dicabut',
}

function TabelRiwayat({ riwayat }: { riwayat: DataAkses['riwayat'] }) {
  if (riwayat.length === 0) return <EmptyState judul="Belum pernah ada akses bantuan" keterangan="Akses yang diberikan dan halaman yang dibuka tercatat di sini." />
  return (
    <div className="overflow-x-auto">
      <table aria-labelledby="judul-riwayat-akses" className="w-full min-w-[40rem]">
        <thead>
          <tr>
            <th scope="col" className={kepala}>Dibuka oleh</th>
            <th scope="col" className={kepala}>Mulai</th>
            <th scope="col" className={kepala}>Halaman dibuka</th>
            <th scope="col" className={kepala}>Berakhir</th>
          </tr>
        </thead>
        <tbody>
          {riwayat.map((r) => {
            const oleh = [...new Set(r.sesi.map((s) => s.oleh))]
            const jejak = ringkasJejak(r.sesi.flatMap((s) => s.halaman))
            return (
              <tr key={r.id}>
                <td className={sel}>{oleh.length > 0 ? oleh.join(', ') : <span className="text-tinta-2">Belum dibuka</span>}</td>
                <td className={sel}>
                  <span className="block">{formatWaktuLog(r.mulai)}</span>
                  <span className="block text-teks-kecil text-tinta-2">Diberikan {r.diberiOleh}</span>
                </td>
                <td className={sel}>
                  {jejak.length > 0 ? jejak.map((j) => `${j.label} (${j.jumlah})`).join(', ') : <span className="text-tinta-2">—</span>}
                </td>
                <td className={sel}>{r.berakhir ? LABEL_BERAKHIR[r.berakhir] : <span className="font-medium">Masih berlaku</span>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Pengaturan › Akses Sinfodes (SPEC-V0.2 §5.3): Sekretaris atau Kepala Desa memberi Tim Sinfodes izin sementara melihat panel
 * desa, mencabutnya kapan saja, dan membaca jejak halaman yang dibuka.
 */
export function AksesSinfodes() {
  const queryClient = useQueryClient()
  const akses = useQuery(opsiAksesSinfodes())
  const [lamaJam, setLamaJam] = useState<LamaAksesJam>(24)
  const [sembunyikan, setSembunyikan] = useState(true)
  const pasang = (data: DataAkses) => queryClient.setQueryData(kunciPengaturan.aksesSinfodes, data)
  const gagal = (e: Error) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
  const beri = useMutation({
    mutationFn: () => beriAksesSinfodes({ lamaJam, sembunyikanDataPribadi: sembunyikan }),
    onSuccess: (data) => {
      pasang(data)
      tampilkanToast({ pesan: `Akses bantuan diberikan selama ${LABEL_LAMA_AKSES[lamaJam]}.`, nada: 'berhasil' })
    },
    onError: gagal,
  })
  const cabut = useMutation({
    mutationFn: cabutAksesSinfodes,
    onSuccess: (data) => {
      pasang(data)
      tampilkanToast({ pesan: 'Akses bantuan dicabut. Tim Sinfodes tidak bisa lagi membuka panel desa.', nada: 'berhasil' })
    },
    onError: gagal,
  })

  return (
    <>
      <KepalaPengaturan aktif="akses-sinfodes" />
      {akses.isPending ? (
        <BarisKerangka jumlah={6} label="Memuat akses bantuan…" />
      ) : akses.isError ? (
        <ErrorState pesan={pesanGalat(akses.error)} onCobaLagi={() => void akses.refetch()} />
      ) : (
        <div className="flex flex-col gap-10">
          <section aria-labelledby="judul-akses" className="flex max-w-2xl flex-col gap-5">
            <div>
              <h2 id="judul-akses" className={judulBagian}>
                Akses bantuan Sinfodes
              </h2>
              <p className="mt-1 text-tinta-2">
                Beri Tim Sinfodes izin melihat panel desa ini untuk membantu mengatasi masalah. Tim hanya bisa melihat, tidak bisa
                mengubah apa pun, dan setiap halaman yang dibuka tercatat di riwayat.
              </p>
            </div>
            {akses.data.aktif ? (
              <div className="flex flex-col items-start gap-3 border-l-[3px] border-biru bg-lembar px-4 py-4">
                <p className="font-medium">Akses aktif sampai {formatWaktuLog(akses.data.aktif.sampai)}</p>
                <p>{akses.data.aktif.sembunyikanDataPribadi ? 'Data pribadi warga disamarkan.' : 'Data pribadi warga terlihat.'}</p>
                <p className="text-teks-kecil text-tinta-2">
                  Diberikan {akses.data.aktif.diberiOleh} pada {formatTanggal(akses.data.aktif.mulai)}.
                </p>
                <Tombol varian="bahaya" memuat={cabut.isPending} onPress={() => cabut.mutate()}>
                  Cabut akses
                </Tombol>
              </div>
            ) : (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!beri.isPending) beri.mutate()
                }}
                className="flex flex-col items-start gap-5 border border-garis bg-lembar px-4 py-4"
              >
                <RadioGroup
                  label="Lama akses"
                  pilihan={LAMA_AKSES_JAM.map((j) => ({ id: String(j), label: LABEL_LAMA_AKSES[j] }))}
                  nilai={String(lamaJam)}
                  onUbah={(v) => setLamaJam(Number(v) as LamaAksesJam)}
                />
                <Checkbox isSelected={sembunyikan} onChange={setSembunyikan}>
                  Sembunyikan data pribadi warga (NIK dan nomor KK disamarkan)
                </Checkbox>
                <Tombol type="submit" varian="utama" memuat={beri.isPending}>
                  Beri akses
                </Tombol>
              </form>
            )}
          </section>
          <section aria-labelledby="judul-riwayat-akses" className="flex max-w-4xl flex-col gap-3">
            <h2 id="judul-riwayat-akses" className={judulBagian}>
              Riwayat akses
            </h2>
            <TabelRiwayat riwayat={akses.data.riwayat} />
          </section>
        </div>
      )}
    </>
  )
}
