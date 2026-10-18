import { DotsThree, UserPlus } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type ReactNode } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKabupaten, opsiPenggunaKabupaten, tambahPenggunaKabupaten, ubahPenggunaKabupaten } from '@/api/kabupaten'
import { galatDariZod } from '@/domain/format/galat-isian'
import { tambahPenggunaKabupatenSchema } from '@/domain/kabupaten/pengguna'
import { LABEL_PERAN_KABUPATEN, PERAN_KABUPATEN, type PenggunaKabupaten as Akun, type PeranKabupaten } from '@/domain/kabupaten/schema'
import { Cap } from '@/ui/cap/Cap'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { Dialog } from '@/ui/lapisan/Dialog'
import { MenuAksi } from '@/ui/lapisan/Menu'
import { PageHeader } from '@/ui/tata-letak/PageHeader'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { useSesiKabupaten } from '../sesi-konteks'

const PILIHAN_PERAN = PERAN_KABUPATEN.map((p) => ({ id: p, label: LABEL_PERAN_KABUPATEN[p] }))
const peranDari = (id: string | null): PeranKabupaten | null => PERAN_KABUPATEN.find((p) => p === id) ?? null
const KETERANGAN_PERAN = 'Admin Kabupaten mengelola pengguna. Peninjau melihat dan mengunduh semua dasbor tanpa mengubah apa pun.'

type DialogTerbuka = { jenis: 'tambah' } | { jenis: 'peran'; akun: Akun } | { jenis: 'nonaktif'; akun: Akun } | null

/** Pengguna dasbor kabupaten (SPEC-V0.2 §8.1): tambah, ganti peran, nonaktifkan. Hanya Admin Kabupaten. */
export function PenggunaKabupaten() {
  const { pengguna: saya, kabupaten } = useSesiKabupaten()
  const queryClient = useQueryClient()
  const kueri = useQuery(opsiPenggunaKabupaten())
  const [dialog, setDialog] = useState<DialogTerbuka>(null)
  const segarkan = () => void queryClient.invalidateQueries({ queryKey: kunciKabupaten.pengguna })
  const aktifkan = useMutation({
    mutationFn: (a: Akun) => ubahPenggunaKabupaten(a.id, { aktif: true }),
    onSuccess: (a) => {
      segarkan()
      tampilkanToast({ pesan: `${a.nama} aktif kembali dan bisa masuk.`, nada: 'berhasil' })
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
  })

  const aksi = (a: Akun): ReactNode =>
    a.id === saya.id ? (
      <span className="text-teks-kecil text-tinta-2">Akun Anda</span>
    ) : (
      <MenuAksi
        placement="bottom end"
        pemicu={
          <Tombol varian="teks" ukuran="kecil" aria-label={`Aksi untuk ${a.nama}`} ikon={<DotsThree aria-hidden size={18} />}>
            Aksi
          </Tombol>
        }
        items={[
          { id: 'peran', label: 'Ganti peran…', onAction: () => setDialog({ jenis: 'peran', akun: a }) },
          a.aktif
            ? { id: 'nonaktif', label: 'Nonaktifkan…', bahaya: true, onAction: () => setDialog({ jenis: 'nonaktif', akun: a }) }
            : { id: 'aktif', label: 'Aktifkan lagi', onAction: () => aktifkan.mutate(a) },
        ]}
      />
    )
  const kolom: KolomTabel<Akun>[] = [
    {
      id: 'nama',
      judul: 'Nama',
      wajib: true,
      isi: (a) => (
        <span className="flex flex-col">
          <span className="font-medium">{a.nama}</span>
          <span className="text-teks-kecil text-tinta-2">{a.email}</span>
        </span>
      ),
    },
    { id: 'jabatan', judul: 'Jabatan', isi: (a) => a.jabatan },
    { id: 'peran', judul: 'Peran', isi: (a) => LABEL_PERAN_KABUPATEN[a.peran] },
    { id: 'status', judul: 'Status', isi: (a) => <Cap varian={a.aktif ? 'aktif' : 'nonaktif'} /> },
    { id: 'aksi', judul: 'Aksi', wajib: true, isi: aksi },
  ]

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        judul="Pengguna"
        meta={`Kabupaten ${kabupaten.nama}`}
        aksi={
          <Tombol varian="utama" ikon={<UserPlus aria-hidden size={16} />} onPress={() => setDialog({ jenis: 'tambah' })}>
            Tambah pengguna
          </Tombol>
        }
      />
      <p className="max-w-2xl text-tinta-2">
        Pengguna masuk dengan emailnya di alamat dasbor ini. Pengguna yang dinonaktifkan tidak bisa masuk lagi, tetapi tetap tercatat
        di daftar.
      </p>
      <DataTable
        label="Pengguna kabupaten"
        kolom={kolom}
        kolomUtama="nama"
        baris={kueri.data}
        memuat={kueri.isPending}
        galat={kueri.isError ? pesanGalat(kueri.error) : null}
        onCobaLagi={() => void kueri.refetch()}
        kosong={<EmptyState judul="Belum ada pengguna" />}
        barisRingkas={(a) => (
          <span className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-medium">{a.nama}</span>
              <span className="text-teks-kecil text-tinta-2">
                {a.jabatan} · {LABEL_PERAN_KABUPATEN[a.peran]}
              </span>
              <span>
                <Cap varian={a.aktif ? 'aktif' : 'nonaktif'} />
              </span>
            </span>
            {aksi(a)}
          </span>
        )}
      />
      {dialog?.jenis === 'tambah' && <DialogTambah onTutup={() => setDialog(null)} onBerhasil={segarkan} />}
      {dialog?.jenis === 'peran' && <DialogPeran akun={dialog.akun} onTutup={() => setDialog(null)} onBerhasil={segarkan} />}
      {dialog?.jenis === 'nonaktif' && <DialogNonaktif akun={dialog.akun} onTutup={() => setDialog(null)} onBerhasil={segarkan} />}
    </div>
  )
}

