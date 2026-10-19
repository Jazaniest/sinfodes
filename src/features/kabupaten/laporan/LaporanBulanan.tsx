import { Printer } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiLaporanBulanan } from '@/api/kabupaten'
import { formatAngka, formatPersen, formatRupiah } from '@/domain/format/angka'
import { formatBulan, formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { LABEL_KATEGORI_DESA, formatUkuran } from '@/domain/indeks/kategori'
import type { PodiumLaporan } from '@/domain/indeks/schema'
import type { DesaRingkas, LaporanBulanan as Laporan } from '@/domain/kabupaten/laporan'
import { cn } from '@/ui/cn'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { LambangContoh } from '../LambangContoh'

/** Laporan dicetak tegak; aturan ini hanya terpasang selama laporan terbuka. */
const GAYA_CETAK = '@page { size: A4 portrait; margin: 15mm; }'
const sel = 'border border-tinta px-1.5 py-1 align-top'
const angka = cn(sel, 'text-right tabular-nums')
const judul2 = 'font-serif text-judul-bagian font-medium'

const persen = (realisasi: number | null, anggaran: number | null) =>
  realisasi !== null && anggaran !== null && anggaran > 0 ? formatPersen(realisasi / anggaran) : '—'
const rupiahAtauStrip = (n: number | null) => (n === null ? '—' : formatRupiah(n))

function Bagian({ judul, children }: { judul: string; children: ReactNode }) {
  const id = `laporan-${judul.replace(/[^a-z]+/gi, '-').toLowerCase()}`
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 break-inside-avoid-page">
      <h2 id={id} className={judul2}>
        {judul}
      </h2>
      {children}
    </section>
  )
}

