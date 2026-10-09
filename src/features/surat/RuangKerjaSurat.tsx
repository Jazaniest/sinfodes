import { FileImage, FilePdf } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { segarkanSurat } from '@/api/segarkan'
import { kunciSurat, opsiPermohonan, ubahPermohonan } from '@/api/surat'
import { formatAngka } from '@/domain/format/angka'
import { formatJam, formatTanggal, formatWaktuLog } from '@/domain/format/tanggal'
import { boleh } from '@/domain/pengguna/hak-akses'
import { JUDUL_KEJADIAN } from '@/domain/surat/alur'
import { samaIsian } from '@/domain/surat/jenis'
import { LABEL_KANAL, type DetailPermohonan, type Permohonan } from '@/domain/surat/permohonan'
import { alamatLengkap } from '@/domain/wilayah/alamat'
import { Cap } from '@/ui/cap/Cap'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { Timeline } from '@/ui/data/Timeline'
import { LembarSurat } from '@/ui/dokumen/LembarSurat'
import { NomorSurat } from '@/ui/dokumen/NomorSurat'
import { PratinjauLembar } from '@/ui/dokumen/PratinjauLembar'
import { Nik } from '@/ui/domain/Nik'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { TextArea } from '@/ui/isian/TextArea'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { AksiSurat } from './AksiSurat'
import { CapPermohonan } from './CapPermohonan'
import { CetakSurat } from './CetakSurat'
import { IsianSurat } from './IsianSurat'
import { dataLembar } from './lembar'

type Props = { id: string; sekarang?: Date; onKotor?: (kotor: boolean) => void }

