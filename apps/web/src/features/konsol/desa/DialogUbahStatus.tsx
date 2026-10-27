import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKonsol, ubahStatusDesa } from '@/api/konsol'
import { galatDariZod } from '@/domain/format/galat-isian'
import { PERPINDAHAN_STATUS } from '@/domain/konsol/aturan'
import { ubahStatusDesaSchema, type DetailDesaKonsol } from '@/domain/konsol/schema'
import { STATUS_DESA, type StatusDesa } from '@/domain/wilayah/schema'
import { fokusIsianSalah } from '@/ui/hooks/fokus-isian'
import { Select } from '@/ui/isian/Select'
import { TextArea } from '@/ui/isian/TextArea'
import { Dialog } from '@/ui/lapisan/Dialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { Banner } from '@/ui/umpan-balik/Banner'

/** Akibat tiap perpindahan, ditulis di dialog supaya Tim tahu apa yang berubah sebelum mengirim. */
function akibat(dari: StatusDesa, ke: StatusDesa): string {
  if (ke === 'Ditangguhkan') return 'Panel desa hanya bisa dilihat, pengajuan surat dan pengaduan warga ditutup, dan desa tidak ikut peringkat. Data desa tidak dihapus.'
  if (dari === 'Ditangguhkan') return 'Panel desa bisa dipakai lagi dan desa ikut peringkat lagi mulai bulan berikutnya.'
  if (ke === 'Uji coba') return 'Desa mulai masa uji coba 60 hari. Kelima langkah persiapan harus sudah selesai.'
  return 'Langganan dimulai hari ini dengan penagihan per tahun. Tagihan pertama terbit hari ini.'
}

type Props = { desa: DetailDesaKonsol; onTutup: () => void }

/** Ubah status desa (SPEC-V0.2 §7, §10.5): hanya perpindahan yang diizinkan, dengan alasan wajib yang tercatat di riwayat status. */
export function DialogUbahStatus({ desa, onTutup }: Props) {
  const queryClient = useQueryClient()
  const pilihan = PERPINDAHAN_STATUS[desa.status]
  const [ke, setKe] = useState<StatusDesa | null>(pilihan[0] ?? null)
  const [alasan, setAlasan] = useState('')
  const [galat, setGalat] = useState<Record<string, string>>({})
  const mengirim = useRef(false)
  const wadah = useRef<HTMLDivElement>(null)
  const tandai = (g: Record<string, string>) => {
    setGalat(g)
    fokusIsianSalah(wadah.current)
  }
  const aksi = useMutation({
    mutationFn: (isian: { ke: StatusDesa; alasan: string }) => ubahStatusDesa(desa.id, isian),
    onSuccess: async (_hasil, isian) => {
      tampilkanToast({ pesan: `Status desa diubah menjadi ${isian.ke}.`, nada: 'berhasil' })
      await queryClient.invalidateQueries({ queryKey: kunciKonsol.semua })
      onTutup()
    },
    onError: (e) => {
      if (e instanceof GalatApi && e.status === 409) setGalat({ _: e.message })
      else if (e instanceof GalatApi && Object.keys(e.fields).length > 0) tandai(e.fields)
      else setGalat({ _: pesanGalat(e) })
    },
    onSettled: () => {
      mengirim.current = false
    },
  })
  const tekan = () => {
    if (mengirim.current) return
    const hasil = ubahStatusDesaSchema.safeParse({ ke: ke ?? undefined, alasan })
    if (!hasil.success) {
      tandai(galatDariZod(hasil.error))
      return
    }
    setGalat({})
    mengirim.current = true
    aksi.mutate(hasil.data)
  }
  return (
    <Dialog
      isOpen
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
      judul="Ubah status desa"
      subjudul={`Desa ${desa.nama} · sekarang ${desa.status}`}
      aksi={
        <>
          <Tombol onPress={onTutup}>Batal</Tombol>
          <Tombol varian="utama" memuat={aksi.isPending} onPress={tekan}>
            Ubah status
          </Tombol>
        </>
      }
    >
      <div ref={wadah} className="flex flex-col gap-4">
        {galat._ && <Banner nada="galat">{galat._}</Banner>}
        <Select
          label="Status tujuan"
          pilihan={pilihan.map((s) => ({ id: s, label: s }))}
          nilai={ke}
          onUbah={(id) => setKe(STATUS_DESA.find((s) => s === id) ?? null)}
          galat={galat.ke || undefined}
          className="max-w-xs"
        />
        {ke && <p className="text-teks-kecil text-tinta-2">{akibat(desa.status, ke)}</p>}
        <TextArea
          label="Alasan"
          value={alasan}
          onChange={(v) => {
            setAlasan(v)
            setGalat({})
          }}
          keterangan="Dicatat di riwayat status desa. Tidak dikirim ke desa."
          galat={galat.alasan || undefined}
          baris={3}
          isRequired
        />
      </div>
    </Dialog>
  )
}
