import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { pesanGalat } from '@/api/galat'
import { aktifkanLagiJenisSurat, kunciSurat } from '@/api/surat'
import { asalDesa } from '@/app/alamat'
import { formatAngka } from '@/domain/format/angka'
import type { DetailJenisSurat } from '@/domain/surat/ubah-jenis'
import { Cap } from '@/ui/cap/Cap'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { LembarSurat } from '@/ui/dokumen/LembarSurat'
import { lebarLembarCm } from '@/ui/dokumen/ukuran-kertas'
import { PratinjauLembar } from '@/ui/dokumen/PratinjauLembar'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'
import { useSesiAdmin } from '../../admin/sesi-konteks'
import { useBoleh } from '../../admin/useBoleh'
import { dataLembar } from '../lembar'

const JEJAK = [
  { label: 'Layanan Surat', href: '/admin/surat' },
  { label: 'Jenis Surat', href: '/admin/surat/jenis' },
]

/**
 * Jenis surat yang diarsipkan (SPEC-V0.2 12.1): hanya dibaca. Surat lamanya tetap sah; mengubah jenisnya baru bisa setelah
 * dikeluarkan dari arsip, dan layanannya tetap mati sampai desa menyalakannya.
 */
export function JenisArsip({ detail, sekarang }: { detail: DetailJenisSurat; sekarang?: Date }) {
  const j = detail.jenis
  const queryClient = useQueryClient()
  const boleh = useBoleh()
  const { desa, dusun } = useSesiAdmin()
  const hariIni = useMemo(() => sekarang ?? new Date(), [sekarang])
  const lembar = dataLembar(
    {
      jenis: j,
      pemohon: detail.contoh.pemohon,
      subjek: detail.contoh.subjek,
      mutasi: detail.contoh.mutasi,
      pengaturan: detail.pengaturan,
      pejabat: detail.pejabat,
      permohonan: { terbit: null },
    },
    { desa, dusun, isian: detail.contoh.isian, hariIni, asal: asalDesa(desa.slug) },
  )
  const aktifkanLagi = useMutation({
    mutationFn: () => aktifkanLagiJenisSurat(j.id),
    onSuccess: () => {
      // Detail dan daftar dimuat ulang; layar ini lalu berganti menjadi editor biasa.
      void queryClient.invalidateQueries({ queryKey: kunciSurat.jenis })
      tampilkanToast({ pesan: `${j.nama} dikeluarkan dari arsip. Layanannya masih mati; nyalakan bila sudah siap.`, nada: 'berhasil' })
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={JEJAK}
        judul={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {j.nama}{' '}
            <Cap varian="nonaktif" label="Diarsipkan" />
          </span>
        }
        meta={`${j.kode} · dipakai ${formatAngka(j.jumlahPakai)} kali dalam 12 bulan`}
      />
      <Banner
        nada="peringatan"
        aksi={
          boleh('pengaturan.kelola') && (
            <Tombol varian="utama" memuat={aktifkanLagi.isPending} onPress={() => aktifkanLagi.mutate()}>
              Aktifkan lagi
            </Tombol>
          )
        }
      >
        Jenis ini diarsipkan. Surat lamanya tetap sah. Aktifkan lagi untuk mengubahnya.
      </Banner>
      <DescriptionList
        items={[
          { label: 'Kode klasifikasi', nilai: j.klasifikasi },
          { label: 'Penandatangan', nilai: j.bolehAtasNama ? 'Kepala Desa; boleh a.n. Sekretaris Desa' : 'Kepala Desa' },
          { label: 'Masa berlaku', nilai: j.masaBerlakuBulan ? `${formatAngka(j.masaBerlakuBulan)} bulan` : 'Tanpa batas waktu' },
          { label: 'Syarat', nilai: j.syarat.length > 0 ? j.syarat.join(', ') : null },
          { label: 'Isian tambahan', nilai: j.isian.length > 0 ? j.isian.map((d) => d.label).join(', ') : null },
        ]}
      />
      <PratinjauLembar label="Pratinjau surat" lebarCm={lebarLembarCm(lembar.tataLetak)}>
        <LembarSurat {...lembar} penanda={<Cap varian="draf" />} />
      </PratinjauLembar>
    </div>
  )
}