function Bagian({ judul, children }: { judul: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-label font-medium text-tinta-2 uppercase">
        {judul}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

/** Keterangan di bawah Cap: dikembalikan, ditolak, dibatalkan, menunggu siapa, atau data surat yang sudah terbit. */
function KeteranganStatus({ d }: { d: DetailPermohonan }) {
  const p = d.permohonan
  return (
    <>
      {p.dikembalikan && (
        <Banner nada="peringatan" judul={`Dikembalikan oleh ${p.dikembalikan.oleh.nama}`}>
          {p.dikembalikan.catatan}
        </Banner>
      )}
      {p.penolakan && (
        <Banner nada="galat" judul={`Ditolak oleh ${p.penolakan.oleh.nama}`}>
          {p.penolakan.catatan}
        </Banner>
      )}
      {p.pembatalan && (
        <Banner nada="galat" judul={`Dibatalkan pada ${formatTanggal(p.pembatalan.pada)}`}>
          {p.pembatalan.catatan} Nomor suratnya tetap tercatat dan tidak dipakai ulang.
        </Banner>
      )}
      {p.status === 'perlu-ttd' && (
        <p className="text-tinta-2">
          {p.tahap === 'paraf'
            ? 'Menunggu paraf Sekretaris Desa, lalu tanda tangan Kepala Desa.'
            : `Menunggu tanda tangan Kepala Desa${d.jenis.bolehAtasNama ? ', atau Sekretaris Desa atas nama Kepala Desa' : ''}.`}
        </p>
      )}
      {p.terbit && (
        <DescriptionList
          items={[
            { label: 'Nomor surat', nilai: <NomorSurat nomor={p.terbit.nomor} /> },
            {
              label: 'Ditandatangani',
              nilai: `${p.terbit.penandatangan.peran === 'sekdes' ? 'a.n. Kepala Desa, ' : ''}${p.terbit.penandatangan.nama} · ${formatWaktuLog(p.terbit.pada)}`,
            },
            { label: 'Kode verifikasi', nilai: <span className="font-mono">{p.terbit.kodeVerifikasi}</span> },
            { label: 'Berlaku sampai', nilai: p.terbit.berlakuSampai ? formatTanggal(p.terbit.berlakuSampai) : 'Tanpa batas waktu' },
            {
              label: 'Diambil',
              nilai: p.diambil ? `Sudah diambil · ${formatWaktuLog(p.diambil.pada)} · ${p.diambil.oleh.nama}` : 'Belum diambil',
            },
          ]}
        />
      )}
    </>
  )
}

/** Berkas persyaratan dari layanan warga. Demo tidak menyimpan gambarnya, jadi hanya nama dan ukurannya. */
function DaftarLampiran({ p }: { p: Permohonan }) {
  if (p.kanal === 'loket') return <p className="text-tinta-2">Permohonan loket: berkas persyaratan diperiksa langsung di kantor desa.</p>
  if (p.lampiran.length === 0) return <p className="text-tinta-2">Tidak ada lampiran.</p>
  return (
    <ul aria-label="Lampiran dari warga" className="flex flex-col gap-2">
      {p.lampiran.map((l) => (
        <li key={l.id} className="flex items-center gap-3 rounded-1 border border-garis bg-lembar px-3 py-2">
          {l.berkas.endsWith('.pdf') ? (
            <FilePdf aria-hidden size={20} className="shrink-0 text-tinta-2" />
          ) : (
            <FileImage aria-hidden size={20} className="shrink-0 text-tinta-2" />
          )}
          <span className="min-w-0">
            <span className="block font-medium">{l.syarat}</span>
            <span className="block truncate text-teks-kecil text-tinta-2">
              {l.berkas} · {formatAngka(l.ukuranKb)} KB
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Catatan antarpetugas (SPEC §7.4); tidak terlihat oleh pemohon. */
function CatatanInternal({ d, bisaUbah }: { d: DetailPermohonan; bisaUbah: boolean }) {
  const queryClient = useQueryClient()
  const tersimpan = d.permohonan.catatanInternal ?? ''
  const [teks, setTeks] = useState(tersimpan)
  const simpan = useMutation({
    mutationFn: () => ubahPermohonan(d.permohonan.id, { catatanInternal: teks.trim() || null }),
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciSurat.detail(d.permohonan.id), baru)
      setTeks(baru.permohonan.catatanInternal ?? '')
      tampilkanToast({ pesan: 'Catatan internal disimpan.', nada: 'berhasil' })
    },
    onError: (galat) => tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' }),
  })
  if (!bisaUbah) return <p className={tersimpan ? undefined : 'text-tinta-2'}>{tersimpan || 'Belum ada catatan.'}</p>
  return (
    <div className="flex flex-col gap-2">
      <TextArea label="Catatan untuk petugas" keterangan="Tidak terlihat oleh pemohon." value={teks} onChange={setTeks} maxLength={1000} />
      {teks.trim() !== tersimpan && (
        <Tombol ukuran="kecil" memuat={simpan.isPending} onPress={() => simpan.mutate()} className="self-start">
          Simpan catatan
        </Tombol>
      )}
    </div>
  )
}

/** Ruang kerja surat (SPEC §7.4 layar 3): lembar di kiri, panel status, riwayat, pemohon, isian, dan aksi di kanan. */
export function RuangKerjaSurat({ id, sekarang, onKotor }: Props) {
  const { pengguna, desa, dusun } = useSesiAdmin()
  const queryClient = useQueryClient()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const kueri = useQuery(opsiPermohonan(id))
  const [ubahan, setUbahan] = useState<Record<string, string> | null>(null)
  const [galatIsian, setGalatIsian] = useState<Record<string, string>>({})
  const [cetak, setCetak] = useState(false)
  const panelIsian = useRef<HTMLDivElement>(null)
  const isianTersimpan = kueri.data?.permohonan.isian
  const kotor = ubahan !== null && isianTersimpan !== undefined && !samaIsian(ubahan, isianTersimpan)

  useEffect(() => {
    onKotor?.(kotor)
  }, [kotor, onKotor])

  const simpan = useMutation({
    mutationFn: (isian: Record<string, string>) => ubahPermohonan(id, { isian }),
    onSuccess: (baru) => {
      queryClient.setQueryData(kunciSurat.detail(id), baru)
      void segarkanSurat(queryClient)
      setUbahan(null)
      tampilkanToast({ pesan: 'Isian surat disimpan.', nada: 'berhasil' })
    },
    onError: (galat) => tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' }),
  })

  if (kueri.isPending) return <BarisKerangka jumlah={8} label="Memuat permohonan…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <EmptyState
          judul="Permohonan tidak ditemukan"
          keterangan="Permohonan ini tidak ada, atau berasal dari luar wilayah yang bisa Anda lihat."
          aksi={<Tautan href="/admin/surat">Kembali ke daftar permohonan</Tautan>}
        />
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }

  const d = kueri.data
  const p = d.permohonan
  const isian = ubahan ?? p.isian
  const bisaUbahIsian = p.status === 'diproses' && boleh(pengguna.peran, 'surat.proses')
  const lembar = dataLembar(d, { desa, dusun, isian, hariIni, asal: window.location.origin })
  const penanda = p.status === 'dibatalkan' ? <Cap varian="dibatalkan" /> : p.terbit ? undefined : <Cap varian="draf" />
  const ubahIsian = (kunci: string, nilai: string) => {
    setUbahan({ ...isian, [kunci]: nilai })
    setGalatIsian((lama) => {
      const sisa = { ...lama }
      delete sisa[kunci]
      return sisa
    })
  }
  const pemohon = [
    { label: 'Nama', nilai: <Tautan href={`/admin/kependudukan/penduduk/${d.pemohon.id}`}>{d.pemohon.nama}</Tautan> },
    { label: 'NIK', nilai: <Nik nik={d.pemohon.nik} /> },
    { label: 'Alamat', nilai: alamatLengkap(d.pemohon, dusun, desa.istilahWilayah) },
    { label: 'Telepon', nilai: d.pemohon.telepon && <span className="font-mono">{d.pemohon.telepon}</span> },
    ...(d.subjek
      ? [
          {
            label: d.jenis.subjek === 'kelahiran' ? 'Bayi' : 'Yang meninggal',
            nilai: <Tautan href={`/admin/kependudukan/penduduk/${d.subjek.id}`}>{d.subjek.nama}</Tautan>,
          },
        ]
      : []),
  ]

  return (
    <>
      <div className="flex flex-col gap-6 print:hidden">
        <PageHeader
          jejak={[{ label: 'Layanan Surat', href: '/admin/surat' }]}
          judul={d.jenis.nama}
          meta={`${d.pemohon.nama} · No. ${String(p.noUrut).padStart(3, '0')} · masuk ${formatTanggal(p.masukPada, 'pendek')} pukul ${formatJam(p.masukPada)} · ${LABEL_KANAL[p.kanal]}`}
        />
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <PratinjauLembar label="Pratinjau surat">
            <LembarSurat {...lembar} penanda={penanda} />
          </PratinjauLembar>
          <aside
            aria-label="Panel permohonan"
            className="flex flex-col gap-6 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1"
          >
            <Bagian judul="Status">
              <div className="flex flex-col gap-3">
                <CapPermohonan p={{ ...p, dikembalikan: p.dikembalikan !== null }} />
                <KeteranganStatus d={d} />
                <AksiSurat
                  d={d}
                  isian={isian}
                  onBerhasil={(aksi) => {
                    if (aksi === 'ajukan-ttd') setUbahan(null)
                    setGalatIsian({})
                  }}
                  onGalatIsian={(galat) => {
                    setGalatIsian(galat)
                    fokusIsianSalah(panelIsian.current)
                  }}
                  onCetak={() => setCetak(true)}
                />
              </div>
            </Bagian>
            <Bagian judul="Riwayat">
              <Timeline
                label="Riwayat permohonan"
                entri={[...p.riwayat].reverse().map((r) => ({
                  id: r.id,
                  waktu: formatWaktuLog(r.waktu),
                  judul: JUDUL_KEJADIAN[r.kejadian],
                  keterangan: [r.oleh.nama, r.catatan].filter(Boolean).join(' · '),
                }))}
              />
            </Bagian>
            <Bagian judul="Pemohon">
              <DescriptionList items={pemohon} />
            </Bagian>
            <Bagian judul="Isian surat">
              <div ref={panelIsian} className="flex flex-col gap-4">
                <IsianSurat jenis={d.jenis} nilai={isian} galat={galatIsian} bisaUbah={bisaUbahIsian} onUbah={ubahIsian} />
                {bisaUbahIsian && kotor && (
                  <div className="flex flex-wrap gap-2">
                    <Tombol memuat={simpan.isPending} onPress={() => simpan.mutate(isian)}>
                      Simpan isian
                    </Tombol>
                    <Tombol
                      varian="teks"
                      isDisabled={simpan.isPending}
                      onPress={() => {
                        setUbahan(null)
                        setGalatIsian({})
                      }}
                    >
                      Batalkan perubahan
                    </Tombol>
                  </div>
                )}
              </div>
            </Bagian>
            <Bagian judul="Lampiran dari warga">
              <DaftarLampiran p={p} />
            </Bagian>
            <Bagian judul="Catatan internal">
              <CatatanInternal key={p.id} d={d} bisaUbah={boleh(pengguna.peran, 'surat.proses')} />
            </Bagian>
          </aside>
        </div>
      </div>
      {cetak && <CetakSurat lembar={lembar} onSelesai={() => setCetak(false)} />}
    </>
  )
}
