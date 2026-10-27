import { useBlocker } from '@tanstack/react-router'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'

/**
 * Penjaga keluar halaman saat ada perubahan yang belum disimpan (SPEC §6.4). Juga menjaga tutup/muat ulang tab.
 * Navigasi setelah simpan berhasil memakai `ignoreBlocker: true`, supaya dialog ini tidak muncul.
 * Hanya perpindahan ke halaman lain yang ditahan; pindah langkah lewat parameter cari dibiarkan.
 */
const KETERANGAN_BAWAAN = 'Perubahan yang belum disimpan tidak ikut tersimpan ke data desa. Drafnya tetap ada di perangkat ini.'

export function PenjagaKeluar({ aktif, keterangan = KETERANGAN_BAWAAN }: { aktif: boolean; keterangan?: string }) {
  const penjaga = useBlocker({
    shouldBlockFn: ({ current, next }) => aktif && current.pathname !== next.pathname,
    enableBeforeUnload: () => aktif,
    withResolver: true,
  })
  return (
    <ConfirmDialog
      isOpen={penjaga.status === 'blocked'}
      onOpenChange={(buka) => {
        if (!buka) penjaga.reset?.()
      }}
      judul="Tinggalkan halaman ini?"
      labelSetuju="Tinggalkan"
      labelBatal="Tetap di sini"
      bahaya
      onSetuju={() => penjaga.proceed?.()}
    >
      {keterangan}
    </ConfirmDialog>
  )
}
