import { keAlamat } from '@/app/alamat'
import { formatAngka, formatPersen } from '@/domain/format/angka'
import { LABEL_TINGKATAN } from '@/domain/indeks/kategori'
import { rasioApbdes } from '@/domain/kabupaten/pemantauan'
import type { TitikPetaKabupaten } from '@/domain/kabupaten/peta'
import { Rupiah } from '@/ui/domain/Rupiah'
import { Tautan } from '@/ui/navigasi/Tautan'

/** Kartu desa di Peta dasbor (SPEC-V0.2 §8.3 butir 5): angka yang sama dengan Pemantauan dan Dana Desa. */
export function KartuDesaPeta({ desa: d }: { desa: TitikPetaKabupaten }) {
  const rasio = rasioApbdes(d.apbdes)
  return (
    <section aria-label={`Kartu desa ${d.nama}`} className="flex flex-col gap-3 border border-garis bg-lembar p-4">
      <div>
        <h2 className="font-serif text-judul-bagian font-medium">{d.nama}</h2>
        <p className="text-teks-kecil text-tinta-2">{`Kecamatan ${d.kecamatan} · ${d.status}`}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-teks-kecil">
        <dt className="text-tinta-2">Penduduk</dt>
        <dd className="tabular-nums">{d.jiwa > 0 ? `${formatAngka(d.jiwa)} jiwa` : '—'}</dd>
        <dt className="text-tinta-2">Surat bulan ini</dt>
        <dd className="tabular-nums">{formatAngka(d.suratBulanIni)}</dd>
        <dt className="text-tinta-2">Tingkatan Indeks</dt>
        <dd>{d.tingkatan ? LABEL_TINGKATAN[d.tingkatan] : 'Belum ada Indeks'}</dd>
        <dt className="text-tinta-2">Realisasi Dana Desa</dt>
        <dd className="tabular-nums">
          {d.apbdes && rasio !== null ? (
            <>
              {formatPersen(rasio)} (<Rupiah nilai={d.apbdes.realisasi} ringkas /> dari <Rupiah nilai={d.apbdes.anggaran} ringkas />)
              {d.tertinggal && <span className="ml-2 border-l-2 border-oker pl-1.5 font-medium text-oker">Tertinggal</span>}
            </>
          ) : (
            'Belum ada APBDes tahun ini'
          )}
        </dd>
      </dl>
      {/* Desa Persiapan belum punya website (SPEC-V0.2 §4.1). */}
      {d.status !== 'Persiapan' && <Tautan href={keAlamat({ jenis: 'desa', label: d.alamat })}>Buka website desa</Tautan>}
    </section>
  )
}
