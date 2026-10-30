import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { aturPassphrase, bacaStatusPassphrase, kunciSurat } from '@/api/surat'
import type { AturPassphrase } from '@/domain/surat/passphrase'
import { tampilkanToast } from '@/ui/toast/antrean'

/**
 * Passphrase tanda tangan di server nyata (Ruling 1 tahap 8F2b): status "sudah diatur" dan penetapannya. Hanya dipakai di mode
 * nyata; mode demo memakai passphrase tetap dan tidak memanggil server.
 */
export function usePassphraseTtd() {
  const queryClient = useQueryClient()
  const status = useQuery({ queryKey: kunciSurat.passphrase, queryFn: ({ signal }) => bacaStatusPassphrase(signal) })
  const mutasi = useMutation({
    mutationFn: (masukan: AturPassphrase) => aturPassphrase(masukan),
    onSuccess: (hasil) => {
      queryClient.setQueryData(kunciSurat.passphrase, hasil)
      tampilkanToast({ pesan: 'Passphrase tanda tangan ditetapkan.', nada: 'berhasil' })
    },
  })
  return {
    /** `null` selama status belum diketahui. */
    diatur: status.data?.diatur ?? null,
    atur: async (masukan: AturPassphrase): Promise<void> => {
      await mutasi.mutateAsync(masukan)
    },
    memuat: mutasi.isPending,
  }
}
