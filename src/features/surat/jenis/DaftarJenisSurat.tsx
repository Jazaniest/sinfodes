import { DotsThree, Plus } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { aktifkanLagiJenisSurat, arsipkanJenisSurat, hapusJenisSurat, kunciSurat, opsiJenisSurat, ubahJenisSurat } from '@/api/surat'
import { formatAngka } from '@/domain/format/angka'
import { bolehDiarsipkan, statusJenis, STATUS_DAFTAR_JENIS, type JenisDenganPakai, type StatusJenis } from '@/domain/surat/jenis'
import { useBoleh } from '@/features/admin/useBoleh'
import { Cap } from '@/ui/cap/Cap'
import { ChipFilter } from '@/ui/data/ChipFilter'
import { Saklar } from '@/ui/isian/Saklar'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { MenuAksi, type ItemMenuAksi } from '@/ui/lapisan/Menu'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka, Skeleton } from '@/ui/umpan-balik/Skeleton'
import { TabSurat } from '../TabSurat'
import { DialogTambahJenis } from './DialogTambahJenis'

type UbahSaklar = { aktif?: boolean; online?: boolean }
type Props = {
  /** Penyaring status dari URL (`?status=`); null = semua. */
  status?: StatusJenis | null
  onUbahStatus?: (status: StatusJenis | null) => void
  /** Dipanggil dengan id jenis yang baru dibuat, supaya halaman membuka editornya. */
  onBuka?: (id: string) => void
}
type DialogAksi = { aksi: 'hapus' | 'arsip'; jenis: JenisDenganPakai }

const SEMUA = 'semua'
const LABEL_STATUS: Readonly<Record<StatusJenis, string>> = { aktif: 'Aktif', dihentikan: 'Dihentikan', diarsipkan: 'Diarsipkan' }
const PILIHAN_STATUS = [{ id: SEMUA, label: 'Semua' }, ...STATUS_DAFTAR_JENIS.map((s) => ({ id: s, label: LABEL_STATUS[s] }))]

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

/** Menu aksi satu baris. Jenis bawaan tidak punya menu: tidak bisa dihapus atau diarsipkan (SPEC-V0.2 12.1). */
function itemMenu(j: JenisDenganPakai, pilih: (d: DialogAksi) => void, aktifkanLagi: (j: JenisDenganPakai) => void): ItemMenuAksi[] {
  if (j.asal !== 'desa') return []
  return [
    ...(bolehDiarsipkan(j) ? [{ id: 'arsip', label: 'Arsipkan…', onAction: () => pilih({ aksi: 'arsip', jenis: j }) }] : []),
    ...(j.diarsipkan === null ? [] : [{ id: 'aktif', label: 'Aktifkan lagi', onAction: () => aktifkanLagi(j) }]),
    // Yang sudah dipakai ditolak server (409) lalu ditawari Arsipkan; data di layar bisa saja sudah lama.
    { id: 'hapus', label: 'Hapus…', bahaya: true, onAction: () => pilih({ aksi: 'hapus', jenis: j }) },
  ]
}

/**
 * Jenis surat desa (SPEC §7.4 layar 6). Saklar langsung tersimpan: tampilan berubah seketika dan dikembalikan bila
 * penyimpanan gagal. Peran tanpa hak pengaturan melihat statusnya sebagai teks. Jenis buatan desa bisa ditambah, dihapus
 * (bila belum pernah dipakai), dan diarsipkan (SPEC-V0.2 12.1).
 */
