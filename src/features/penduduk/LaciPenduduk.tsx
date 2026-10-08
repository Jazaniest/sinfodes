import { useQuery } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { opsiKeluarga } from '@/api/keluarga'
import { formatTanggal, formatUmur } from '@/domain/format/tanggal'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import { penandaPenduduk } from '@/domain/penduduk/penanda'
import type { BarisPenduduk } from '@/domain/penduduk/schema'
import { alamatLengkap, kodeWilayahNik } from '@/domain/wilayah/alamat'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { Nik } from '@/ui/domain/Nik'
import { Drawer } from '@/ui/lapisan/Drawer'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Tombol } from '@/ui/tombol/Tombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { jenisKelaminPanjang } from './kolom'
import { PenandaCap } from './PenandaCap'

type Props = { penduduk: BarisPenduduk | null; hariIni: Date; onTutup: () => void; onBukaProfil: (id: string) => void }

/** Laci ringkasan saat baris diklik (SPEC §6.2). "Buat surat untuk orang ini" ditambahkan di Tahap 2B. */
export function LaciPenduduk({ penduduk, hariIni, onTutup, onBukaProfil }: Props) {
  const { desa, dusun } = useSesiAdmin()
  const keluarga = useQuery({ ...opsiKeluarga(penduduk?.keluargaId ?? ''), enabled: penduduk !== null })
  return (
    <Drawer
      isOpen={penduduk !== null}
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul={penduduk?.nama ?? 'Penduduk'}
      aksi={
        penduduk && (
          <Tombol varian="utama" onPress={() => onBukaProfil(penduduk.id)}>
            Buka profil
          </Tombol>
        )
      }
    >
      {penduduk && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <Nik nik={penduduk.nik} salin />
            <PenandaCap
              penanda={penandaPenduduk(penduduk, { kodeWilayahDesa: kodeWilayahNik(desa), hariIni }).filter((p) => p !== 'belum-ada-nik')}
            />
          </div>
          <DescriptionList
            items={[
              { label: 'Jenis kelamin', nilai: jenisKelaminPanjang(penduduk.jenisKelamin) },
              { label: 'Tempat, tanggal lahir', nilai: `${penduduk.tempatLahir}, ${formatTanggal(penduduk.tanggalLahir)}` },
              // Umur hanya bermakna bagi penduduk yang masih hidup; mantan penduduk ditandai cap statusnya.
              ...(penduduk.statusDasar === 'Hidup' ? [{ label: 'Umur', nilai: formatUmur(penduduk.tanggalLahir, hariIni) }] : []),
              { label: 'Alamat', nilai: alamatLengkap(penduduk, dusun, desa.istilahWilayah) },
              { label: 'Pekerjaan', nilai: penduduk.pekerjaan },
              {
                label: 'Nomor KK',
                nilai: (
                  <Tautan href={`/admin/kependudukan/keluarga/${penduduk.keluargaId}`} className="font-mono">
                    {kelompokkanNik(penduduk.nomorKk)}
                  </Tautan>
                ),
              },
            ]}
          />
          <section aria-labelledby="judul-anggota-laci">
            <h3 id="judul-anggota-laci" className="text-label font-medium text-tinta-2 uppercase">
              Anggota keluarga
            </h3>
            {keluarga.isPending ? (
              <BarisKerangka jumlah={3} label="Memuat anggota keluarga…" />
            ) : keluarga.isError ? (
              <ErrorState pesan={pesanGalat(keluarga.error)} onCobaLagi={() => void keluarga.refetch()} />
            ) : (
              <ul className="mt-2 divide-y divide-garis">
                {keluarga.data.anggota.map((a) => (
                  <li key={a.id} className="flex items-baseline justify-between gap-3 py-2">
                    {a.id === penduduk.id ? (
                      <span className="font-medium">{a.nama}</span>
                    ) : (
                      <Tautan href={`/admin/kependudukan/penduduk/${a.id}`} nada="tinta">
                        {a.nama}
                      </Tautan>
                    )}
                    <span className="shrink-0 text-teks-kecil text-tinta-2">
                      {a.hubunganKeluarga} · {formatUmur(a.tanggalLahir, hariIni)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Drawer>
  )
}
