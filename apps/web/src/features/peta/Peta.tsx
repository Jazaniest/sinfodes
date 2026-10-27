import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiLapisanPeta } from '@/api/tata-kelola'
import { formatAngka } from '@/domain/format/angka'
import { LABEL_STATUS_KEGIATAN } from '@/domain/pembangunan/schema'
import { LABEL_FASILITAS, LABEL_LAPISAN, LAPISAN_PETA, type JenisLapisan, type LapisanPeta, type ObjekPeta } from '@/domain/peta/schema'
import { namaDusun } from '@/domain/wilayah/alamat'
import type { Desa, Dusun } from '@/domain/wilayah/schema'
import { Cap } from '@/ui/cap/Cap'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { MiniBar } from '@/ui/grafik/MiniBar'
import { Saklar } from '@/ui/isian/Saklar'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'

const PetaDesa = lazy(() => import('./PetaDesa'))
const judulBagian = 'text-label font-medium text-tinta-2 uppercase'

/** Isi panel info objek terpilih; null bila ID-nya tidak dikenal. */
function infoObjek(l: LapisanPeta, o: ObjekPeta | null, dusun: readonly Dusun[], istilah: Desa['istilahWilayah']): ReactNode {
  if (!o) return null
  const namaD = (id: string) => {
    const d = dusun.find((x) => x.id === id)
    return d ? namaDusun(d, istilah) : null
  }
  if (o.jenis === 'kegiatan') {
    const k = l.kegiatan.find((x) => x.id === o.id)
    if (!k) return null
    return (
      <>
        <h3 className="font-serif text-judul-bagian font-medium">{k.nama}</h3>
        <Cap varian={k.status} label={LABEL_STATUS_KEGIATAN[k.status]} />
        <MiniBar label="Progres fisik" nilai={k.progresFisik} maks={100} />
        <p className="text-teks-kecil text-tinta-2">{namaD(k.dusunId)}</p>
        <Tautan href={`/admin/pembangunan/${k.id}`}>Buka kegiatan</Tautan>
      </>
    )
  }
  if (o.jenis === 'fasilitas') {
    const f = l.fasilitas.find((x) => x.id === o.id)
    if (!f) return null
    return (
      <>
        <h3 className="font-serif text-judul-bagian font-medium">{f.nama}</h3>
        <DescriptionList
          items={[
            { label: 'Jenis', nilai: LABEL_FASILITAS[f.jenis] },
            { label: istilah.dusun, nilai: namaD(f.dusunId) },
            { label: 'Keterangan', nilai: f.keterangan },
          ]}
        />
      </>
    )
  }
  const d = dusun.find((x) => x.id === o.id)
  if (!d) return null
  return (
    <>
      <h3 className="font-serif text-judul-bagian font-medium">{namaDusun(d, istilah)}</h3>
      <DescriptionList
        items={[
          { label: `Kepala ${istilah.dusun.toLowerCase()}`, nilai: d.kepalaDusun },
          { label: 'Posyandu', nilai: `Posyandu ${d.posyandu}` },
          { label: `${istilah.rw} / ${istilah.rt}`, nilai: `${formatAngka(d.rw.length)} ${istilah.rw} · ${formatAngka(d.rw.reduce((n, w) => n + w.rt.length, 0))} ${istilah.rt}` },
        ]}
      />
    </>
  )
}

/** Peta Desa (SPEC §8): saklar lapisan, panel info, dan daftar objek sebagai jalan lain tanpa peta. */
export function Peta({ kegiatanAwal }: { kegiatanAwal?: string }) {
  const kueri = useQuery(opsiLapisanPeta())
  const { desa, dusun } = useSesiAdmin()
  const [tampil, setTampil] = useState<Record<JenisLapisan, boolean>>({ dusun: true, fasilitas: true, kegiatan: true })
  const [terpilih, setTerpilih] = useState<ObjekPeta | null>(kegiatanAwal ? { jenis: 'kegiatan', id: kegiatanAwal } : null)
  const [gagal, setGagal] = useState(false)

  if (kueri.isPending) return <BarisKerangka jumlah={6} label="Memuat peta desa…" />
  if (kueri.isError) return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  const l = kueri.data
  const info = infoObjek(l, terpilih, dusun, desa.istilahWilayah)
  const pilihan = (o: ObjekPeta, isi: ReactNode) => (
    <Tombol varian="teks" ukuran="kecil" aria-pressed={terpilih?.jenis === o.jenis && terpilih.id === o.id} onPress={() => setTerpilih(o)}>
      {isi}
    </Tombol>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={[{ label: 'Data desa' }]}
        judul="Peta Desa"
        meta={`${formatAngka(l.dusun.length)} dusun · ${formatAngka(l.fasilitas.length)} fasilitas umum · ${formatAngka(l.kegiatan.length)} kegiatan pembangunan`}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="h-[60vh] min-h-80 overflow-hidden rounded-2 border border-garis bg-kertas-2">
          {gagal ? (
            <div className="flex h-full items-center p-6">
              <Banner nada="peringatan">
                Peta tidak bisa ditampilkan di perangkat ini. Daftar fasilitas dan kegiatan di samping tetap bisa dibuka.
              </Banner>
            </div>
          ) : (
            <Suspense fallback={<p className="p-4 text-tinta-2">Memuat peta…</p>}>
              <PetaDesa lapisan={l} tampil={tampil} terpilih={terpilih} onPilih={setTerpilih} onGagal={() => setGagal(true)} />
            </Suspense>
          )}
        </div>
        <aside aria-label="Lapisan dan objek peta" className="flex flex-col gap-6">
          <section aria-labelledby="judul-lapisan" className="flex flex-col gap-2">
            <h2 id="judul-lapisan" className={judulBagian}>
              Lapisan
            </h2>
            {LAPISAN_PETA.map((j) => (
              <Saklar key={j} isSelected={tampil[j]} onChange={(nyala) => setTampil((lama) => ({ ...lama, [j]: nyala }))}>
                {LABEL_LAPISAN[j]}
              </Saklar>
            ))}
          </section>
          <section aria-labelledby="judul-terpilih" aria-live="polite" className="flex flex-col gap-2">
            <h2 id="judul-terpilih" className={judulBagian}>
              Objek terpilih
            </h2>
            {info ?? <p className="text-tinta-2">Klik objek di peta, atau pilih dari daftar di bawah.</p>}
          </section>
          <section aria-labelledby="judul-fasilitas">
            <h2 id="judul-fasilitas" className={judulBagian}>
              Fasilitas umum
            </h2>
            <ul aria-label="Fasilitas umum" className="mt-1 flex flex-col">
              {l.fasilitas.map((f) => (
                <li key={f.id}>{pilihan({ jenis: 'fasilitas', id: f.id }, `${f.nama} · ${LABEL_FASILITAS[f.jenis]}`)}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="judul-kegiatan">
            <h2 id="judul-kegiatan" className={judulBagian}>
              Kegiatan pembangunan
            </h2>
            <ul aria-label="Kegiatan pembangunan" className="mt-1 flex flex-col">
              {l.kegiatan.map((k) => (
                <li key={k.id}>{pilihan({ jenis: 'kegiatan', id: k.id }, `${k.nama} · ${LABEL_STATUS_KEGIATAN[k.status]}`)}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
