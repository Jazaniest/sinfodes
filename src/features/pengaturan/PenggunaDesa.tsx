import { DotsThree, UserPlus } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type ReactNode } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciPengaturan, opsiPenggunaDesa, ubahPengguna, undangPengguna } from '@/api/pengaturan'
import { galatDariZod } from '@/domain/format/galat-isian'
import { undangPenggunaSchema } from '@/domain/pengaturan/pengguna'
import { LABEL_PERAN, PERAN, type Pengguna, type Peran } from '@/domain/pengguna/schema'
import { namaDusun } from '@/domain/wilayah/alamat'
import { Cap } from '@/ui/cap/Cap'
import { DataTable, type KolomTabel } from '@/ui/data/DataTable'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { Select } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { Dialog } from '@/ui/lapisan/Dialog'
import { MenuAksi } from '@/ui/lapisan/Menu'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { EmptyState } from '@/ui/umpan-balik/EmptyState'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { KepalaPengaturan } from './TabPengaturan'

const PILIHAN_PERAN = PERAN.map((p) => ({ id: p, label: LABEL_PERAN[p] }))
const peranDari = (id: string | null): Peran | null => PERAN.find((p) => p === id) ?? null

type DialogTerbuka = { jenis: 'undang' } | { jenis: 'peran'; pengguna: Pengguna } | { jenis: 'nonaktif'; pengguna: Pengguna } | null

/** Pengaturan › Pengguna (SPEC §8): undang, ganti peran, nonaktifkan. Hanya Sekretaris Desa (SPEC §5.1). */
export function PenggunaDesa() {
  const { pengguna: saya } = useSesiAdmin()
  const queryClient = useQueryClient()
  const kueri = useQuery(opsiPenggunaDesa())
  const [dialog, setDialog] = useState<DialogTerbuka>(null)
  // Kepala desa aktif di tab Identitas ikut berubah bila peran atau status Kepala Desa berubah.
  const segarkan = () => void queryClient.invalidateQueries({ queryKey: kunciPengaturan.semua })
  const aktifkan = useMutation({
    mutationFn: (p: Pengguna) => ubahPengguna(p.id, { aktif: true }),
    onSuccess: (p) => {
      segarkan()
      tampilkanToast({ pesan: `${p.nama} aktif kembali dan bisa masuk.`, nada: 'berhasil' })
    },
    onError: (e) => tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' }),
  })

  const aksi = (p: Pengguna): ReactNode =>
    p.id === saya.id ? (
      <span className="text-teks-kecil text-tinta-2">Akun Anda</span>
    ) : (
      <MenuAksi
        placement="bottom end"
        pemicu={
          <Tombol varian="teks" ukuran="kecil" aria-label={`Aksi untuk ${p.nama}`} ikon={<DotsThree aria-hidden size={18} />}>
            Aksi
          </Tombol>
        }
        items={[
          { id: 'peran', label: 'Ganti peran…', onAction: () => setDialog({ jenis: 'peran', pengguna: p }) },
          p.aktif
            ? { id: 'nonaktif', label: 'Nonaktifkan…', bahaya: true, onAction: () => setDialog({ jenis: 'nonaktif', pengguna: p }) }
            : { id: 'aktif', label: 'Aktifkan lagi', onAction: () => aktifkan.mutate(p) },
        ]}
      />
    )
  const kolom: KolomTabel<Pengguna>[] = [
    {
      id: 'nama',
      judul: 'Nama',
      wajib: true,
      isi: (p) => (
        <span className="flex flex-col">
          <span className="font-medium">{p.nama}</span>
          <span className="text-teks-kecil text-tinta-2">{p.email}</span>
        </span>
      ),
    },
    { id: 'jabatan', judul: 'Jabatan', isi: (p) => p.jabatan },
    { id: 'peran', judul: 'Peran', isi: (p) => LABEL_PERAN[p.peran] },
    { id: 'status', judul: 'Status', isi: (p) => <Cap varian={p.aktif ? 'aktif' : 'nonaktif'} /> },
    { id: 'aksi', judul: 'Aksi', wajib: true, isi: aksi },
  ]

  return (
    <div className="flex flex-col gap-6">
      <KepalaPengaturan
        aktif="pengguna"
        aksi={
          <Tombol varian="utama" ikon={<UserPlus aria-hidden size={16} />} onPress={() => setDialog({ jenis: 'undang' })}>
            Undang pengguna
          </Tombol>
        }
      />
      <p className="max-w-2xl text-tinta-2">
        Pengguna masuk dengan surelnya. Pengguna yang dinonaktifkan tidak bisa masuk lagi, tetapi riwayat kerjanya tetap tersimpan.
      </p>
      <DataTable
        label="Pengguna desa"
        kolom={kolom}
        kolomUtama="nama"
        baris={kueri.data}
        memuat={kueri.isPending}
        galat={kueri.isError ? pesanGalat(kueri.error) : null}
        onCobaLagi={() => void kueri.refetch()}
        kosong={<EmptyState judul="Belum ada pengguna" />}
        barisRingkas={(p) => (
          <span className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-medium">{p.nama}</span>
              <span className="text-teks-kecil text-tinta-2">
                {p.jabatan} · {LABEL_PERAN[p.peran]}
              </span>
              <span>
                <Cap varian={p.aktif ? 'aktif' : 'nonaktif'} />
              </span>
            </span>
            {aksi(p)}
          </span>
        )}
      />
      {dialog?.jenis === 'undang' && <DialogUndang onTutup={() => setDialog(null)} onBerhasil={segarkan} />}
      {dialog?.jenis === 'peran' && <DialogPeran pengguna={dialog.pengguna} onTutup={() => setDialog(null)} onBerhasil={segarkan} />}
      {dialog?.jenis === 'nonaktif' && <DialogNonaktif pengguna={dialog.pengguna} onTutup={() => setDialog(null)} onBerhasil={segarkan} />}
    </div>
  )
}

