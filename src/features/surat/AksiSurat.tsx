import { FilePdf, PenNib, Printer, WhatsappLogo } from '@phosphor-icons/react'
import { useState } from 'react'
import { samarkanTelepon } from '@/domain/format/telepon'
import { useBoleh } from '@/features/admin/useBoleh'
import { aksiTersedia } from '@/domain/surat/alur'
import type { AksiSurat as Aksi, DetailPermohonan } from '@/domain/surat/permohonan'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { useSesiAdmin } from '../admin/sesi-konteks'
import { DialogAlasan } from './DialogAlasan'
import { DialogKirimWa } from './DialogKirimWa'
import { DialogTandaTangani } from './DialogTandaTangani'
import { pesanWhatsApp } from './pesan-wa'
import { DIALOG_ALASAN, useAksiSurat, type AksiAlasan } from './useAksiSurat'

type Props = {
  d: DetailPermohonan
  /** Isian yang sedang tampil (bisa belum disimpan); ikut dikirim saat "Ajukan tanda tangan". */
  isian: Readonly<Record<string, string>>
  onBerhasil: (aksi: Aksi) => void
  onGalatIsian: (galat: Record<string, string>) => void
  onCetak: () => void
}

type JenisDialog = AksiAlasan | 'tandatangani' | 'kirim-wa'

/** Aksi sesuai status dan peran (SPEC §7.4). Tombol yang tidak berhak disembunyikan; API tiruan tetap memeriksa. */
export function AksiSurat({ d, isian, onBerhasil, onGalatIsian, onCetak }: Props) {
  const { pengguna, desa } = useSesiAdmin()
  const boleh = useBoleh()
  const [dialog, setDialog] = useState<JenisDialog | null>(null)
  const [galatDialog, setGalatDialog] = useState<string | undefined>()
  const p = d.permohonan
  const aksi = aksiTersedia(p, d.jenis, pengguna.peran).filter((a) => a !== 'kirim-wa' || d.pemohon.telepon !== null)
  const bolehCetak = p.status === 'selesai' && (boleh('surat.proses') || boleh('surat.tandatangani'))
  const { jalan: kirim, sedang, berjalan } = useAksiSurat(p.id, {
    onBerhasil: (_baru, a) => {
      setDialog(null)
      onBerhasil(a)
    },
    onGalatIsian,
    onGalatKolom: (pesan) => {
      if (!dialog) return false
      setGalatDialog(pesan)
      return true
    },
  })

  const ada = (a: Aksi) => aksi.includes(a)
  const memuat = (a: Aksi) => berjalan === a
  const jalan = (a: Aksi, body?: object) => {
    setGalatDialog(undefined)
    kirim(a, body)
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
