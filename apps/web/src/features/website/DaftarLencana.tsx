import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keAlamat } from '@/app/alamat'
import { pesanGalat } from '@/api/galat'
import { kunciWebsite, opsiLencanaWebsite, ubahTampilLencana } from '@/api/website'
import type { LencanaAdmin } from '@/domain/indeks/lencana'
import { Saklar } from '@/ui/isian/Saklar'
import { tampilkanToast } from '@/ui/toast/antrean'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { CapLencana } from '@/ui/website/Lencana'
import { KepalaWebsite } from './TabWebsite'

/** Daftar semua lencana desa dengan saklar Tampil di website (rencana 7C-2 butir 4); dikelompokkan per periode. */
export function DaftarLencana() {
  const kueri = useQuery(opsiLencanaWebsite())
  const klien = useQueryClient()
  const ubah = useMutation({
    mutationFn: (v: { kode: string; tampil: boolean }) => ubahTampilLencana(v.kode, v.tampil),
    onSuccess: (_, v) => {
      tampilkanToast({ pesan: v.tampil ? 'Lencana ditampilkan di website.' : 'Lencana disembunyikan dari website.', nada: 'berhasil' })
      return klien.invalidateQueries({ queryKey: kunciWebsite.lencana })
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
  })
  const kelompok = new Map<string, { label: string; daftar: LencanaAdmin[] }>()
  for (const l of kueri.data?.data ?? []) {
    const kunci = `${l.periode.musim}:${l.periode.kode}`
    kelompok.set(kunci, { label: l.periode.label, daftar: [...(kelompok.get(kunci)?.daftar ?? []), l] })
  }
  return (
    <div className="flex flex-col gap-6">
      <KepalaWebsite aktif="lencana" />
      <p className="max-w-[60ch] text-tinta-2">
        Lencana terbit otomatis saat desa masuk podium. Website menampilkan paling banyak 6 lencana dari periode terakhir. Lencana yang
        disembunyikan tetap sah di halaman bukti.
      </p>
      {kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : kueri.isPending ? (
        <BarisKerangka jumlah={4} label="Memuat lencana…" />
      ) : kelompok.size === 0 ? (
        <EmptyState judul="Belum ada lencana. Lencana terbit saat desa masuk podium kecamatan atau kabupaten." />
      ) : (
        [...kelompok.entries()].map(([kunci, k]) => (
          <section key={kunci} aria-labelledby={`lencana-${kunci}`} className="flex flex-col gap-2">
            <h2 id={`lencana-${kunci}`} className="font-serif text-judul-bagian font-medium">
              {k.label}
            </h2>
            <ul className="divide-y divide-garis border-y border-garis bg-lembar">
              {k.daftar.map((l) => (
                <li key={l.kode} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
                  <CapLencana lencana={l} href={keAlamat({ jenis: 'induk' }, `/lencana/${l.kode}`)} varian="website" kecil />
                  <Saklar aria-label={`Tampil di website: ${l.kalimat}`} isSelected={l.tampil} onChange={(tampil) => ubah.mutate({ kode: l.kode, tampil })} isDisabled={ubah.isPending}>
                    Tampil di website
                  </Saklar>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