type PropsDialog = { onTutup: () => void; onBerhasil: () => void }

/** Galat dari API: yang punya isian ditandai di isiannya; selainnya toast. */
function tanganiGalat(e: unknown, tandai: (g: Record<string, string>) => void) {
  if (e instanceof GalatApi && Object.keys(e.fields).length > 0) tandai(e.fields)
  else tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
}

function DialogTambah({ onTutup, onBerhasil }: PropsDialog) {
  const [isian, setIsian] = useState<{ nama: string; jabatan: string; email: string; peran: PeranKabupaten | null }>({
    nama: '', jabatan: '', email: '', peran: null,
  })
  const [galat, setGalat] = useState<Record<string, string>>({})
  const mengirim = useRef(false)
  const wadah = useRef<HTMLDivElement>(null)
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }
  const ubah = <K extends keyof typeof isian>(kunci: K, nilai: (typeof isian)[K]) => {
    setIsian((l) => ({ ...l, [kunci]: nilai }))
    setGalat((g) => ({ ...g, [kunci]: '' }))
  }
  const bahan = () => ({ nama: isian.nama, jabatan: isian.jabatan, email: isian.email, peran: isian.peran ?? 'peninjau' })
  const kirim = useMutation({
    mutationFn: () => tambahPenggunaKabupaten(bahan()),
    onSuccess: (baru) => {
      onBerhasil()
      tampilkanToast({ pesan: `Undangan dikirim ke ${baru.email}.`, nada: 'berhasil' })
      onTutup()
    },
    onError: (e) => tanganiGalat(e, tandai),
    onSettled: () => {
      mengirim.current = false
    },
  })
  const tekan = () => {
    if (mengirim.current) return
    const hasil = tambahPenggunaKabupatenSchema.safeParse(bahan())
    const g = { ...(hasil.success ? {} : galatDariZod(hasil.error)), ...(isian.peran === null ? { peran: 'Pilih peran' } : {}) }
    if (Object.keys(g).length > 0) {
      tandai(g)
      return
    }
    mengirim.current = true
    kirim.mutate()
  }
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul="Tambah pengguna"
      subjudul="Undangan dikirim ke emailnya. Di demo, akunnya langsung aktif dengan kata sandi demo."
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={kirim.isPending} onPress={tekan}>
            Tambahkan
          </Tombol>
        </>
      }
    >
      <div ref={wadah} className="flex flex-col gap-4">
        <TextField label="Nama" value={isian.nama} onChange={(v) => ubah('nama', v)} galat={galat.nama || undefined} isRequired />
        <TextField
          label="Jabatan"
          keterangan="Mis. Kepala Dinas PMD. Bila kosong, nama perannya yang dipakai."
          value={isian.jabatan}
          onChange={(v) => ubah('jabatan', v)}
          galat={galat.jabatan || undefined}
        />
        <TextField label="Email" type="email" value={isian.email} onChange={(v) => ubah('email', v)} galat={galat.email || undefined} isRequired />
        <Select
          label="Peran"
          pilihan={PILIHAN_PERAN}
          nilai={isian.peran}
          onUbah={(id) => ubah('peran', peranDari(id))}
          keterangan={KETERANGAN_PERAN}
          galat={galat.peran || undefined}
        />
      </div>
    </Dialog>
  )
}