type PropsDialog = { onTutup: () => void; onBerhasil: () => void }

function usePilihanDusun() {
  const { desa, dusun } = useSesiAdmin()
  return dusun.map((d) => ({ id: d.id, label: namaDusun(d, desa.istilahWilayah) }))
}

/** Galat dari API: yang punya isian ditandai di isiannya; selainnya toast. */
function tanganiGalat(e: unknown, tandai: (g: Record<string, string>) => void) {
  if (e instanceof GalatApi && Object.keys(e.fields).length > 0) tandai(e.fields)
  else tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
}

function DialogUndang({ onTutup, onBerhasil }: PropsDialog) {
  const pilihanDusun = usePilihanDusun()
  const [isian, setIsian] = useState<{ nama: string; email: string; peran: Peran | null; dusunId: string | null }>({
    nama: '', email: '', peran: null, dusunId: null,
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
  const bahan = () => ({ nama: isian.nama, email: isian.email, peran: isian.peran ?? 'operator', dusunId: isian.peran === 'kadus' ? isian.dusunId : null })
  const kirim = useMutation({
    mutationFn: () => undangPengguna(bahan()),
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
    const hasil = undangPenggunaSchema.safeParse(bahan())
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
      judul="Undang pengguna"
      subjudul="Undangan dikirim ke surelnya. Di demo, akunnya langsung aktif dengan kata sandi demo."
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={kirim.isPending} onPress={tekan}>
            Kirim undangan
          </Tombol>
        </>
      }
    >
      <div ref={wadah} className="flex flex-col gap-4">
        <TextField label="Nama" value={isian.nama} onChange={(v) => ubah('nama', v)} galat={galat.nama || undefined} isRequired />
        <TextField label="Surel" type="email" value={isian.email} onChange={(v) => ubah('email', v)} galat={galat.email || undefined} isRequired />
        <Select label="Peran" pilihan={PILIHAN_PERAN} nilai={isian.peran} onUbah={(id) => ubah('peran', peranDari(id))} galat={galat.peran || undefined} />
        {isian.peran === 'kadus' && (
          <Select label="Dusun" pilihan={pilihanDusun} nilai={isian.dusunId} onUbah={(id) => ubah('dusunId', id)} galat={galat.dusunId || undefined} />
        )}
      </div>
    </Dialog>
  )
}

function DialogPeran({ pengguna, onTutup, onBerhasil }: PropsDialog & { pengguna: Pengguna }) {
  const pilihanDusun = usePilihanDusun()
  const [peran, setPeran] = useState<Peran>(pengguna.peran)
  const [dusunId, setDusunId] = useState<string | null>(pengguna.dusunId)
  const [galat, setGalat] = useState<Record<string, string>>({})
  const mengirim = useRef(false)
  const simpan = useMutation({
    mutationFn: () => ubahPengguna(pengguna.id, { peran, dusunId: peran === 'kadus' ? dusunId : null }),
    onSuccess: (baru) => {
      onBerhasil()
      tampilkanToast({ pesan: `Peran ${baru.nama} menjadi ${LABEL_PERAN[baru.peran]}.`, nada: 'berhasil' })
      onTutup()
    },
    onError: (e) => tanganiGalat(e, setGalat),
    onSettled: () => {
      mengirim.current = false
    },
  })
  const tekan = () => {
    if (mengirim.current) return
    if (peran === 'kadus' && !dusunId) {
      setGalat({ dusunId: 'Pilih dusun untuk Kepala Dusun' })
      return
    }
    mengirim.current = true
    simpan.mutate()
  }
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul={`Ganti peran ${pengguna.nama}`}
      subjudul="Menu dan hak akses mengikuti peran barunya mulai saat ia membuka halaman berikutnya."
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={simpan.isPending} onPress={tekan}>
            Simpan
          </Tombol>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Peran"
          pilihan={PILIHAN_PERAN}
          nilai={peran}
          onUbah={(id) => {
            setPeran(peranDari(id) ?? pengguna.peran)
            setGalat({})
          }}
          galat={galat.peran}
        />
        {peran === 'kadus' && (
          <Select
            label="Dusun"
            pilihan={pilihanDusun}
            nilai={dusunId}
            onUbah={(id) => {
              setDusunId(id)
              setGalat({})
            }}
            galat={galat.dusunId}
          />
        )}
      </div>
    </Dialog>
  )
}

function DialogNonaktif({ pengguna, onTutup, onBerhasil }: PropsDialog & { pengguna: Pengguna }) {
  const mengirim = useRef(false)
  const nonaktifkan = useMutation({
    mutationFn: () => ubahPengguna(pengguna.id, { aktif: false }),
    onSuccess: (p) => {
      onBerhasil()
      tampilkanToast({ pesan: `${p.nama} dinonaktifkan dan tidak bisa masuk lagi.`, nada: 'berhasil' })
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
      judul={`Nonaktifkan ${pengguna.nama}?`}
      labelSetuju="Nonaktifkan"
      bahaya
      memuat={nonaktifkan.isPending}
      onSetuju={() => {
        if (mengirim.current) return
        mengirim.current = true
        nonaktifkan.mutate()
      }}
    >
      {pengguna.nama} tidak bisa masuk lagi sampai diaktifkan kembali. Data dan riwayat kerjanya tetap tersimpan.
    </ConfirmDialog>
  )
}
