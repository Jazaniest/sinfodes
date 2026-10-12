import { useId } from 'react'
import type { Beranda } from '@/domain/beranda/schema'
import { formatPersen } from '@/domain/format/angka'
import { rasio } from '@/domain/keuangan/schema'
import { Rupiah } from '@/ui/domain/Rupiah'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { Tautan } from '@/ui/navigasi/Tautan'

type Apbdes = NonNullable<Beranda['apbdes']>
type Kegiatan = NonNullable<Beranda['pembangunan']>[number]

const judulBagian = 'text-label font-medium text-tinta-2 uppercase'
const dari = (realisasi: number, anggaran: number) => (
  <>
    <Rupiah nilai={realisasi} ringkas /> dari <Rupiah nilai={anggaran} ringkas />
  </>
)

/**
 * Realisasi APBDes di Beranda (SPEC §5.3). `ringkas`: satu MiniBar belanja (Operator, Sekdes); `bidang`: per bidang
 * (Kades); `lengkap`: pendapatan, belanja, lalu per bidang (Kaur Keuangan).
 */
export function RealisasiApbdes({ apbdes: a, tampilan }: { apbdes: Apbdes; tampilan: 'ringkas' | 'bidang' | 'lengkap' }) {
  const id = useId()
  if (tampilan === 'ringkas') {
    return (
      <MiniBar
        label={`Realisasi belanja APBDes ${a.tahun}`}
        nilai={a.belanja.realisasi}
        maks={a.belanja.anggaran}
        className="mt-4 max-w-md"
        keterangan={
          <>
            {dari(a.belanja.realisasi, a.belanja.anggaran)} · pendapatan {formatPersen(rasio(a.pendapatan))} ·{' '}
            <Tautan href="/admin/keuangan">Lihat APBDes</Tautan>
          </>
        }
      />
    )
  }
  const judul = tampilan === 'bidang' ? `Realisasi APBDes ${a.tahun} per bidang` : `Realisasi APBDes ${a.tahun}`
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={judulBagian}>
        {judul}
      </h2>
      <div className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {tampilan === 'lengkap' && (
          <>
            <MiniBar label="Pendapatan" nilai={a.pendapatan.realisasi} maks={a.pendapatan.anggaran} keterangan={dari(a.pendapatan.realisasi, a.pendapatan.anggaran)} />
            <MiniBar label="Belanja" nilai={a.belanja.realisasi} maks={a.belanja.anggaran} keterangan={dari(a.belanja.realisasi, a.belanja.anggaran)} />
          </>
        )}
        {a.bidang.map((b) => (
          <MiniBar key={b.kode} label={b.nama} nilai={b.realisasi} maks={b.anggaran} keterangan={dari(b.realisasi, b.anggaran)} />
        ))}
      </div>
      <Tautan href="/admin/keuangan" className="mt-3 inline-block">
        Lihat APBDes
      </Tautan>
    </section>
  )
}

/** Kegiatan pembangunan yang sedang berjalan: progres fisik (Kades) atau progres keuangan (Kaur Keuangan). */
export function PembangunanBerjalan({ judul, daftar, ukur }: { judul: string; daftar: readonly Kegiatan[]; ukur: 'fisik' | 'keuangan' }) {
  const id = useId()
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={judulBagian}>
        {judul}
      </h2>
      {daftar.length === 0 ? (
        <p className="mt-2 text-tinta-2">Tidak ada kegiatan yang sedang berjalan.</p>
      ) : (
        <ul className="mt-2 divide-y divide-garis border-y border-garis bg-lembar">
          {daftar.map((k) => (
            <li key={k.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center">
              <Tautan href={`/admin/pembangunan/${k.id}`} nada="tinta">
                {k.nama}
              </Tautan>
              {ukur === 'fisik' ? (
                <MiniBar label="Progres fisik" nilai={k.progresFisik} maks={100} />
              ) : (
                <MiniBar label="Progres keuangan" nilai={k.realisasi} maks={k.anggaran} keterangan={dari(k.realisasi, k.anggaran)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
