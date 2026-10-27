import { useState } from 'react'
import { formatJam } from '@/domain/format/tanggal'
import { Banner } from '@/ui/umpan-balik/Banner'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'
import { tampilkanToast } from '@/ui/toast/antrean'
import { Tombol } from '@/ui/tombol/Tombol'
import { DialogTerbitkan } from './DialogTerbitkan'
import { LaciRiwayat } from './LaciRiwayat'
import { useDrafSitus } from './useDrafSitus'

const PESAN_BENTROK = 'Draf diubah di tempat lain. Muat ulang untuk melihat perubahan terbaru.'

/** Bilah draf di kepala Tampilan (keputusan 4-7): status simpan, Terbitkan, Buang draf, dan Riwayat. */
export function BilahDraf() {
  const { status, tersimpanPada, adaDraf, cobaLagi, muatUlang, buang } = useDrafSitus()
  const [dialogTerbitkan, setDialogTerbitkan] = useState(false)
  const [dialogBuang, setDialogBuang] = useState(false)
  const [dialogRiwayat, setDialogRiwayat] = useState(false)

  const terkunci = status === 'bentrok' || status === 'tidak-sah'
  const teks =
    status === 'menyimpan'
      ? 'Menyimpan…'
      : status === 'gagal'
        ? 'Gagal menyimpan. Coba lagi'
        : status === 'tidak-sah'
          ? 'Ada isian yang perlu diperbaiki'
          : status === 'bentrok'
            ? 'Perubahan belum tersimpan.'
            : adaDraf && tersimpanPada
              ? `Draf tersimpan pukul ${formatJam(tersimpanPada)}`
              : 'Tidak ada draf'

  return (
    <section
      aria-label="Bilah draf"
      className="sticky top-0 z-20 flex flex-col gap-2 rounded-2 border border-garis bg-lembar/95 px-4 py-3 shadow-melayang backdrop-blur"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p role="status" aria-live="polite" className="mr-auto text-teks-kecil text-tinta-2">
          {teks}
        </p>
        {status === 'gagal' && (
          <Tombol ukuran="kecil" onPress={cobaLagi}>
            Coba lagi
          </Tombol>
        )}
        <Tombol varian="utama" isDisabled={!adaDraf || terkunci} onPress={() => setDialogTerbitkan(true)}>
          Terbitkan
        </Tombol>
        <Tombol isDisabled={!adaDraf || status === 'bentrok'} onPress={() => setDialogBuang(true)}>
          Buang draf
        </Tombol>
        <Tombol onPress={() => setDialogRiwayat(true)}>Riwayat</Tombol>
      </div>
      {status === 'bentrok' && (
        <Banner nada="peringatan" aksi={<Tombol ukuran="kecil" onPress={muatUlang}>Muat ulang</Tombol>}>
          {PESAN_BENTROK}
        </Banner>
      )}
      <DialogTerbitkan
        isOpen={dialogTerbitkan}
        onOpenChange={setDialogTerbitkan}
        onTerbit={() => tampilkanToast({ pesan: 'Website diterbitkan.', nada: 'berhasil' })}
      />
      <ConfirmDialog
        isOpen={dialogBuang}
        onOpenChange={setDialogBuang}
        judul="Buang draf?"
        labelSetuju="Buang draf"
        bahaya
        onSetuju={() => {
          setDialogBuang(false)
          void buang().then(() => tampilkanToast({ pesan: 'Draf dibuang.', nada: 'berhasil' }))
        }}
      >
        <p>Semua perubahan yang belum diterbitkan hilang.</p>
      </ConfirmDialog>
      <LaciRiwayat isOpen={dialogRiwayat} onOpenChange={setDialogRiwayat} onPulihkan={() => setDialogRiwayat(false)} />
    </section>
  )
}
