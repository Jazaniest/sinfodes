import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiPeringkat } from '@/api/peringkat'
import { formatAngka } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { LABEL_KATEGORI_DESA, LABEL_TINGKATAN, formatUkuran } from '@/domain/indeks/kategori'
import { LABEL_MUSIM, MUSIM, type Musim } from '@/domain/indeks/periode'
import type { BarisKategoriDesa, FilterPeringkat, Posisi } from '@/domain/indeks/peringkat-desa'
import { cn } from '@/ui/cn'
import { Cap } from '@/ui/cap/Cap'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Select } from '@/ui/isian/Select'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

const kepala = 'border-b border-garis px-3 py-2 text-label font-medium whitespace-nowrap text-tinta-2 uppercase'
const sel = 'px-3 py-2'
const judulBagian = 'font-serif text-judul-bagian font-medium'

type Props = {
  filter: FilterPeringkat
  /** Menulis ke search URL; nilai `undefined` menghapus pilihan (kembali ke bawaan). */
  onUbahFilter: (ubah: Partial<FilterPeringkat>) => void
}

/** "Juara 1", "Juara 1 bersama", atau "Peringkat 4 dari 32"; tanda hubung bila belum memenuhi syarat. */
function teksPosisi(p: Posisi): string {
  if (p === null) return '-'
  if (p.peringkat <= 3) return `Juara ${p.peringkat}${p.bersama ? ' bersama' : ''}`
  return `Peringkat ${formatAngka(p.peringkat)}${p.bersama ? ' bersama' : ''} dari ${formatAngka(p.dari)}`
}

function BarisKategori({ b }: { b: BarisKategoriDesa }) {
  return (
    <tr className="border-t border-garis">
      <th scope="row" className={cn(sel, 'text-left font-medium')}>
        {LABEL_KATEGORI_DESA[b.kategori]}
      </th>
      <td className={cn(sel, 'tabular-nums')}>
        {b.ukuran === null ? (
          <span className="text-tinta-2">{b.alasan ?? '-'}</span>
        ) : (
          <>
            {formatUkuran(b.kategori, b.ukuran)}
            {b.skor !== null && <span className="text-tinta-2">{` · skor ${formatAngka(b.skor, 1)}`}</span>}
          </>
        )}
      </td>
      <td className={cn(sel, 'whitespace-nowrap')}>{teksPosisi(b.kecamatan)}</td>
      <td className={cn(sel, 'whitespace-nowrap')}>{teksPosisi(b.kabupaten)}</td>
      <td className={cn(sel, 'text-right whitespace-nowrap tabular-nums')}>
        {b.kabupaten?.ambangJuara3 != null ? formatUkuran(b.kategori, b.kabupaten.ambangJuara3) : '-'}
      </td>
    </tr>
  )
}

/**
 * Halaman Peringkat panel desa (SPEC-V0.2 §9.5): Indeks desa, posisi di kecamatan dan kabupaten per kategori, tren enam
 * periode, dan saran naik. Desa yang bukan peserta membaca penjelasan.
 */
export function Peringkat({ filter, onUbahFilter }: Props) {
  const kueri = useQuery(opsiPeringkat(filter))
  const p = kueri.data
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader judul="Peringkat desa" meta={p?.peserta ? `${p.periode.label} · Kecamatan ${p.desa.kecamatan} · Kabupaten ${p.desa.kabupaten}` : undefined} />
      {kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : !p ? (
        <BarisKerangka jumlah={6} label="Memuat peringkat…" />
      ) : !p.peserta ? (
        <EmptyState judul="Desa belum ikut peringkat" keterangan={p.alasan} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          {p.periode.berjalan && (
            <Banner nada="info">
              {`Klasemen sementara. Angka masih bisa berubah sampai periode tutup pada ${formatTanggal(p.periode.tutupPada)} pukul 00.00 WIB.`}
            </Banner>
          )}
          <section aria-labelledby="judul-indeks" className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-y border-garis bg-lembar px-4 py-4">
            <h2 id="judul-indeks" className="sr-only">
              Indeks Desa Digital
            </h2>
            {p.indeks === null ? (
              <p>
                <span className="font-medium">Belum ada Indeks</span>
                <span className="text-tinta-2">{` · ${p.kategori.find((k) => k.kategori === 'umum')?.alasan ?? ''}`}</span>
              </p>
            ) : (
              <>
                <p className="font-serif text-[2rem] leading-none font-medium tabular-nums">{formatAngka(p.indeks, 1)}</p>
                <p className="text-tinta-2">Indeks Desa Digital</p>
                {p.tingkatan && <Cap varian="normal" label={LABEL_TINGKATAN[p.tingkatan]} />}
              </>
            )}
          </section>
          <section aria-labelledby="judul-kategori" className="flex flex-col gap-2">
            <h2 id="judul-kategori" className={judulBagian}>
              Posisi per kategori
            </h2>
            <div className="overflow-x-auto border-y border-garis bg-lembar">
              <table className="w-full min-w-[40rem] border-collapse">
                <caption className="sr-only">{`Posisi desa per kategori, ${p.periode.label}`}</caption>
                <thead>
                  <tr>
                    {['Kategori', 'Nilai desa', 'Di kecamatan', 'Di kabupaten'].map((j) => (
                      <th key={j} scope="col" className={cn(kepala, 'text-left')}>
                        {j}
                      </th>
                    ))}
                    <th scope="col" className={cn(kepala, 'text-right')}>
                      Ambang juara 3
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {p.kategori.map((b) => (
                    <BarisKategori key={b.kategori} b={b} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section aria-labelledby="judul-tren" className="flex flex-col gap-2">
            <h2 id="judul-tren" className={judulBagian}>
              Tren 6 periode
            </h2>
            <table className="w-full max-w-lg border-collapse border-y border-garis bg-lembar">
              <caption className="sr-only">Indeks enam periode terakhir</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Periode</th>
                  <th scope="col">Indeks</th>
                </tr>
              </thead>
              <tbody>
                {p.tren.map((t) => (
                  <tr key={t.periode.kode} className="border-t border-garis first:border-t-0">
                    <th scope="row" className={cn(sel, 'w-40 text-left font-normal')}>
                      {t.periode.label}
                    </th>
                    <td className={sel}>
                      {t.indeks === null ? (
                        <span className="text-tinta-2">Belum ada Indeks</span>
                      ) : (
                        <span className="flex items-center gap-3">
                          <span className="w-12 font-mono tabular-nums">{formatAngka(t.indeks, 1)}</span>
                          <span
                            role="meter"
                            aria-label={`Indeks ${t.periode.label}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={t.indeks}
                            aria-valuetext={formatAngka(t.indeks, 1)}
                            className="h-1.5 flex-1 bg-garis/50"
                          >
                            <span className="block h-full bg-biru" style={{ width: `${Math.min(100, Math.max(0, t.indeks))}%` }} />
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section aria-labelledby="judul-saran" className="flex flex-col gap-2">
            <h2 id="judul-saran" className={judulBagian}>
              Saran untuk naik
            </h2>
            {p.saran.length === 0 ? (
              <p className="text-tinta-2">Belum ada saran. Pertahankan kebiasaan baik desa.</p>
            ) : (
              <ul className="divide-y divide-garis border-y border-garis bg-lembar">
                {p.saran.map((s) => (
                  <li key={s.kalimat} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2">
                    <Tautan href={s.href} nada="tinta">
                      {s.kalimat}
                    </Tautan>
                    <span className="text-teks-kecil text-tinta-2">{LABEL_KATEGORI_DESA[s.kategori]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
