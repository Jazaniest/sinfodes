import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiLembaga } from '@/api/tata-kelola'
import { formatAngka } from '@/domain/format/angka'
import { kelompokLembaga, LABEL_LEMBAGA, NAMA_LENGKAP_LEMBAGA, teksMasaBakti, type Pengurus } from '@/domain/lembaga/schema'
import { boleh } from '@/domain/pengguna/hak-akses'
import { namaDusunPendek } from '@/domain/wilayah/alamat'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Tabs } from '@/ui/navigasi/Tabs'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'

const sel = 'px-3 py-2.5 align-top'

function TabelPengurus({ judul, anggota, denganDusun }: { judul: string; anggota: readonly Pengurus[]; denganDusun: boolean }) {
  const { pengguna, desa, dusun } = useSesiAdmin()
  const bolehProfil = boleh(pengguna.peran, 'penduduk.lihat')
  return (
    <table className="w-full border-y border-garis bg-lembar text-left">
      <caption className="sr-only">{judul}</caption>
      <thead>
        <tr className="text-teks-kecil text-tinta-2">
          <th scope="col" className={sel}>
            Nama
          </th>
          <th scope="col" className={sel}>
            Jabatan
          </th>
          {denganDusun && (
            <th scope="col" className={sel}>
              {desa.istilahWilayah.dusun}
            </th>
          )}
          <th scope="col" className={sel}>
            Masa bakti
          </th>
        </tr>
      </thead>
      <tbody>
        {anggota.map((p) => {
          const d = dusun.find((x) => x.id === p.dusunId)
          return (
            <tr key={p.id} className="border-t border-garis">
              <td className={`${sel} font-medium`}>
                {p.pendudukId && bolehProfil ? (
                  <Tautan href={`/admin/kependudukan/penduduk/${p.pendudukId}`} nada="tinta">
                    {p.nama}
                  </Tautan>
                ) : (
                  p.nama
                )}
              </td>
              <td className={sel}>{p.jabatan}</td>
              {denganDusun && <td className={sel}>{d ? namaDusunPendek(d, desa.istilahWilayah) : '—'}</td>}
              <td className={`${sel} whitespace-nowrap tabular-nums`}>{teksMasaBakti(p.masaBakti)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Lembaga desa (SPEC §8): hanya lihat. Data yang sama dipakai halaman Profil di website (Tahap 5). */
export function DaftarLembaga() {
  const kueri = useQuery(opsiLembaga())
  const kelompok = useMemo(() => (kueri.data ? kelompokLembaga(kueri.data) : []), [kueri.data])
  const meta = kueri.data ? `${formatAngka(kelompok.length)} lembaga · ${formatAngka(kueri.data.length)} pengurus` : null

  return (
    <div>
      <PageHeader jejak={[{ label: 'Tata kelola' }]} judul="Lembaga Desa" meta={meta} />
      <div className="pt-6">
        {kueri.isPending ? (
          <BarisKerangka jumlah={6} label="Memuat lembaga desa…" />
        ) : kueri.isError ? (
          <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
        ) : kelompok.length === 0 ? (
          <EmptyState judul="Belum ada data lembaga desa" />
        ) : (
          <Tabs
            label="Lembaga desa"
            items={kelompok.map((k) => ({
              id: k.lembaga,
              label: `${LABEL_LEMBAGA[k.lembaga]} (${formatAngka(k.anggota.length)})`,
              isi: (
                <TabelPengurus
                  judul={NAMA_LENGKAP_LEMBAGA[k.lembaga]}
                  anggota={k.anggota}
                  denganDusun={k.lembaga === 'rt-rw' || k.lembaga === 'kader-posyandu'}
                />
              ),
            }))}
          />
        )}
      </div>
    </div>
  )
}
