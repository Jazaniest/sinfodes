import { FilePdf, PenNib, Printer, WhatsappLogo } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { GalatApi, pesanGalat } from '@/api/galat'
import { segarkanSurat } from '@/api/segarkan'
import { jalankanAksi, kunciSurat } from '@/api/surat'
import { samarkanTelepon } from '@/domain/format/telepon'
import { boleh } from '@/domain/pengguna/hak-akses'
import { aksiTersedia } from '@/domain/surat/alur'
import type { AksiSurat as Aksi, DetailPermohonan } from '@/domain/surat/permohonan'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { DialogAlasan } from './DialogAlasan'
import { DialogKirimWa } from './DialogKirimWa'
import { DialogTandaTangani } from './DialogTandaTangani'
import { pesanWhatsApp } from './pesan-wa'

type Props = {
  d: DetailPermohonan
  /** Isian yang sedang tampil (bisa belum disimpan); ikut dikirim saat "Ajukan tanda tangan". */
  isian: Readonly<Record<string, string>>
  onBerhasil: (aksi: Aksi) => void
  onGalatIsian: (galat: Record<string, string>) => void
  onCetak: () => void
}

type AksiAlasan = 'tolak' | 'kembalikan' | 'batalkan'
type JenisDialog = AksiAlasan | 'tandatangani' | 'kirim-wa'

const DIALOG_ALASAN: Readonly<
  Record<AksiAlasan, { judul: string; label: string; keterangan: string; labelSetuju: string; bahaya: boolean; kunci: 'alasan' | 'catatan' }>
> = {
  tolak: {
    judul: 'Tolak permohonan?', label: 'Alasan penolakan', labelSetuju: 'Tolak permohonan', bahaya: true, kunci: 'alasan',
    keterangan: 'Alasan ini dibaca pemohon. Tulis apa yang perlu diperbaiki atau dilengkapi.',
  },
  kembalikan: {
    judul: 'Kembalikan ke operator?', label: 'Catatan perbaikan', labelSetuju: 'Kembalikan', bahaya: false, kunci: 'catatan',
    keterangan: 'Tulis apa yang perlu diperbaiki sebelum surat diajukan lagi.',
  },
  batalkan: {
    judul: 'Batalkan surat ini?', label: 'Alasan pembatalan', labelSetuju: 'Batalkan surat', bahaya: true, kunci: 'alasan',
    keterangan: 'Surat yang sudah terbit tidak dihapus. Nomornya tetap tercatat dan tidak dipakai ulang.',
  },
}

function pesanBerhasil(baru: DetailPermohonan, aksi: Aksi): string {
  const p = baru.permohonan
  switch (aksi) {
    case 'proses':
      return 'Permohonan mulai diproses.'
    case 'tolak':
      return 'Permohonan ditolak.'
    case 'ajukan-ttd':
      return p.tahap === 'paraf' ? 'Diajukan ke Sekretaris Desa untuk paraf.' : 'Diajukan ke Kepala Desa untuk tanda tangan.'
    case 'paraf':
      return 'Surat diparaf. Kini menunggu tanda tangan Kepala Desa.'
    case 'kembalikan':
      return 'Surat dikembalikan ke operator untuk diperbaiki.'
    case 'tandatangani':
      return `Surat ditandatangani. Nomor ${p.terbit?.nomor ?? ''}.`
    case 'batalkan':
      return 'Surat dibatalkan. Nomornya tetap tercatat.'
    case 'tandai-diambil':
      return 'Ditandai sudah diambil.'
    case 'kirim-wa':
      return `Pesan terkirim ke ${samarkanTelepon(baru.pemohon.telepon ?? '')}`
  }
}

