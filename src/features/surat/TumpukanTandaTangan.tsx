import { PenNib } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { pesanGalat } from '@/api/galat'
import { opsiAntrianTtd } from '@/api/surat'
import { asalDesa } from '@/app/alamat'
import type { DetailPermohonan } from '@/domain/surat/permohonan'
import { Cap } from '@/ui/cap/Cap'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { LembarSurat } from '@/ui/dokumen/LembarSurat'
import { PratinjauLembar } from '@/ui/dokumen/PratinjauLembar'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { DaftarLampiran } from './DaftarLampiran'
import { DialogAlasan } from './DialogAlasan'
import { DialogTandaTangani } from './DialogTandaTangani'
import { IsianSurat } from './IsianSurat'
import { dataLembar } from './lembar'
import { DIALOG_ALASAN, useAksiSurat } from './useAksiSurat'

const JEJAK = [{ label: 'Layanan Surat', href: '/admin/surat' }]

/**
 * Tanda tangan untuk Kades (SPEC §7.4 layar 4): surat ditinjau satu per satu seperti membalik tumpukan berkas. Di HP,
 * lembar selebar layar dan bilah aksi menempel di bawah.
 */
export function TumpukanTandaTangan({ sekarang }: { sekarang?: Date }) {
  const { pengguna, desa, dusun } = useSesiAdmin()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const antrian = useQuery(opsiAntrianTtd())
  const [posisi, setPosisi] = useState(0)
  /** Surat yang sudah ditangani di sini; disembunyikan sebelum tumpukan selesai dimuat ulang. */
  const [ditangani, setDitangani] = useState<readonly string[]>([])
  /** Surat yang baru ditandatangani lewat "Tanda tangani": tetap tampil sampai Berikutnya ditekan. */
  const [terbit, setTerbit] = useState<DetailPermohonan | null>(null)
  const [dialog, setDialog] = useState<'tandatangani' | 'kembalikan' | null>(null)
  /** Dibaca saat aksi berhasil; ref, bukan state, supaya nilai dari klik yang sama yang terbaca. */
  const lanjut = useRef(false)
  const [galatDialog, setGalatDialog] = useState<string | undefined>()

  const daftar = (antrian.data ?? []).filter((d) => !ditangani.includes(d.permohonan.id))
  const indeks = daftar.length === 0 ? 0 : Math.min(posisi, daftar.length - 1)
  const sekarangDitinjau = terbit ?? daftar[indeks] ?? null
  const { jalan, sedang, berjalan } = useAksiSurat(sekarangDitinjau?.permohonan.id ?? '', {
    onBerhasil: (baru, aksi) => {
      setDialog(null)
      setDitangani((lama) => [...lama, baru.permohonan.id])
      setTerbit(aksi === 'tandatangani' && !lanjut.current ? baru : null)
    },
    onGalatKolom: (pesan) => {
      if (!dialog) return false
      setGalatDialog(pesan)
      return true
    },
    onKonflik: () => setDialog(null),
  })

  if (antrian.isPending) return <BarisKerangka jumlah={6} label="Memuat surat yang menunggu tanda tangan…" />
  if (antrian.isError) return <ErrorState pesan={pesanGalat(antrian.error)} onCobaLagi={() => void antrian.refetch()} />

  if (!sekarangDitinjau) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader jejak={JEJAK} judul="Tanda tangan" />
        <EmptyState
          judul="Tidak ada surat yang menunggu tanda tangan Anda"
          keterangan="Surat yang diajukan untuk ditandatangani akan muncul di sini."
          aksi={<Tautan href="/admin/surat">Kembali ke Layanan Surat</Tautan>}
        />
      </div>
    )
  }

  const d = sekarangDitinjau
  const p = d.permohonan
  const lembar = dataLembar(d, { desa, dusun, isian: p.isian, hariIni, asal: asalDesa(desa.slug) })
  const buka = (jenis: 'tandatangani' | 'kembalikan') => {
    setGalatDialog(undefined)
    setDialog(jenis)
  }
  const tandaTangani = (passphrase: string, langsungLanjut: boolean) => {
    lanjut.current = langsungLanjut
    setGalatDialog(undefined)
    jalan('tandatangani', { passphrase })
  }
  const kembalikan = DIALOG_ALASAN.kembalikan

  return (
    <div className="flex flex-col gap-6">
      <PageHeader jejak={JEJAK} judul="Tanda tangan" meta={terbit ? 'Surat baru saja ditandatangani' : `${indeks + 1} dari ${daftar.length}`} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:grid-rows-[auto_1fr]">
        <div className="min-w-0 xl:col-start-1 xl:row-span-2 xl:row-start-1">
          <PratinjauLembar label="Pratinjau surat">
            <LembarSurat {...lembar} penanda={p.terbit ? undefined : <Cap varian="draf" />} />
          </PratinjauLembar>
        </div>
        <aside aria-label="Ringkasan surat" className="flex flex-col gap-5 xl:col-start-2 xl:row-start-2">
          {terbit && (
            <Banner nada="berhasil" judul={`Ditandatangani · ${terbit.permohonan.terbit?.nomor ?? ''}`}>
              Surat sudah terbit dan bisa dicetak dari ruang kerjanya.
            </Banner>
          )}
          <DescriptionList
            items={[
              { label: 'Pemohon', nilai: <Tautan href={`/admin/kependudukan/penduduk/${d.pemohon.id}`}>{d.pemohon.nama}</Tautan> },
              { label: 'Jenis surat', nilai: d.jenis.nama },
              { label: 'Ruang kerja', nilai: <Tautan href={`/admin/surat/${p.id}`}>Buka permohonan No. {String(p.noUrut).padStart(3, '0')}</Tautan> },
              { label: 'Catatan operator', nilai: p.catatanInternal },
            ]}
          />
          <section aria-label="Isian penting">
            <h2 className="text-label font-medium text-tinta-2 uppercase">Isian</h2>
            <div className="mt-2">
              <IsianSurat jenis={d.jenis} nilai={p.isian} galat={{}} bisaUbah={false} onUbah={() => {}} />
            </div>
          </section>
          <section aria-label="Lampiran">
            <h2 className="text-label font-medium text-tinta-2 uppercase">Lampiran</h2>
            <div className="mt-2">
              <DaftarLampiran p={p} />
            </div>
          </section>
        </aside>
        {/* Sesudah ringkasan: di HP bilah ini menempel di bawah layar selama surat dan ringkasan dibaca. */}
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap gap-2 border-t border-garis bg-kertas px-4 py-3 max-xl:[html[data-demo-toolbar]_&]:pb-18 sm:mx-0 xl:static xl:col-start-2 xl:row-start-1 xl:border-0 xl:bg-transparent xl:p-0">
          {terbit ? (
            daftar.length > 0 ? (
              <Tombol varian="utama" onPress={() => setTerbit(null)}>
                Berikutnya
              </Tombol>
            ) : (
              <>
                <p className="w-full text-tinta-2">Semua surat sudah ditandatangani.</p>
                <TautanTombol href="/admin/surat">Kembali ke Layanan Surat</TautanTombol>
              </>
            )
          ) : (
            <>
              <Tombol varian="utama" ikon={<PenNib aria-hidden size={16} />} isDisabled={sedang} onPress={() => buka('tandatangani')}>
                Tanda tangani
              </Tombol>
              <Tombol isDisabled={sedang} onPress={() => buka('kembalikan')}>
                Kembalikan
              </Tombol>
              {daftar.length > 1 && (
                <Tombol varian="teks" isDisabled={sedang} onPress={() => setPosisi((indeks + 1) % daftar.length)}>
                  Lewati
                </Tombol>
              )}
            </>
          )}
        </div>
      </div>
      {dialog === 'tandatangani' && (
        <DialogTandaTangani
          judulSurat={d.jenis.nama}
          pemohon={d.pemohon.nama}
          atasNama={pengguna.peran !== 'kades'}
          memuat={berjalan === 'tandatangani'}
          galat={galatDialog}
          onSetuju={(passphrase) => tandaTangani(passphrase, false)}
          onSetujuLanjut={(passphrase) => tandaTangani(passphrase, true)}
          onTutup={() => setDialog(null)}
        />
      )}
      {dialog === 'kembalikan' && (
        <DialogAlasan
          judul={kembalikan.judul}
          subjudul={`${d.jenis.nama} · ${d.pemohon.nama}`}
          label={kembalikan.label}
          keterangan={kembalikan.keterangan}
          labelSetuju={kembalikan.labelSetuju}
          memuat={berjalan === 'kembalikan'}
          galat={galatDialog}
          onSetuju={(catatan) => jalan('kembalikan', { catatan })}
          onTutup={() => setDialog(null)}
        />
      )}
    </div>
  )
}
