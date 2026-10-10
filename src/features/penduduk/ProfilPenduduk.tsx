import { CaretDown, FileText, PencilSimple } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { opsiKeluarga } from '@/api/keluarga'
import { opsiPenduduk, opsiRiwayatPenduduk } from '@/api/penduduk'
import { formatJam, formatTanggal, formatUmur } from '@/domain/format/tanggal'
import type { JenisMutasi } from '@/domain/mutasi/schema'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import { penandaPenduduk, penandaStatus } from '@/domain/penduduk/penanda'
import { LABEL_FIELD, type EntriRiwayat } from '@/domain/penduduk/riwayat'
import { boleh } from '@/domain/pengguna/hak-akses'
import { alamatLengkap, kodeWilayahNik } from '@/domain/wilayah/alamat'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { Timeline, type EntriTimeline } from '@/ui/data/Timeline'
import { Nik } from '@/ui/domain/Nik'
import { MenuAksi } from '@/ui/lapisan/Menu'
import { Tabs } from '@/ui/navigasi/Tabs'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { TautanTombol } from '@/ui/tombol/TautanTombol'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka, Skeleton } from '@/ui/umpan-balik/Skeleton'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { BannerLaporan } from '../laporan/BannerLaporan'
import { menuMutasiPenduduk } from '../mutasi/menu'
import { DaftarSuratPenduduk } from '../surat/DaftarSuratPenduduk'
import { hrefBuatSurat } from '../surat/buat/cari-buat'
import { jenisKelaminPanjang } from './kolom'
import { PenandaCap } from './PenandaCap'
import { isiTawaranSurat, type TawaranSurat } from './tawaran-surat'

const JEJAK = [{ label: 'Kependudukan' }, { label: 'Penduduk', href: '/admin/kependudukan/penduduk' }]
const JUDUL_MUTASI: Readonly<Record<JenisMutasi, string>> = {
  lahir: 'Kelahiran dicatat',
  meninggal: 'Kematian dicatat',
  pindah: 'Pindah keluar dicatat',
  datang: 'Kedatangan dicatat',
}

/** Waktu log: "24 Sep 2026 · pukul 09.12 WIB" (SPEC §4.5). */
const waktuLog = (iso: string) => `${formatTanggal(iso, 'pendek')} · pukul ${formatJam(iso)} WIB`

function keTimeline(e: EntriRiwayat): EntriTimeline {
  switch (e.jenis) {
    case 'dibuat':
      return { id: e.id, waktu: waktuLog(e.waktu), judul: 'Data dibuat' }
    case 'ubah':
      return {
        id: e.id,
        waktu: waktuLog(e.waktu),
        judul: `${LABEL_FIELD[e.field]}: ${e.nilaiLama ?? 'kosong'} → ${e.nilaiBaru ?? 'kosong'}`,
        keterangan: e.oleh.nama,
      }
    case 'mutasi':
      return {
        id: e.id,
        waktu: waktuLog(e.waktu),
        judul: JUDUL_MUTASI[e.mutasi],
        keterangan: `Terjadi ${formatTanggal(e.tanggal)} · ${e.oleh.nama}`,
      }
  }
}

type Props = {
  id: string
  sekarang?: Date
  /** `?surat=` setelah mutasi dicatat (SPEC §6.6). */
  tawaran?: TawaranSurat
  onTutupTawaran?: () => void
}