/** Aksi sesuai status dan peran (SPEC §7.4). Tombol yang tidak berhak disembunyikan; API tiruan tetap memeriksa. */
export function AksiSurat({ d, isian, onBerhasil, onGalatIsian, onCetak }: Props) {
  const { pengguna, desa } = useSesiAdmin()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<JenisDialog | null>(null)
  const [galatDialog, setGalatDialog] = useState<string | undefined>()
  const p = d.permohonan
  const aksi = aksiTersedia(p, d.jenis, pengguna.peran).filter((a) => a !== 'kirim-wa' || d.pemohon.telepon !== null)
  const bolehCetak = p.status === 'selesai' && (boleh(pengguna.peran, 'surat.proses') || boleh(pengguna.peran, 'surat.tandatangani'))

  const jalankan = useMutation({
    mutationFn: ({ aksi: a, body }: { aksi: Aksi; body?: object }) => jalankanAksi(p.id, a, body),
    onSuccess: (baru, { aksi: a }) => {
      queryClient.setQueryData(kunciSurat.detail(p.id), baru)
      void segarkanSurat(queryClient)
      setDialog(null)
      onBerhasil(a)
      tampilkanToast({ pesan: pesanBerhasil(baru, a), nada: 'berhasil' })
    },
    onError: (galat) => {
      if (galat instanceof GalatApi && galat.kode === 'VALIDATION') {
        const isianSalah = Object.fromEntries(
          Object.entries(galat.fields).flatMap(([kunci, pesan]) => (kunci.startsWith('isian.') ? [[kunci.slice(6), pesan]] : [])),
        )
        if (Object.keys(isianSalah).length > 0) {
          onGalatIsian(isianSalah)
          tampilkanToast({ pesan: 'Isian surat belum lengkap. Periksa isian yang ditandai.', nada: 'galat' })
          return
        }
        const pesanKolom = Object.values(galat.fields)[0]
        if (dialog && pesanKolom) {
          setGalatDialog(pesanKolom)
          return
        }
      }
      if (galat instanceof GalatApi && galat.kode === 'CONFLICT') void queryClient.invalidateQueries({ queryKey: kunciSurat.detail(p.id) })
      tampilkanToast({ pesan: pesanGalat(galat), nada: 'galat' })
    },
  })

  const sedang = jalankan.isPending
  const ada = (a: Aksi) => aksi.includes(a)
  const memuat = (a: Aksi) => sedang && jalankan.variables?.aksi === a
  const jalan = (a: Aksi, body?: object) => {
    setGalatDialog(undefined)
    jalankan.mutate({ aksi: a, body })
  }
  const buka = (jenis: JenisDialog) => {
    setGalatDialog(undefined)
    setDialog(jenis)
  }
  const tutup = () => setDialog(null)
  const alasan = dialog === 'tolak' || dialog === 'kembalikan' || dialog === 'batalkan' ? { aksi: dialog, ...DIALOG_ALASAN[dialog] } : null
  const subjudul = `${d.jenis.nama} · ${d.pemohon.nama}`

  if (aksi.length === 0 && !bolehCetak) {
    return <p className="text-teks-kecil text-tinta-2">Tidak ada aksi untuk peran Anda pada status ini.</p>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {ada('proses') && (
        <Tombol varian="utama" memuat={memuat('proses')} isDisabled={sedang} onPress={() => jalan('proses')}>
          Proses
        </Tombol>
      )}
      {ada('ajukan-ttd') && (
        <Tombol varian="utama" memuat={memuat('ajukan-ttd')} isDisabled={sedang} onPress={() => jalan('ajukan-ttd', { isian })}>
          Ajukan tanda tangan
        </Tombol>
      )}
      {ada('paraf') && (
        <Tombol varian="utama" memuat={memuat('paraf')} isDisabled={sedang} onPress={() => jalan('paraf')}>
          Paraf
        </Tombol>
      )}
      {ada('tandatangani') && (
        <Tombol varian="utama" ikon={<PenNib aria-hidden size={16} />} isDisabled={sedang} onPress={() => buka('tandatangani')}>
          Tanda tangani
        </Tombol>
      )}
      {bolehCetak && (
        <>
          <Tombol varian="utama" ikon={<Printer aria-hidden size={16} />} onPress={onCetak}>
            Cetak
          </Tombol>
          <Tombol
            ikon={<FilePdf aria-hidden size={16} />}
            onPress={() => {
              tampilkanToast({ pesan: 'Pilih “Simpan sebagai PDF” di jendela cetak.', nada: 'info' })
              onCetak()
            }}
          >
            Unduh PDF
          </Tombol>
        </>
      )}
      {ada('kirim-wa') && (
        <Tombol ikon={<WhatsappLogo aria-hidden size={16} />} isDisabled={sedang} onPress={() => buka('kirim-wa')}>
          Kirim ke WhatsApp
        </Tombol>
      )}
      {ada('tandai-diambil') && (
        <Tombol memuat={memuat('tandai-diambil')} isDisabled={sedang} onPress={() => jalan('tandai-diambil')}>
          Tandai sudah diambil
        </Tombol>
      )}
      {ada('tolak') && (
        <Tombol varian="teks" isDisabled={sedang} onPress={() => buka('tolak')}>
          Tolak
        </Tombol>
      )}
      {ada('kembalikan') && (
        <Tombol varian="teks" isDisabled={sedang} onPress={() => buka('kembalikan')}>
          Kembalikan
        </Tombol>
      )}
      {ada('batalkan') && (
        <Tombol varian="teks" isDisabled={sedang} onPress={() => buka('batalkan')}>
          Batalkan surat
        </Tombol>
      )}

      {alasan && (
        <DialogAlasan
          key={alasan.aksi}
          judul={alasan.judul}
          subjudul={subjudul}
          label={alasan.label}
          keterangan={alasan.keterangan}
          labelSetuju={alasan.labelSetuju}
          bahaya={alasan.bahaya}
          memuat={sedang}
          galat={galatDialog}
          onSetuju={(teks) => jalan(alasan.aksi, { [alasan.kunci]: teks })}
          onTutup={tutup}
        />
      )}
      {dialog === 'tandatangani' && (
        <DialogTandaTangani
          judulSurat={d.jenis.nama}
          pemohon={d.pemohon.nama}
          atasNama={pengguna.peran !== 'kades'}
          memuat={sedang}
          galat={galatDialog}
          onSetuju={(passphrase) => jalan('tandatangani', { passphrase })}
          onTutup={tutup}
        />
      )}
      {dialog === 'kirim-wa' && (
        <DialogKirimWa
          pesan={pesanWhatsApp(d, desa)}
          tujuan={samarkanTelepon(d.pemohon.telepon ?? '')}
          memuat={sedang}
          onKirim={() => jalan('kirim-wa')}
          onTutup={tutup}
        />
      )}
    </div>
  )
}
