import { namaSyarat, type JenisSuratWarga } from '@/domain/warga/ajukan'
import { namaJenisLengkap } from '@/domain/warga/permohonan'
import { IsianSurat } from '@/features/surat/IsianSurat'
import { DescriptionList } from '@/ui/data/DescriptionList'
import type { FotoSyarat } from './ajukan'

type Props = { jenis: JenisSuratWarga; untuk: string; isian: Readonly<Record<string, string>>; foto: FotoSyarat }

/** Langkah 5: ringkasan yang akan dikirim (SPEC §10). */
export function LangkahPeriksa({ jenis, untuk, isian, foto }: Props) {
  const lampiran = jenis.syarat.flatMap((s) => {
    const f = foto[s]
    return f ? [{ label: namaSyarat(s), nilai: f.berkas.name }] : []
  })
  return (
    <div className="flex flex-col gap-6">
      <DescriptionList
        items={[
          { label: 'Jenis surat', nilai: namaJenisLengkap(jenis) },
          { label: 'Untuk', nilai: untuk },
        ]}
      />
      <IsianSurat jenis={jenis} nilai={isian} galat={{}} bisaUbah={false} onUbah={() => {}} />
      <DescriptionList judul="Lampiran" items={lampiran.length > 0 ? lampiran : [{ label: 'Foto', nilai: 'Tidak ada' }]} />
    </div>
  )
}