function Tabel({ judul, kepala, children }: { judul: string; kepala: readonly { label: string; kanan?: boolean }[]; children: ReactNode }) {
  return (
    <table className="w-full border-collapse text-teks-kecil print:text-[9pt]">
      <caption className="sr-only">{judul}</caption>
      <thead>
        <tr>
          {kepala.map((k) => (
            <th key={k.label} scope="col" className={cn(sel, k.kanan ? 'text-right' : 'text-left')}>
              {k.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

function DaftarDesa({ judul, desa }: { judul: string; desa: readonly DesaRingkas[] }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-medium">{judul}</h3>
      {desa.length === 0 ? (
        <p className="text-tinta-2">Tidak ada.</p>
      ) : (
        <p>{desa.map((d) => `${d.nama} (${d.kecamatan})`).join(', ')}</p>
      )}
    </div>
  )
}

/** Sel juara satu peringkat: nama (kecamatan) · nilai; seri tertulis bersama dalam sel yang sama. */
function selJuara(juara: PodiumLaporan[number]['juara'], peringkat: number, kategori: PodiumLaporan[number]['kategori']) {
  const di = juara.filter((j) => j.peringkat === peringkat)
  if (di.length === 0) return '—'
  return di.map((j) => `${j.nama} (${j.kecamatan}) · ${formatUkuran(kategori, j.nilai)}${j.bersama ? ' · bersama' : ''}`).join('; ')
}

function Lembar({ l, sekarang }: { l: Laporan; sekarang: Date }) {
  const nama = formatBulan(l.bulan)
  const dd = l.ringkasan.danaDesa
  return (
    <article aria-label={`Laporan bulanan ${nama}`} className="mx-auto flex w-full max-w-[210mm] flex-col gap-8 border border-garis bg-lembar p-8 print:max-w-none print:border-0 print:p-0">
      <style>{GAYA_CETAK}</style>
      <section aria-label="Sampul" className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center print:min-h-[240mm] print:break-after-page">
        <LambangContoh nama={l.kabupaten.nama} className="h-20 w-auto text-tinta" />
        <p className="text-label tracking-wide text-tinta-2 uppercase">Laporan Bulanan</p>
        <p className="font-serif text-[2rem] leading-tight font-medium">{`Desa Digital Kabupaten ${l.kabupaten.nama}`}</p>
        <p className="font-serif text-judul-bagian">{nama}</p>
        <p className="mt-6 text-teks-kecil text-tinta-2">{`Disusun dari data Sinfodes · dicetak ${formatTanggal(tanggalIsoWib(sekarang))}`}</p>
      </section>

      <Bagian judul="Ringkasan kabupaten">
        <p>{`${formatAngka(l.ringkasan.bergabung)} dari ${formatAngka(l.ringkasan.jumlahDesa)} desa sudah memakai Sinfodes pada akhir ${nama}.`}</p>
        <p>{`${formatAngka(l.ringkasan.suratTerbit)} surat terbit sepanjang ${nama}.`}</p>
        <p>
          {dd.anggaran > 0
            ? `Realisasi belanja APBDes ${dd.tahun} sampai akhir ${nama}: ${persen(dd.realisasi, dd.anggaran)} (${formatRupiah(dd.realisasi)} dari ${formatRupiah(dd.anggaran)}).` +
              (dd.medianRealisasi === null ? '' : ` Median desa ${formatPersen(dd.medianRealisasi)}.`)
            : `Belum ada data APBDes ${dd.tahun} dari desa yang bergabung.`}
        </p>
      </Bagian>

      <Bagian judul="Rincian per kecamatan">
        <Tabel judul="Rincian per kecamatan" kepala={[{ label: 'Kecamatan' }, { label: 'Desa bergabung', kanan: true }, { label: 'Surat terbit', kanan: true }]}>
          {l.kecamatan.map((k) => (
            <tr key={k.kecamatan.kode}>
              <td className={sel}>{k.kecamatan.nama}</td>
              <td className={angka}>{formatAngka(k.bergabung)}</td>
              <td className={angka}>{formatAngka(k.suratTerbit)}</td>
            </tr>
          ))}
        </Tabel>
      </Bagian>

      <Bagian judul={`Podium ${nama}`}>
        <Tabel judul={`Podium ${nama}`} kepala={[{ label: 'Kategori' }, { label: 'Juara 1' }, { label: 'Juara 2' }, { label: 'Juara 3' }]}>
          {l.podium.map((k) => (
            <tr key={k.kategori} className="break-inside-avoid">
              <th scope="row" className={cn(sel, 'text-left font-medium')}>
                {LABEL_KATEGORI_DESA[k.kategori]}
              </th>
              {k.juara.length === 0 ? (
                <td colSpan={3} className={cn(sel, 'text-tinta-2')}>
                  Belum ada desa yang memenuhi syarat.
                </td>
              ) : (
                [1, 2, 3].map((p) => (
                  <td key={p} className={sel}>
                    {selJuara(k.juara, p, k.kategori)}
                  </td>
                ))
              )}
            </tr>
          ))}
        </Tabel>
      </Bagian>

      <Bagian judul="Desa yang perlu perhatian">
        <DaftarDesa judul="Tanpa surat terbit bulan ini" desa={l.perhatian.tanpaSurat} />
        <DaftarDesa judul="Realisasi Dana Desa tertinggal" desa={l.perhatian.tertinggal} />
        <div className="flex flex-col gap-1">
          <h3 className="font-medium">Tenggat laporan yang terlewat</h3>
          {l.perhatian.tenggat.length === 0 ? (
            <p className="text-tinta-2">Tidak ada.</p>
          ) : (
            l.perhatian.tenggat.map((t) => (
              <p key={`${t.nama}-${t.tanggal}`}>
                <span className="font-medium">{`${t.nama} (${formatTanggal(t.tanggal)}): `}</span>
                {t.desa.map((d) => `${d.nama} (${d.kecamatan})`).join(', ')}
              </p>
            ))
          )}
        </div>
      </Bagian>

      <Bagian judul="Dana Desa">
        <p className="text-teks-kecil text-tinta-2">
          Realisasi belanja APBDes secara keseluruhan, sampai akhir bulan, untuk desa yang bergabung pada akhir bulan itu.
        </p>
        <Tabel
          judul="Dana Desa per kecamatan"
          kepala={[{ label: 'Kecamatan' }, { label: 'Pagu', kanan: true }, { label: 'Realisasi sampai akhir bulan', kanan: true }, { label: '%', kanan: true }]}
        >
          {l.kecamatan.map((k) => (
            <tr key={k.kecamatan.kode}>
              <td className={sel}>{k.kecamatan.nama}</td>
              <td className={angka}>{formatRupiah(k.anggaran)}</td>
              <td className={angka}>{formatRupiah(k.realisasi)}</td>
              <td className={angka}>{persen(k.realisasi, k.anggaran)}</td>
            </tr>
          ))}
        </Tabel>
      </Bagian>

      <Bagian judul="Lampiran: tabel per desa">
        <Tabel
          judul="Lampiran: tabel per desa"
          kepala={[
            { label: 'Kecamatan' }, { label: 'Desa' }, { label: 'Bergabung' }, { label: 'Surat terbit', kanan: true },
            { label: 'Pagu', kanan: true }, { label: 'Realisasi', kanan: true }, { label: '%', kanan: true },
          ]}
        >
          {l.desa.map((d) => (
            <tr key={`${d.kecamatan}-${d.nama}`}>
              <td className={sel}>{d.kecamatan}</td>
              <td className={sel}>
                {d.nama}
                {d.tertinggal && ' (tertinggal)'}
              </td>
              <td className={sel}>{d.bergabung ? 'Ya' : 'Belum'}</td>
              <td className={angka}>{formatAngka(d.suratTerbit)}</td>
              <td className={angka}>{rupiahAtauStrip(d.anggaran)}</td>
              <td className={angka}>{rupiahAtauStrip(d.realisasi)}</td>
              <td className={angka}>{persen(d.realisasi, d.anggaran)}</td>
            </tr>
          ))}
        </Tabel>
      </Bagian>
    </article>
  )
}

/**
 * Laporan bulanan kabupaten (SPEC-V0.2 §8.3 butir 7): pratinjau di layar yang sama dengan hasil cetaknya, lalu dialog cetak
 * peramban ("Simpan sebagai PDF" ada di sana), seperti pola cetak v0.1. Podium bulan itu menyusul di 7C.
 */
export function LaporanBulanan({ bulan, sekarang = new Date() }: { bulan: string; sekarang?: Date }) {
  const kueri = useQuery(opsiLaporanBulanan(bulan))
  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Menyusun laporan…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && (kueri.error.kode === 'NOT_FOUND' || kueri.error.kode === 'VALIDATION')) {
      return (
        <div className="flex flex-col items-start gap-3">
          <EmptyState judul="Laporan bulan ini belum tersedia" keterangan="Laporan tersedia untuk bulan yang sudah tutup sejak kabupaten bergabung." />
          <Tautan href="/kabupaten/admin/laporan">Kembali ke daftar laporan</Tautan>
        </div>
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Tautan href="/kabupaten/admin/laporan" nada="redup" className="text-label font-medium uppercase">
          Laporan bulanan
        </Tautan>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-teks-kecil text-tinta-2">Pilih “Simpan sebagai PDF” di jendela cetak.</p>
          <Tombol varian="utama" ikon={<Printer aria-hidden size={16} />} onPress={() => window.print()}>
            Cetak atau simpan PDF
          </Tombol>
        </div>
      </div>
      <Lembar l={kueri.data} sekarang={sekarang} />
    </div>
  )
}
