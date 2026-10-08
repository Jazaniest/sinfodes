import { useBlocker } from '@tanstack/react-router'
import { ConfirmDialog } from '@/ui/lapisan/ConfirmDialog'

/**
 * Penjaga keluar halaman saat ada perubahan yang belum disimpan (SPEC §6.4). Juga menjaga tutup/muat ulang tab.
 * Navigasi setelah simpan berhasil memakai `ignoreBlocker: true`, supaya dialog ini tidak muncul.
 */
export function PenjagaKeluar({ aktif }: { aktif: boolean }) {
  const penjaga = useBlocker({ shouldBlockFn: () => aktif, enableBeforeUnload: () => aktif, withResolver: true })
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
      Perubahan yang belum disimpan tidak ikut tersimpan ke data desa. Drafnya tetap ada di perangkat ini.
    </ConfirmDialog>
  )
}
