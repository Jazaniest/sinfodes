import { useQuery } from '@tanstack/react-query'
import { opsiBantuanKeluarga } from '@/api/bansos'
import { pesanGalat } from '@/api/galat'
import { labelTahap } from '@/domain/bansos/schema'
import { formatTanggal } from '@/domain/format/tanggal'
import { Cap } from '@/ui/cap/Cap'
import { Tautan } from '@/ui/navigasi/Tautan'
import { ErrorState } from '@/ui/umpan-balik/ErrorState'
import { BarisKerangka } from '@/ui/umpan-balik/Skeleton'

/** Tab Bantuan di profil penduduk (SPEC §6.3): program bansos keluarganya dan status penyaluran tiap tahap. */
export function BantuanKeluarga({ keluargaId }: { keluargaId: string }) {
  const kueri = useQuery(opsiBantuanKeluarga(keluargaId))
  if (kueri.isPending) return <BarisKerangka jumlah={3} label="Memuat bantuan…" />
  if (kueri.isError) return <ErrorState pesan={pesanGalat(kueri.error)} onCobaLagi={() => void kueri.refetch()} />
  if (kueri.data.length === 0) return <p className="text-tinta-2">Keluarga ini tidak tercatat sebagai penerima bantuan sosial.</p>
  return (
    <ul aria-label="Bantuan keluarga" className="flex flex-col gap-6">
      {kueri.data.map(({ program: p, penerima: x }) => (
        <li key={x.id} className="flex flex-col gap-2">
          <p className="font-medium">
            <Tautan href={`/admin/bansos/${p.id}`} nada="tinta">
              {p.nama}
            </Tautan>
          </p>
          <p className="text-teks-kecil text-tinta-2">
            Atas nama {x.atasNama.nama} · desil {x.desil}
          </p>
          {x.perluDitinjau && (
            <p className="flex flex-wrap items-center gap-2 text-teks-kecil">
              <Cap varian="perlu-ditinjau" />
              <span className="text-tinta-2">{x.perluDitinjau.alasan}</span>
            </p>
          )}
          <ol aria-label={`Penyaluran ${p.singkat}`} className="flex flex-col gap-1.5 text-teks-kecil">
            {p.tahap.map((t, i) => (
              <li key={t.ke} className="flex items-center justify-between gap-3">
                <span>
                  {labelTahap(t.ke)} · {formatTanggal(t.jadwal, 'pendek')}
                </span>
                <Cap varian={x.penyaluran[i] ?? 'dijadwalkan'} />
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  )
}
