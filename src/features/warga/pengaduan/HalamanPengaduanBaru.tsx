import { useRouter } from '@tanstack/react-router'
import { tampilkanToast } from '@/ui/toast/antrean'
import { GerbangPengajuan } from '../GerbangPengajuan'
import { FormPengaduan } from './FormPengaduan'

/** Pembungkus rute: sesudah terkirim, buka percakapan pengaduan itu. */
export function HalamanPengaduanBaru() {
  const router = useRouter()
  return (
    <GerbangPengajuan>
      <FormPengaduan
        onTerkirim={(id, nomor) => {
          tampilkanToast({ pesan: `Pengaduan ${nomor} terkirim. Petugas desa akan membalas di sini.`, nada: 'berhasil' })
          void router.navigate({ to: '/warga/pengaduan/$id', params: { id } })
        }}
      />
    </GerbangPengajuan>
  )
}
