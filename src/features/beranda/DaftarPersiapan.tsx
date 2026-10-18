import { Check } from '@phosphor-icons/react'
import { boleh, type Kemampuan } from '@/domain/pengguna/hak-akses'
import type { PeranSesi } from '@/domain/pengguna/schema'
import {
  jumlahSelesai,
  LABEL_LANGKAH_PERSIAPAN,
  LANGKAH_PERSIAPAN,
  langkahBerikut,
  type LangkahPersiapan,
  type Persiapan,
} from '@/domain/wilayah/persiapan'
import { Cap } from '@/ui/cap/Cap'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { Tautan } from '@/ui/navigasi/Tautan'
import { TautanTombol } from '@/ui/tombol/TautanTombol'

type Tujuan = { href: string; kemampuan: Kemampuan; oleh: string; catatan?: string }

/**
 * Halaman tiap langkah dan hak yang diminta gerbang `ButuhAkses` halaman itu. Jenis surat memakai `pengaturan.kelola`,
 * karena daftar jenis surat bisa dilihat semua pemegang `surat.lihat`, tetapi hanya pemegang hak itu yang bisa mengaktifkannya.
 */
const TUJUAN: Readonly<Record<LangkahPersiapan, Tujuan>> = {
  identitas: { href: '/admin/pengaturan', kemampuan: 'pengaturan.kelola', oleh: 'Operator atau Sekretaris Desa' },
  wilayah: { href: '/admin/pengaturan/wilayah', kemampuan: 'pengaturan.kelola', oleh: 'Operator atau Sekretaris Desa' },
  impor: { href: '/admin/kependudukan/penduduk/impor', kemampuan: 'penduduk.ubah', oleh: 'Operator atau Sekretaris Desa' },
  pengguna: {
    href: '/admin/pengaturan/pengguna',
    kemampuan: 'pengguna.kelola',
    oleh: 'Sekretaris Desa',
    catatan: 'Desa yang belum punya Sekretaris Desa meminta Tim Sinfodes mengundangnya.',
  },
  'jenis-surat': { href: '/admin/surat/jenis', kemampuan: 'pengaturan.kelola', oleh: 'Operator atau Sekretaris Desa' },
}

/**
 * Beranda desa berstatus Persiapan (SPEC §5.3): lima langkah dengan progres, tiap langkah menuju halamannya. Langkah yang
 * halamannya tidak boleh dibuka peran ini ditulis tanpa tautan beserta siapa yang mengerjakannya, jadi tidak ada tombol mati.
 */
export function DaftarPersiapan({ persiapan, peran }: { persiapan: Persiapan; peran: PeranSesi }) {
  const selesai = jumlahSelesai(persiapan)
  const berikut = langkahBerikut(persiapan)
  return (
    <section aria-labelledby="judul-persiapan" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="judul-persiapan" className="font-serif text-judul-bagian font-medium">
          Persiapan desa
        </h2>
        <p className="text-tinta-2">Desa ini masih dalam persiapan. Selesaikan lima langkah berikut sebelum mulai melayani warga.</p>
      </div>
      <MiniBar
        label="Progres persiapan"
        labelTersembunyi
        nilai={selesai}
        maks={LANGKAH_PERSIAPAN.length}
        keterangan={`${selesai} dari ${LANGKAH_PERSIAPAN.length} langkah selesai`}
        className="max-w-md"
      />
      <ol aria-label="Langkah persiapan" className="divide-y divide-garis border-y border-garis bg-lembar">
        {persiapan.map((l, i) => {
          const tujuan = TUJUAN[l.langkah]
          const bisa = boleh(peran, tujuan.kemampuan)
          const label = LABEL_LANGKAH_PERSIAPAN[l.langkah]
          return (
            <li key={l.langkah} className="flex items-start gap-3 px-4 py-3">
              <span aria-hidden className="flex w-5 shrink-0 justify-center pt-0.5 font-mono text-tinta-2">
                {l.selesai ? <Check size={16} weight="bold" className="text-hijau" /> : i + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                {bisa ? (
                  <Tautan href={tujuan.href} nada="tinta">
                    {label}
                  </Tautan>
                ) : (
                  <span>{label}</span>
                )}
                {!bisa && !l.selesai && (
                  <span className="text-teks-kecil text-tinta-2">{[`Dikerjakan ${tujuan.oleh}.`, tujuan.catatan].filter(Boolean).join(' ')}</span>
                )}
              </span>
              <Cap varian={l.selesai ? 'selesai' : 'menunggu'} label={l.selesai ? 'Selesai' : 'Belum'} />
            </li>
          )
        })}
      </ol>
      {berikut === null && <p className="text-tinta-2">Semua langkah selesai. Status desa diubah oleh Tim Sinfodes.</p>}
      {berikut !== null && boleh(peran, TUJUAN[berikut].kemampuan) && (
        <TautanTombol href={TUJUAN[berikut].href} varian="utama" className="self-start">
          {`Lanjutkan: ${LABEL_LANGKAH_PERSIAPAN[berikut]}`}
        </TautanTombol>
      )}
    </section>
  )
}
