import { KUALITAS_JPEG, MAKS_FOTO_ASLI_MB, ukuranKecil } from '@/domain/warga/foto'

/** Foto yang sudah dikecilkan, beserta ukuran aslinya untuk ditampilkan. */
export type FotoTerpilih = { berkas: File; asliKb: number }

/** Alat gambar. Uji memakai alat tiruan, karena jsdom tidak punya kanvas. */
export type AlatGambar = {
  muat: (berkas: Blob) => Promise<{ lebar: number; tinggi: number; sumber: CanvasImageSource; tutup: () => void }>
  gambar: (sumber: CanvasImageSource, lebar: number, tinggi: number, kualitas: number) => Promise<Blob>
}

/** Kanvas peramban. `createImageBitmap` mengikuti orientasi EXIF, jadi foto kamera tidak terbalik. */
export const alatPeramban: AlatGambar = {
  muat: async (berkas) => {
    const gambar = await createImageBitmap(berkas)
    return { lebar: gambar.width, tinggi: gambar.height, sumber: gambar, tutup: () => gambar.close() }
  },
  gambar: (sumber, lebar, tinggi, kualitas) =>
    new Promise((selesai, gagal) => {
      const kanvas = document.createElement('canvas')
      kanvas.width = lebar
      kanvas.height = tinggi
      const konteks = kanvas.getContext('2d')
      if (!konteks) {
        gagal(new Error('Kanvas tidak tersedia'))
        return
      }
      konteks.drawImage(sumber, 0, 0, lebar, tinggi)
      kanvas.toBlob((hasil) => (hasil ? selesai(hasil) : gagal(new Error('Foto tidak bisa diproses'))), 'image/jpeg', kualitas)
    }),
}

/** Pesan bila berkas yang dipilih bukan gambar atau terlalu besar; null bila boleh dikecilkan (fokus review 2). */
export function periksaFotoAsli(berkas: { type: string; size: number }): string | null {
  if (!berkas.type.startsWith('image/')) return 'Pilih berkas foto (JPG, PNG, atau HEIC dari kamera).'
  if (berkas.size > MAKS_FOTO_ASLI_MB * 1024 * 1024) return `Foto terlalu besar. Paling besar ${MAKS_FOTO_ASLI_MB} MB.`
  return null
}

/** Foto dikecilkan di HP sebelum dikirim (SPEC §10): sisi terpanjang 1600px, JPEG kualitas 0,7. */
export async function kecilkanFoto(berkas: File, alat: AlatGambar = alatPeramban): Promise<File> {
  const g = await alat.muat(berkas)
  try {
    const { lebar, tinggi } = ukuranKecil(g.lebar, g.tinggi)
    const hasil = await alat.gambar(g.sumber, lebar, tinggi, KUALITAS_JPEG)
    const nama = berkas.name.replace(/\.[^.]+$/, '') || 'foto'
    return new File([hasil], `${nama}.jpg`, { type: 'image/jpeg' })
  } finally {
    g.tutup()
  }
}
