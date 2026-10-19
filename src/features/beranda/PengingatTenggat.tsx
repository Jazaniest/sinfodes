import { formatTanggal } from '@/domain/format/tanggal'
import { kalimatSisa, type PengingatTenggat as Pengingat } from '@/domain/kabupaten/tenggat'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Banner } from '@/ui/umpan-balik/Banner'

/** Batas nada peringatan: tenggat seminggu lagi atau kurang. */
const DEKAT_HARI = 7

/** Pengingat tenggat laporan ke kabupaten di Beranda (SPEC-V0.2 §8.3 butir 4); tiap baris membuka bagiannya di Keuangan. */
export function PengingatTenggat({ daftar }: { daftar: readonly Pengingat[] }) {
  if (daftar.length === 0) return null
  const judul = `Tenggat laporan ke Kabupaten ${daftar[0].kabupaten}`
  return (
    <section aria-label={judul}>
      <Banner nada={daftar.some((p) => p.sisaHari <= DEKAT_HARI) ? 'peringatan' : 'info'} judul={judul}>
        <ul className="flex flex-col gap-1">
          {daftar.map((p) => (
            <li key={p.id}>
              <Tautan href="/admin/keuangan#laporan-kabupaten" nada="tinta">
                {`${p.nama} · ${formatTanggal(p.tanggal)} · ${kalimatSisa(p.sisaHari)}`}
              </Tautan>
            </li>
          ))}
        </ul>
      </Banner>
    </section>
  )
}
