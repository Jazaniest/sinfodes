import type { QueryClient } from '@tanstack/react-query'
import { GalatApi, pesanGalat } from '@/api/galat'
import { kunciKonsol } from '@/api/konsol'
import { tampilkanToast } from '@/ui/toast/antrean'

/**
 * Galat aksi tagihan di Konsol. 409 berarti tim lain sudah mengubah tagihan itu (Review Focus 1): tampilkan pesan server, muat
 * ulang layar, dan tutup dialog. 422 ditandai di isiannya; selain itu toast.
 */
export async function tanganiGalatAksi(
  e: unknown,
  o: { queryClient: QueryClient; tandai: (galat: Record<string, string>) => void; onTutup: () => void },
): Promise<void> {
  if (e instanceof GalatApi && e.status === 409) {
    tampilkanToast({ pesan: e.message, nada: 'galat' })
    await o.queryClient.invalidateQueries({ queryKey: kunciKonsol.semua })
    o.onTutup()
  } else if (e instanceof GalatApi && Object.keys(e.fields).length > 0) o.tandai(e.fields)
  else tampilkanToast({ pesan: pesanGalat(e), nada: 'galat' })
}