/** Profil penduduk (SPEC §6.3): lembar utama + kolom samping Riwayat dan Surat. */
export function ProfilPenduduk({ id, sekarang, tawaran, onTutupTawaran }: Props) {
  const { pengguna, desa, dusun } = useSesiAdmin()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const kueri = useQuery(opsiPenduduk(id))
  const riwayat = useQuery(opsiRiwayatPenduduk(id))
  const keluarga = useQuery({ ...opsiKeluarga(kueri.data?.keluargaId ?? ''), enabled: kueri.data !== undefined })

  if (kueri.isPending) return <BarisKerangka jumlah={6} label="Memuat profil penduduk…" />
  if (kueri.isError) {
    if (kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
      return (
        <EmptyState
          judul="Data penduduk tidak ditemukan"
          keterangan="Data ini tidak ada, atau berada di luar wilayah yang bisa Anda lihat."
          aksi={<Tautan href="/admin/kependudukan/penduduk">Kembali ke daftar penduduk</Tautan>}
        />
      )
    }
    return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  }

  const p = kueri.data
  const hidup = p.statusDasar === 'Hidup'
  const status = penandaStatus(p)
  const penanda = [
    status,
    ...penandaPenduduk(p, { kodeWilayahDesa: kodeWilayahNik(desa), hariIni }).filter((x) => x !== status && x !== 'belum-ada-nik'),
  ]
  const mutasiAkhir = riwayat.data?.find(
    (e): e is Extract<EntriRiwayat, { jenis: 'mutasi' }> => e.jenis === 'mutasi' && (e.mutasi === 'meninggal' || e.mutasi === 'pindah'),
  )
  const anggotaLain = keluarga.data?.anggota.filter((a) => a.id !== p.id)
  const isiTawaran = tawaran && boleh(pengguna.peran, 'surat.proses') ? isiTawaranSurat(tawaran, p) : null

  const isiRiwayat = riwayat.isPending ? (
    <BarisKerangka jumlah={3} label="Memuat riwayat…" />
  ) : riwayat.isError ? (
    <ErrorState pesan={pesanGalat(riwayat.error)} onCobaLagi={() => void riwayat.refetch()} />
  ) : (
    <Timeline label="Riwayat perubahan dan mutasi" entri={riwayat.data.map(keTimeline)} />
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={JEJAK}
        judul={p.nama}
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <Nik nik={p.nik} salin />
            <PenandaCap penanda={penanda} />
          </span>
        }
        aksi={
          <>
            {hidup && boleh(pengguna.peran, 'surat.proses') && (
              <TautanTombol varian="utama" href={hrefBuatSurat({ pemohon: p.id })} ikon={<FileText aria-hidden size={16} />}>
                Buat surat
              </TautanTombol>
            )}
            {boleh(pengguna.peran, 'penduduk.ubah') && (
              <>
                <TautanTombol href={`/admin/kependudukan/penduduk/${p.id}/ubah`} ikon={<PencilSimple aria-hidden size={16} />}>
                  Ubah
                </TautanTombol>
                {hidup && (
                  <MenuAksi
                    pemicu={<Tombol ikon={<CaretDown aria-hidden size={14} />}>Catat mutasi</Tombol>}
                    items={menuMutasiPenduduk(p.id)}
                    placement="bottom end"
                  />
                )}
              </>
            )}
          </>
        }
      />
      {isiTawaran && (
        <Banner
          nada="berhasil"
          judul={isiTawaran.judul}
          aksi={
            <div className="flex flex-wrap items-center gap-2">
              <TautanTombol varian="utama" href={isiTawaran.href} ikon={<FileText aria-hidden size={16} />}>
                {isiTawaran.tombol}
              </TautanTombol>
              {onTutupTawaran && (
                <Tombol varian="teks" onPress={onTutupTawaran}>
                  Nanti saja
                </Tombol>
              )}
            </div>
          }
        >
          Isian surat diambil dari data yang baru dicatat.
        </Banner>
      )}
      <BannerLaporan penduduk={p} hariIni={hariIni} />
      {!hidup && (
        <Banner
          nada="info"
          judul={
            mutasiAkhir
              ? `${p.statusDasar === 'Meninggal' ? 'Meninggal' : 'Pindah keluar'} pada ${formatTanggal(mutasiAkhir.tanggal)}`
              : `Berstatus ${p.statusDasar}`
          }
        >
          Datanya tetap disimpan untuk arsip desa dan tidak dihitung sebagai jiwa.
        </Banner>
      )}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6 rounded-2 border border-garis bg-lembar p-5 sm:p-6">
          <DescriptionList
            judul="Identitas"
            items={[
              { label: 'NIK', nilai: <Nik nik={p.nik} /> },
              { label: 'Nama lengkap', nilai: p.nama },
              { label: 'Jenis kelamin', nilai: jenisKelaminPanjang(p.jenisKelamin) },
              { label: 'Golongan darah', nilai: p.golonganDarah },
              { label: 'Agama', nilai: p.agama },
              { label: 'Kewarganegaraan', nilai: p.kewarganegaraan },
            ]}
          />
          <DescriptionList
            judul="Kelahiran"
            items={[
              { label: 'Tempat lahir', nilai: p.tempatLahir },
              {
                label: 'Tanggal lahir',
                nilai: hidup ? `${formatTanggal(p.tanggalLahir)} · ${formatUmur(p.tanggalLahir, hariIni)}` : formatTanggal(p.tanggalLahir),
              },
              { label: 'Nomor akta lahir', nilai: p.nomorAktaLahir && <span className="font-mono">{p.nomorAktaLahir}</span> },
            ]}
          />
          <DescriptionList
            judul="Keluarga"
            items={[
              {
                label: 'Nomor KK',
                nilai: keluarga.data ? (
                  <Tautan href={`/admin/kependudukan/keluarga/${p.keluargaId}`} className="font-mono">
                    {kelompokkanNik(keluarga.data.keluarga.nomorKk)}
                  </Tautan>
                ) : keluarga.isError ? (
                  'Tidak dapat dimuat'
                ) : (
                  <Skeleton className="h-4 w-40" />
                ),
              },
              { label: 'Hubungan dalam keluarga', nilai: p.hubunganKeluarga },
              {
                label: 'Anggota lain',
                nilai: anggotaLain ? (
                  anggotaLain.length === 0 ? (
                    'Tidak ada anggota lain'
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {anggotaLain.map((a) => (
                        <li key={a.id}>
                          <Tautan href={`/admin/kependudukan/penduduk/${a.id}`} nada="tinta">
                            {a.nama}
                          </Tautan>
                          <span className="text-teks-kecil text-tinta-2"> · {a.hubunganKeluarga}</span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : keluarga.isError ? (
                  'Tidak dapat dimuat'
                ) : (
                  <Skeleton className="h-4 w-56" />
                ),
              },
            ]}
          />
          <DescriptionList
            judul="Alamat"
            items={[
              { label: 'Alamat', nilai: alamatLengkap(p, dusun, desa.istilahWilayah) },
              { label: 'Wilayah', nilai: `Desa ${desa.nama}, Kec. ${desa.kecamatan.nama}, Kab. ${desa.kabupaten.nama}, ${desa.provinsi.nama}` },
            ]}
          />
          <DescriptionList
            judul="Pendidikan dan pekerjaan"
            items={[
              { label: 'Pendidikan', nilai: p.pendidikan },
              { label: 'Pekerjaan', nilai: p.pekerjaan },
            ]}
          />
          <DescriptionList judul="Perkawinan" items={[{ label: 'Status perkawinan', nilai: p.statusPerkawinan }]} />
          <DescriptionList
            judul="Orang tua"
            items={[
              { label: 'Nama ayah', nilai: p.namaAyah || null },
              { label: 'Nama ibu', nilai: p.namaIbu || null },
            ]}
          />
          <DescriptionList
            judul="Dokumen"
            items={[
              { label: 'KTP-el', nilai: p.ktpEl },
              { label: 'Status penduduk', nilai: p.statusPenduduk },
            ]}
          />
          <DescriptionList
            judul="Kontak"
            items={[
              { label: 'Telepon / WhatsApp', nilai: p.telepon && <span className="font-mono">{p.telepon}</span> },
              { label: 'Catatan', nilai: p.catatan },
            ]}
          />
        </div>
        <aside aria-label="Riwayat dan surat">
          <Tabs
            label="Kolom samping profil"
            items={[
              { id: 'riwayat', label: 'Riwayat', isi: isiRiwayat },
              ...(boleh(pengguna.peran, 'surat.lihat')
                ? [{ id: 'surat', label: 'Surat', isi: <DaftarSuratPenduduk pendudukId={p.id} /> }]
                : []),
            ]}
          />
        </aside>
      </div>
    </div>
  )
}
