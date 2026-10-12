import { calonUntuk, type JenisSuratWarga } from '@/domain/warga/ajukan'
import type { AnggotaKeluargaWarga } from '@/domain/warga/keluarga'
import { RadioGroup } from '@/ui/isian/RadioGroup'
import { Banner } from '@/ui/umpan-balik/Banner'

type Props = {
  jenis: Pick<JenisSuratWarga, 'subjek'>
  anggota: readonly AnggotaKeluargaWarga[]
  /** Warga yang sedang masuk, untuk label "Saya sendiri". */
  pendudukId: string
  nilai: string | null
  onUbah: (pendudukId: string) => void
  galat?: string
}

/** Langkah 2: diri sendiri atau anggota KK; surat kelahiran untuk bayi di KK (SPEC §10). */
export function LangkahUntuk({ jenis, anggota, pendudukId, nilai, onUbah, galat }: Props) {
  const calon = calonUntuk(jenis.subjek, anggota)
  if (calon.length === 0) {
    return (
      <Banner nada="info" judul="Tidak ada bayi di bawah 12 bulan di KK Anda">
        Bayi yang baru lahir dicatat dulu oleh kantor desa. Sesudah itu, surat kelahirannya bisa diajukan dari sini.
      </Banner>
    )
  }
  return (
    <RadioGroup
      label={jenis.subjek === 'kelahiran' ? 'Bayi yang diterangkan surat' : 'Surat ini untuk'}
      pilihan={calon.map((a) => ({
        id: a.id,
        label: a.id === pendudukId ? `Saya sendiri (${a.nama})` : `${a.nama} · ${a.hubunganKeluarga}`,
      }))}
      nilai={nilai}
      onUbah={onUbah}
      galat={galat}
      arah="menurun"
    />
  )
}
