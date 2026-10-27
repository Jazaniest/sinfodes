import { namaSyarat, syaratWajib, type JenisSuratWarga } from '@/domain/warga/ajukan'
import type { FotoTerpilih } from '../foto'
import { PilihFoto } from '../PilihFoto'
import type { FotoSyarat } from './ajukan'

type Props = {
  jenis: Pick<JenisSuratWarga, 'syarat'>
  foto: FotoSyarat
  onUbah: (syarat: string, foto: FotoTerpilih | null) => void
  /** Pesan per syarat, mis. "Foto KTP wajib dilampirkan." */
  galat: Readonly<Record<string, string>>
  kecilkan?: (berkas: File) => Promise<File>
}

/** Langkah 4: satu foto per syarat, dari kamera atau galeri; foto dikecilkan sebelum dikirim (SPEC §10). */
export function LangkahLampiran({ jenis, foto, onUbah, galat, kecilkan }: Props) {
  if (jenis.syarat.length === 0) return <p className="text-tinta-2">Jenis surat ini tidak memerlukan lampiran.</p>
  return (
    <div className="flex flex-col gap-3">
      <p className="text-tinta-2">Foto dokumennya dengan jelas. Foto dikecilkan di HP ini sebelum dikirim, supaya hemat kuota.</p>
      {jenis.syarat.map((s) => (
        <PilihFoto
          key={s}
          label={namaSyarat(s)}
          wajib={syaratWajib(s)}
          foto={foto[s] ?? null}
          onUbah={(f) => onUbah(s, f)}
          galat={galat[s]}
          kecilkan={kecilkan}
        />
      ))}
    </div>
  )
}
