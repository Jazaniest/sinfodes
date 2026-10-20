import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pesanGalat } from '@/api/galat'
import { kunciSurat, opsiJenisSurat, ubahJenisSurat } from '@/api/surat'
import { formatAngka } from '@/domain/format/angka'
import { useBoleh } from '@/features/admin/useBoleh'
import type { JenisDenganPakai } from '@/domain/surat/jenis'
import { Saklar } from '@/ui/isian/Saklar'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka, Skeleton } from '@/ui/umpan-balik/Skeleton'
import { TabSurat } from '../TabSurat'

type UbahSaklar = { aktif?: boolean; online?: boolean }

/** "Kepala Desa; boleh a.n. Sekretaris Desa · berlaku 3 bulan · dipakai 186 kali dalam 12 bulan". */
function ringkasJenis(j: JenisDenganPakai): string {
  return [
    j.bolehAtasNama ? 'Kepala Desa; boleh a.n. Sekretaris Desa' : 'Kepala Desa',
    j.wajibParaf ? 'diparaf Sekretaris Desa' : null,
    j.masaBerlakuBulan ? `berlaku ${formatAngka(j.masaBerlakuBulan)} bulan` : 'berlaku tanpa batas waktu',
    `dipakai ${formatAngka(j.jumlahPakai)} kali dalam 12 bulan`,
  ]
    .filter(Boolean)
    .join(' · ')
}

// "kini dilayani": data tidak menyimpan riwayat saklar, jadi "kembali" tidak bisa dipastikan untuk desa baru (tahap 6D).
function pesanSaklar(j: JenisDenganPakai, ubah: UbahSaklar): string {
  if (ubah.aktif !== undefined) {
    return ubah.aktif ? `${j.nama} kini dilayani.` : `${j.nama} tidak dilayani lagi. Permohonan yang sudah ada tetap bisa diproses.`
  }
  return ubah.online ? `${j.nama} bisa diajukan lewat layanan warga.` : `${j.nama} hanya dilayani di kantor desa.`
}

/**
 * Jenis surat desa (SPEC §7.4 layar 6). Saklar langsung tersimpan: tampilan berubah seketika dan dikembalikan bila
 * penyimpanan gagal. Peran tanpa hak pengaturan melihat statusnya sebagai teks.
 */
export function DaftarJenisSurat() {
  const boleh = useBoleh()
  const queryClient = useQueryClient()
  const opsi = opsiJenisSurat()
  const daftar = useQuery(opsi)
  const bolehUbah = boleh('pengaturan.kelola')

  const saklar = useMutation({
    mutationFn: ({ jenis, ubah }: { jenis: JenisDenganPakai; ubah: UbahSaklar }) => ubahJenisSurat(jenis.id, ubah),
    onMutate: async ({ jenis, ubah }) => {
      await queryClient.cancelQueries({ queryKey: opsi.queryKey, exact: true })
      const lama = queryClient.getQueryData(opsi.queryKey)
      queryClient.setQueryData(opsi.queryKey, (d) => d && { ...d, data: d.data.map((j) => (j.id === jenis.id ? { ...j, ...ubah } : j)) })
      return { lama }
    },
    onError: (galat, _masukan, konteks) => {
      if (konteks?.lama) queryClient.setQueryData(opsi.queryKey, konteks.lama)
      tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' })
    },
    onSuccess: (_detail, { jenis, ubah }) => tampilkanToast({ pesan: pesanSaklar(jenis, ubah), nada: 'berhasil' }),
    // Daftar dan halaman ubah dimuat ulang; langkah 1 Buat surat ikut memakai daftar ini.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: kunciSurat.jenis }),
  })

  const semua = daftar.data?.data
  const meta = semua ? (
    `${formatAngka(semua.filter((j) => j.aktif).length)} dari ${formatAngka(semua.length)} jenis dilayani · ` +
    `${formatAngka(semua.filter((j) => j.aktif && j.online).length)} bisa diajukan online`
  ) : daftar.isError ? null : (
    <Skeleton className="h-4 w-72 max-w-full" />
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader jejak={[{ label: 'Layanan Surat', href: '/admin/surat' }]} judul="Jenis Surat" meta={meta} tab={<TabSurat aktif="jenis" />} />
      {daftar.isPending ? (
        <BarisKerangka jumlah={6} label="Memuat jenis surat…" />
      ) : daftar.isError ? (
        <ErrorState pesan={pesanGalat(daftar.error)} onCobaLagi={() => void daftar.refetch()} />
      ) : (
        <>
          {daftar.data.data.every((j) => !j.aktif) && (
            <p className="text-tinta-2">
              {bolehUbah
                ? 'Belum ada jenis surat yang dilayani. Aktifkan jenis surat yang dilayani desa; surat hanya bisa dibuat dan diajukan dari jenis yang aktif.'
                : 'Belum ada jenis surat yang dilayani. Operator atau Sekretaris Desa yang mengaktifkannya.'}
            </p>
          )}
          <ul aria-label="Jenis surat" className="divide-y divide-garis border-y border-garis bg-lembar">
            {daftar.data.data.map((j) => {
              const sibuk = saklar.isPending && saklar.variables?.jenis.id === j.id
              return (
                <li key={j.id} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-6">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{j.nama}</span>
                      <span className="font-mono text-teks-kecil text-tinta-2">
                        {j.kode} · {j.klasifikasi}
                      </span>
                    </p>
                    <p className="text-teks-kecil text-tinta-2">{ringkasJenis(j)}</p>
                  </div>
                  {bolehUbah ? (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <Saklar aria-label={`${j.nama} aktif`} isSelected={j.aktif} isDisabled={sibuk} onChange={(aktif) => saklar.mutate({ jenis: j, ubah: { aktif } })}>
                        Aktif
                      </Saklar>
                      <Saklar
                        aria-label={`${j.nama} bisa diajukan online`}
                        isSelected={j.online}
                        isDisabled={sibuk}
                        onChange={(online) => saklar.mutate({ jenis: j, ubah: { online } })}
                      >
                        Layanan online
                      </Saklar>
                      <Tautan href={`/admin/surat/jenis/${j.id}`} aria-label={`Ubah ${j.nama}`}>
                        Ubah
                      </Tautan>
                    </div>
                  ) : (
                    <p className="text-teks-kecil">
                      <span>{j.aktif ? 'Aktif' : 'Tidak aktif'}</span>
                      <span className="text-tinta-2"> · </span>
                      <span>{j.online ? 'Online' : 'Hanya di kantor desa'}</span>
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
