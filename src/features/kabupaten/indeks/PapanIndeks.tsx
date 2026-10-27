import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiPapanIndeks } from '@/api/kabupaten'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { KATEGORI_DESA, LABEL_KATEGORI_DESA, type KategoriDesa } from '@/domain/indeks/kategori'
import { LABEL_MUSIM, MUSIM, type Musim } from '@/domain/indeks/periode'
import type { FilterPapanIndeks } from '@/domain/indeks/schema'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select } from '@/ui/isian/Select'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { BagianProvinsi } from './BagianProvinsi'
import { TabelPeringkat } from './TabelPeringkat'

const SEMUA_KECAMATAN = 'semua'
const MIN_DESA_PODIUM = 3

type Props = {
  filter: FilterPapanIndeks
  /** Menulis ke search URL; nilai `undefined` menghapus pilihan (kembali ke bawaan). */
  onUbahFilter: (ubah: Partial<FilterPapanIndeks>) => void
}

/**
 * Indeks & Peringkat di dasbor kabupaten (SPEC-V0.2 §9.4, §9.5): papan satu kategori untuk satu periode, desa yang belum
 * memenuhi syarat, dan peringkat kabupaten se-provinsi. Pilihan tinggal di URL, jadi papan bisa dibagikan lewat tautan.
 */
export function PapanIndeks({ filter, onUbahFilter }: Props) {
  const kueri = useQuery(opsiPapanIndeks(filter))
  const p = kueri.data
  return (
    <div className="flex flex-col gap-6">
      <PageHeader judul="Indeks & Peringkat" meta={p && `Kabupaten ${p.kabupaten.nama} · ${p.periode.label}`} />
      {kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : !p ? (
        <BarisKerangka jumlah={8} label="Memuat Indeks & Peringkat…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RadioGroup
              label="Musim"
              pilihan={MUSIM.map((m) => ({ id: m, label: LABEL_MUSIM[m] }))}
              nilai={p.musim}
              onUbah={(id) => onUbahFilter({ musim: id === 'bulanan' ? undefined : (id as Musim), periode: undefined })}
            />
            <Select
              label="Periode"
              pilihan={p.daftarPeriode.map((x) => ({ id: x.kode, label: x.berjalan ? `${x.label} · Klasemen sementara` : x.label }))}
              nilai={p.periode.kode}
              onUbah={(id) => onUbahFilter({ periode: id ?? undefined })}
            />
            <Select
              label="Kategori"
              pilihan={KATEGORI_DESA.map((k) => ({ id: k, label: LABEL_KATEGORI_DESA[k] }))}
              nilai={p.kategori}
              onUbah={(id) => onUbahFilter({ kategori: id === null || id === 'umum' ? undefined : (id as KategoriDesa) })}
            />
            <Select
              label="Wilayah"
              pilihan={[{ id: SEMUA_KECAMATAN, label: 'Semua kecamatan' }, ...p.daftarKecamatan.map((k) => ({ id: k.kode, label: `Kecamatan ${k.nama}` }))]}
              nilai={p.kecamatan?.kode ?? SEMUA_KECAMATAN}
              onUbah={(id) => onUbahFilter({ kecamatan: id === null || id === SEMUA_KECAMATAN ? undefined : id })}
            />
          </div>
          {p.periode.berjalan && (
            <Banner nada="info">
              {`Klasemen sementara. Angka masih bisa berubah sampai periode tutup pada ${formatTanggal(p.periode.tutupPada)} pukul 00.00 WIB.`}
            </Banner>
          )}
          {p.peringkat.length === 0 ? (
            <EmptyState judul="Belum ada desa yang memenuhi syarat" keterangan="Coba periode atau kategori lain." />
          ) : (
            <>
              <TabelPeringkat papan={p} tampilPodium={p.podiumKecamatan !== false} namaKategori={LABEL_KATEGORI_DESA[p.kategori]} />
              {p.podiumKecamatan === false && (
                <p className="text-teks-kecil text-tinta-2">{`Podium kecamatan dibuat bila paling sedikit ${MIN_DESA_PODIUM} desa memenuhi syarat.`}</p>
              )}
            </>
          )}
          {p.peringkat.length === 0 && p.podiumKecamatan === false && (
            <p className="text-teks-kecil text-tinta-2">{`Podium kecamatan dibuat bila paling sedikit ${MIN_DESA_PODIUM} desa memenuhi syarat.`}</p>
          )}
          {p.belumMemenuhi.length > 0 && (
            <section aria-labelledby="judul-belum" className="flex flex-col gap-2">
              <h2 id="judul-belum" className="font-serif text-judul-bagian font-medium">
                Belum memenuhi syarat
              </h2>
              <ul className="divide-y divide-garis border-y border-garis bg-lembar">
                {p.belumMemenuhi.map((b) => (
                  <li key={b.desa.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2">
                    <span className="font-medium">
                      {b.desa.nama}
                      {p.kecamatan === null && <span className="font-normal text-tinta-2">{` · ${b.desa.kecamatan}`}</span>}
                    </span>
                    <span className="text-tinta-2">{b.alasan}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {p.tidakIkut > 0 && (
            <p className="text-teks-kecil text-tinta-2">
              {`${formatAngka(p.tidakIkut)} desa tidak ikut peringkat: desa Uji coba, Persiapan, Ditangguhkan, atau yang mulai berlangganan di tengah periode.`}
            </p>
          )}
          <BagianProvinsi papan={p} />
        </>
      )}
    </div>
  )
}