function DialogPeran({ akun, onTutup, onBerhasil }: PropsDialog & { akun: Akun }) {
  const [peran, setPeran] = useState<PeranKabupaten>(akun.peran)
  const mengirim = useRef(false)
  const simpan = useMutation({
    mutationFn: () => ubahPenggunaKabupaten(akun.id, { peran }),
    onSuccess: (baru) => {
      onBerhasil()
      tampilkanToast({ pesan: `Peran ${baru.nama} menjadi ${LABEL_PERAN_KABUPATEN[baru.peran]}.`, nada: 'berhasil' })
      onTutup()
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
    onSettled: () => {
      mengirim.current = false
    },
  })
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul={`Ganti peran ${akun.nama}`}
      subjudul="Menu dan hak akses mengikuti peran barunya mulai saat ia membuka halaman berikutnya."
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol
            varian="utama"
            memuat={simpan.isPending}
            onPress={() => {
              if (mengirim.current) return
              mengirim.current = true
              simpan.mutate()
            }}
          >
            Simpan
          </Tombol>
        </>
      }
    >
      <Select
        label="Peran"
        pilihan={PILIHAN_PERAN}
        nilai={peran}
        onUbah={(id) => setPeran(peranDari(id) ?? akun.peran)}
        keterangan={KETERANGAN_PERAN}
      />
    </Dialog>
  )
}

function DialogNonaktif({ akun, onTutup, onBerhasil }: PropsDialog & { akun: Akun }) {
  const mengirim = useRef(false)
  const nonaktifkan = useMutation({
    mutationFn: () => ubahPenggunaKabupaten(akun.id, { aktif: false }),
    onSuccess: (a) => {
      onBerhasil()
      tampilkanToast({ pesan: `${a.nama} dinonaktifkan dan tidak bisa masuk lagi.`, nada: 'berhasil' })
      onTutup()
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
    onSettled: () => {
      mengirim.current = false
    },
  })
  return (
    <ConfirmDialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul={`Nonaktifkan ${akun.nama}?`}
      labelSetuju="Nonaktifkan"
      bahaya
      memuat={nonaktifkan.isPending}
      onSetuju={() => {
        if (mengirim.current) return
        mengirim.current = true
        nonaktifkan.mutate()
      }}
    >
      {akun.nama} tidak bisa masuk lagi sampai diaktifkan kembali.
    </ConfirmDialog>
  )
}
