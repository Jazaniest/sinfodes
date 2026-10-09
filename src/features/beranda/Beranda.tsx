import { useQuery } from '@tanstack/react-query'
import { opsiBeranda } from '@/api/beranda'
import { pesanGalat } from '@/api/galat'
import type { Aktivitas } from '@/domain/aktivitas/schema'
import { sapaanWaktu } from '@/domain/format/sapaan'
import { formatJam, formatTanggal, tanggalIsoWib } from '@/domain/format/tanggal'
import { namaDusun } from '@/domain/wilayah/alamat'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { isiTindakan, kalimatKeadaan } from './kalimat'

const judulBagian = 'text-label font-medium text-tinta-2 uppercase'

/** Butir Buku hari ini yang bisa dibuka: profil penduduk atau ruang kerja surat. */
function hrefRujukan(r: Aktivitas['rujukan']): string | null {
  if (r?.jenis === 'penduduk') return `/admin/kependudukan/penduduk/${r.id}`
  if (r?.jenis === 'permohonan') return `/admin/surat/${r.id}`
  return null
}

/** Beranda per peran (SPEC §5.3): tanpa deretan kartu angka; bagian bernilai null tidak tampil. */
export function Beranda({ sekarang = new Date() }: { sekarang?: Date }) {
  const { pengguna, desa, dusun } = useSesiAdmin()
  const kueri = useQuery(opsiBeranda())
  const idDusun = kueri.data?.keadaan.dusunId ?? null
  const dusunKeadaan = dusun.find((d) => d.id === idDusun)

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader
        judul={`${sapaanWaktu(sekarang)}, ${pengguna.nama}`}
        meta={`${formatTanggal(tanggalIsoWib(sekarang), 'hari')} · ${pengguna.jabatan} · Desa ${desa.nama}`}
      />
      {kueri.isPending ? (
        <BarisKerangka jumlah={4} label="Memuat beranda…" />
      ) : kueri.isError ? (
        <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
      ) : (
        <>
          {kueri.data.tindakan && (
            <section aria-labelledby="judul-tindakan">
              <h2 id="judul-tindakan" className={judulBagian}>
                Perlu ditindaklanjuti
              </h2>
              {kueri.data.tindakan.length === 0 ? (
                <p className="mt-2 text-tinta-2">Tidak ada yang perlu ditindaklanjuti saat ini.</p>
              ) : (
                <ul className="mt-2 divide-y divide-garis border-y border-garis bg-lembar">
                  {kueri.data.tindakan.map((t) => {
                    const isi = isiTindakan(t)
                    return (
                      <li key={t.jenis} className="px-4 py-3">
                        <Tautan href={isi.href}>{isi.teks}</Tautan>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}
          {kueri.data.bukuHariIni && (
            <section aria-labelledby="judul-buku">
              <h2 id="judul-buku" className={judulBagian}>
                Buku hari ini
              </h2>
              {kueri.data.bukuHariIni.length === 0 ? (
                <p className="mt-2 text-tinta-2">Belum ada kejadian hari ini.</p>
              ) : (
                <ol className="mt-2 divide-y divide-garis border-y border-garis bg-lembar">
                  {kueri.data.bukuHariIni.map((a) => {
                    const href = hrefRujukan(a.rujukan)
                    return (
                      <li key={a.id} className="grid grid-cols-[3.5rem_1fr] gap-3 px-4 py-2.5">
                        <time dateTime={a.waktu} className="font-mono text-teks-kecil text-tinta-2">
                          {formatJam(a.waktu)}
                        </time>
                        <p>
                          {href ? (
                            <Tautan href={href} nada="tinta">
                              {a.ringkasan}
                            </Tautan>
                          ) : (
                            a.ringkasan
                          )}
                          {a.oleh && <span className="text-tinta-2"> · {a.oleh.nama}</span>}
                        </p>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          )}
          <section aria-labelledby="judul-keadaan">
            <h2 id="judul-keadaan" className={judulBagian}>
              {dusunKeadaan ? `Keadaan ${namaDusun(dusunKeadaan, desa.istilahWilayah)}` : 'Keadaan desa'}
            </h2>
            <p className="mt-2 text-dasar">{kalimatKeadaan(kueri.data.keadaan)}</p>
          </section>
        </>
      )}
    </div>
  )
}
