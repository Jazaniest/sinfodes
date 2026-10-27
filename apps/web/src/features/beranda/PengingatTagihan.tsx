import { kalimatPengingatTagihan, type PengingatTagihan as Pengingat } from '@/domain/langganan/pengingat'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Banner, type NadaBanner } from '@/ui/umpan-balik/Banner'

/** Batas nada peringatan: jatuh tempo seminggu lagi atau kurang, atau sudah lewat. */
const DEKAT_HARI = 7

function nada(p: Pengingat): NadaBanner {
  if (p.keadaan === 'diperiksa') return 'info'
  return p.sisaHari <= DEKAT_HARI ? 'peringatan' : 'info'
}

/** Pita tagihan langganan di Beranda (SPEC-V0.2 §10): mulai H-14 sebelum jatuh tempo, atau keterangan bukti sedang diperiksa. */
export function PengingatTagihan({ pengingat }: { pengingat: Pengingat }) {
  return (
    <section aria-label="Tagihan langganan">
      <Banner nada={nada(pengingat)} aksi={<Tautan href="/admin/pengaturan/langganan" nada="tinta">Buka Langganan</Tautan>}>
        {kalimatPengingatTagihan(pengingat.keadaan, pengingat)}
      </Banner>
    </section>
  )
}