export function DaftarJenisSurat({ status = null, onUbahStatus, onBuka }: Props) {
  const boleh = useBoleh()
  const queryClient = useQueryClient()
  const opsi = opsiJenisSurat()
  const daftar = useQuery(opsi)
  const bolehUbah = boleh('pengaturan.kelola')
  const [tambah, setTambah] = useState(false)
  const [dialog, setDialog] = useState<DialogAksi | null>(null)
  const segarkan = () => void queryClient.invalidateQueries({ queryKey: kunciSurat.jenis })

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
    onSettled: segarkan,
  })

  const hapus = useMutation({
    mutationFn: (j: JenisDenganPakai) => hapusJenisSurat(j.id),
    onSuccess: (_hasil, j) => {
      tampilkanToast({ pesan: `${j.nama} dihapus.`, nada: 'berhasil' })
      setDialog(null)
    },
    onError: (e, j) => {
      tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
      // Sudah pernah dipakai: hapus tidak mungkin, jadi tawarkan arsip sebagai gantinya.
      setDialog(e instanceof GalatApi && e.kode === 'CONFLICT' ? { aksi: 'arsip', jenis: j } : null)
    },
    onSettled: segarkan,
  })
  const arsip = useMutation({
    mutationFn: (j: JenisDenganPakai) => arsipkanJenisSurat(j.id),
    onSuccess: (_hasil, j) => tampilkanToast({ pesan: `${j.nama} diarsipkan.`, nada: 'berhasil' }),
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
    onSettled: () => {
      setDialog(null)
      segarkan()
    },
  })
  const aktifkanLagi = useMutation({
    mutationFn: (j: JenisDenganPakai) => aktifkanLagiJenisSurat(j.id),
    onSuccess: (_hasil, j) =>
      tampilkanToast({ pesan: `${j.nama} dikeluarkan dari arsip. Layanannya masih mati; nyalakan bila sudah siap.`, nada: 'berhasil' }),
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
    onSettled: segarkan,
  })

  const semua = daftar.data?.data
  const berjalan = semua?.filter((j) => j.diarsipkan === null)
  const jumlahArsip = semua && berjalan ? semua.length - berjalan.length : 0
  const meta =
    semua && berjalan ? (
      `${formatAngka(berjalan.filter((j) => j.aktif).length)} dari ${formatAngka(berjalan.length)} jenis dilayani · ` +
      `${formatAngka(berjalan.filter((j) => j.aktif && j.online).length)} bisa diajukan online` +
      (jumlahArsip > 0 ? ` · ${formatAngka(jumlahArsip)} diarsipkan` : '')
    ) : daftar.isError ? null : (
      <Skeleton className="h-4 w-72 max-w-full" />
    )
  // Jenis arsip di bawah; urutan lainnya dari server dipertahankan.
  const tampil = (semua ?? [])
    .filter((j) => status === null || statusJenis(j) === status)
    .sort((a, b) => Number(a.diarsipkan !== null) - Number(b.diarsipkan !== null))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        jejak={[{ label: 'Layanan Surat', href: '/admin/surat' }]}
        judul="Jenis Surat"
        meta={meta}
        aksi={
          bolehUbah && (
            <Tombol varian="utama" ikon={<Plus aria-hidden size={16} />} onPress={() => setTambah(true)} isDisabled={!semua}>
              Tambah jenis surat
            </Tombol>
          )
        }
        tab={<TabSurat aktif="jenis" />}
      />
      {daftar.isPending ? (
        <BarisKerangka jumlah={6} label="Memuat jenis surat…" />
      ) : daftar.isError ? (
        <ErrorState pesan={pesanGalat(daftar.error)} onCobaLagi={() => void daftar.refetch()} />
      ) : (
        <>
          <ChipFilter
            label="Status jenis surat"
            pilihan={PILIHAN_STATUS}
            nilai={status ?? SEMUA}
            onUbah={(id) => onUbahStatus?.(STATUS_DAFTAR_JENIS.find((s) => s === id) ?? null)}
          />
          {berjalan?.every((j) => !j.aktif) && (
            <p className="text-tinta-2">
              {bolehUbah
                ? 'Belum ada jenis surat yang dilayani. Aktifkan jenis surat yang dilayani desa; surat hanya bisa dibuat dan diajukan dari jenis yang aktif.'
                : 'Belum ada jenis surat yang dilayani. Operator atau Sekretaris Desa yang mengaktifkannya.'}
            </p>
          )}
          {tampil.length === 0 && status !== null ? (
            <p className="text-tinta-2">Tidak ada jenis surat berstatus {LABEL_STATUS[status].toLowerCase()}.</p>
          ) : (
            <ul aria-label="Jenis surat" className="divide-y divide-garis border-y border-garis bg-lembar">
              {tampil.map((j) => {
                const sibuk = saklar.isPending && saklar.variables?.jenis.id === j.id
                const diarsipkan = j.diarsipkan !== null
                const item = bolehUbah ? itemMenu(j, setDialog, (x) => aktifkanLagi.mutate(x)) : []
                return (
                  <li key={j.id} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-medium">{j.nama}</span>
                        <span className="font-mono text-teks-kecil text-tinta-2">
                          {j.kode} · {j.klasifikasi}
                        </span>
                        {j.asal === 'desa' && (
                          <span className="rounded-1 border border-garis px-1.5 text-label leading-5 text-tinta-2">Buatan desa</span>
                        )}
                        {diarsipkan && <Cap varian="nonaktif" label="Diarsipkan" />}
                      </p>
                      <p className="text-teks-kecil text-tinta-2">{ringkasJenis(j)}</p>
                    </div>
                    {bolehUbah ? (
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        {!diarsipkan && (
                          <>
                            <Saklar
                              aria-label={`${j.nama} aktif`}
                              isSelected={j.aktif}
                              isDisabled={sibuk}
                              onChange={(aktif) => saklar.mutate({ jenis: j, ubah: { aktif } })}
                            >
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
                          </>
                        )}
                        <Tautan href={`/admin/surat/jenis/${j.id}`} aria-label={`${diarsipkan ? 'Lihat' : 'Ubah'} ${j.nama}`}>
                          {diarsipkan ? 'Lihat' : 'Ubah'}
                        </Tautan>
                        {item.length > 0 && (
                          <MenuAksi
                            placement="bottom end"
                            pemicu={
                              <Tombol varian="teks" ukuran="kecil" aria-label={`Aksi untuk ${j.nama}`} ikon={<DotsThree aria-hidden size={18} />}>
                                Aksi
                              </Tombol>
                            }
                            items={item}
                          />
                        )}
                      </div>
                    ) : (
                      <p className="text-teks-kecil">
                        <span>{diarsipkan ? 'Diarsipkan' : j.aktif ? 'Aktif' : 'Tidak aktif'}</span>
                        <span className="text-tinta-2"> · </span>
                        <span>{j.online ? 'Online' : 'Hanya di kantor desa'}</span>
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
      {tambah && semua && (
        <DialogTambahJenis
          jenis={semua}
          onTutup={() => setTambah(false)}
          onDibuat={(id) => {
            setTambah(false)
            onBuka?.(id)
          }}
        />
      )}
      <ConfirmDialog
        isOpen={dialog?.aksi === 'hapus'}
        onOpenChange={(buka) => !buka && setDialog(null)}
        judul={`Hapus jenis ${dialog?.jenis.nama ?? ''}?`}
        labelSetuju="Hapus"
        bahaya
        memuat={hapus.isPending}
        onSetuju={() => dialog && hapus.mutate(dialog.jenis)}
      >
        Jenis ini dihapus untuk selamanya. Jenis yang sudah pernah dipakai tidak bisa dihapus; arsipkan saja.
      </ConfirmDialog>
      <ConfirmDialog
        isOpen={dialog?.aksi === 'arsip'}
        onOpenChange={(buka) => !buka && setDialog(null)}
        judul={`Arsipkan jenis ${dialog?.jenis.nama ?? ''}?`}
        labelSetuju="Arsipkan"
        memuat={arsip.isPending}
        onSetuju={() => dialog && arsip.mutate(dialog.jenis)}
      >
        Jenis ini tidak bisa dipilih untuk surat baru. Surat lamanya tetap tampil dan tetap bisa diverifikasi.
      </ConfirmDialog>
    </div>
  )
}
