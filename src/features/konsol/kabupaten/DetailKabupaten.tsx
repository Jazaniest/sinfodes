import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKonsol, opsiDetailKabupatenKonsol, ubahAkunKabupatenKonsol } from '@/api/konsol'
import { DOMAIN_INDUK, keAlamat } from '@/app/alamat'
import { formatAngka, formatUkuranKb } from '@/domain/format/angka'
import { formatTanggal } from '@/domain/format/tanggal'
import { LABEL_PERAN_KABUPATEN, type PenggunaKabupaten } from '@/domain/kabupaten/schema'
import { Cap } from '@/ui/cap/Cap'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { DescriptionList } from '@/ui/data/DescriptionList'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { Tautan } from '@/ui/navigasi/Tautan'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

const judulBagian = 'text-label font-medium text-tinta-2 uppercase'

/**
 * Detail kabupaten mitra di Konsol (SPEC-V0.2 §7): identitas, surat penunjukan, dan akun kabupaten. Tim Sinfodes hanya
 * menonaktifkan dan mengaktifkan lagi akun (mis. pejabat pindah tugas); menambah pengguna adalah urusan Admin Kabupaten.
 */
export function DetailKabupaten({ kode }: { kode: string }) {
  const queryClient = useQueryClient()
  const kueri = useQuery(opsiDetailKabupatenKonsol(kode))
  const [nonaktif, setNonaktif] = useState<PenggunaKabupaten | null>(null)
  const mengirim = useRef(false)
  const segarkan = () => void queryClient.invalidateQueries({ queryKey: kunciKonsol.semua })
  const ubah = useMutation({
    mutationFn: ({ akun, aktif }: { akun: PenggunaKabupaten; aktif: boolean }) => ubahAkunKabupatenKonsol(kode, akun.id, { aktif }),
    onSuccess: (a) => {
      segarkan()
      setNonaktif(null)
      tampilkanToast({
        pesan: a.aktif ? `${a.nama} aktif kembali dan bisa masuk.` : `${a.nama} dinonaktifkan dan tidak bisa masuk lagi.`,
        nada: 'berhasil',
      })
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
    onSettled: () => {
      mengirim.current = false
    },
  })
  const kirim = (akun: PenggunaKabupaten, aktif: boolean) => {
    if (mengirim.current) return
    mengirim.current = true
    ubah.mutate({ akun, aktif })
  }

  if (kueri.isError && kueri.error instanceof GalatApi && kueri.error.kode === 'NOT_FOUND') {
    return (
      <EmptyState
        judulHalaman
        judul="Kabupaten tidak ditemukan"
        keterangan="Kabupaten ini belum bermitra, atau alamatnya salah."
        aksi={<Tautan href="/konsol/kabupaten">Kembali ke daftar kabupaten</Tautan>}
      />
    )
  }
  const d = kueri.data
  const kolom: KolomTabel<PenggunaKabupaten>[] = [
    {
      id: 'nama',
      judul: 'Nama',
      wajib: true,
      isi: (a) => (
        <span className="flex flex-col">
          <span className="font-medium">{a.nama}</span>
          <span className="text-teks-kecil text-tinta-2">{a.jabatan}</span>
        </span>
      ),
    },
    { id: 'email', judul: 'Email', isi: (a) => a.email },
    { id: 'peran', judul: 'Peran', isi: (a) => LABEL_PERAN_KABUPATEN[a.peran] },
    { id: 'status', judul: 'Status', isi: (a) => <Cap varian={a.aktif ? 'aktif' : 'nonaktif'} /> },
    {
      id: 'aksi',
      judul: 'Aksi',
      wajib: true,
      isi: (a) =>
        a.aktif ? (
          <Tombol varian="teks" ukuran="kecil" aria-label={`Nonaktifkan ${a.nama}`} onPress={() => setNonaktif(a)}>
            Nonaktifkan
          </Tombol>
        ) : (
          <Tombol varian="teks" ukuran="kecil" aria-label={`Aktifkan ${a.nama}`} onPress={() => kirim(a, true)}>
            Aktifkan
          </Tombol>
        ),
    },
  ]

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader
        jejak={[{ label: 'Kabupaten', href: '/konsol/kabupaten' }]}
        judul={d ? `Kabupaten ${d.nama}` : 'Detail kabupaten'}
        meta={d && `Mitra sejak ${formatTanggal(d.bergabung)}`}
      />
      {kueri.isPending && <BarisKerangka jumlah={6} label="Memuat detail kabupaten…" />}
      {kueri.isError && <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />}
      {d && (
        <>
          <DescriptionList
            items={[
              { label: 'Kode wilayah', nilai: <span className="font-mono">{d.kode}</span> },
              { label: 'Provinsi', nilai: d.provinsi.nama },
              {
                label: 'Portal',
                nilai: (
                  <Tautan href={keAlamat({ jenis: 'kabupaten', label: d.label })} className="font-mono">
                    {`${d.label}.${DOMAIN_INDUK}`}
                  </Tautan>
                ),
              },
              { label: 'Desa bergabung', nilai: `${formatAngka(d.desaBergabung)} desa` },
              {
                label: 'Surat penunjukan',
                nilai: (
                  <span className="flex flex-col">
                    <span className="font-mono">{d.suratPenunjukan.nomor}</span>
                    <span className="text-teks-kecil text-tinta-2">
                      {formatTanggal(d.suratPenunjukan.tanggal)} · {d.suratPenunjukan.berkas} ({formatUkuranKb(d.suratPenunjukan.ukuranKb)})
                    </span>
                  </span>
                ),
              },
            ]}
          />
          <section aria-labelledby="judul-akun" className="flex flex-col gap-3">
            <h2 id="judul-akun" className={judulBagian}>
              Akun kabupaten
            </h2>
            <p className="max-w-2xl text-tinta-2">
              Admin Kabupaten menambah dan mengatur pengguna dari dasbornya. Dari sini Tim Sinfodes hanya menonaktifkan akun, mis.
              pejabat yang pindah tugas.
            </p>
            <DataTable
              label="Akun kabupaten"
              kolom={kolom}
              kolomUtama="nama"
              baris={d.pengguna}
              memuat={false}
              galat={null}
              onCobaLagi={() => void kueri.refetch()}
              kosong={<EmptyState judul="Belum ada akun kabupaten" />}
              barisRingkas={(a) => (
                <span className="flex flex-col gap-1">
                  <span className="font-medium">{a.nama}</span>
                  <span className="text-teks-kecil text-tinta-2">
                    {a.email} · {LABEL_PERAN_KABUPATEN[a.peran]}
                  </span>
                  <span>
                    <Cap varian={a.aktif ? 'aktif' : 'nonaktif'} />
                  </span>
                </span>
              )}
            />
          </section>
        </>
      )}
      {nonaktif && (
        <ConfirmDialog
          isOpen
          onOpenChange={(buka) => {
            if (!buka) setNonaktif(null)
          }}
          judul={`Nonaktifkan ${nonaktif.nama}?`}
          labelSetuju="Nonaktifkan"
          bahaya
          memuat={ubah.isPending}
          onSetuju={() => kirim(nonaktif, false)}
        >
          {nonaktif.nama} tidak bisa masuk ke dasbor Kabupaten {d?.nama} sampai diaktifkan kembali.
        </ConfirmDialog>
      )}
    </div>
  )
}
