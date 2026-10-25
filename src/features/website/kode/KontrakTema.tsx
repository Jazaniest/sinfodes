import { BAGIAN_KONTRAK, VARIABEL_KONTRAK, VERSI_KONTRAK_TEMA } from '@/domain/website/kontrak-tema'
import { variabelTema } from '@/domain/website/tema'
import { Tombol } from '@/ui/tombol/Tombol'
import { tampilkanToast } from '@/ui/toast/antrean'
import { useDrafSitus } from '../tampilan/useDrafSitus'

/** Kontrak tema (SPEC-V0.2 §11.1): versi, setiap variabel beserta nilainya sekarang, dan nama bagian kontrak. */
export function KontrakTema() {
  const { isi } = useDrafSitus()
  if (!isi) return null

  const nilai = variabelTema(isi.tema)
  const salin = () => {
    const teks = [
      VERSI_KONTRAK_TEMA,
      '',
      'Variabel:',
      ...VARIABEL_KONTRAK.map((nama) => `${nama}: ${nilai[nama] ?? ''}`),
      '',
      `Bagian: ${BAGIAN_KONTRAK.join(', ')}`,
    ].join('\n')
    void navigator.clipboard
      .writeText(teks)
      .then(() => tampilkanToast({ pesan: 'Kontrak tema disalin.', nada: 'berhasil' }))
      .catch(() => tampilkanToast({ pesan: 'Kontrak tema tidak bisa disalin otomatis.', nada: 'galat' }))
  }

  return (
    <section aria-label="Kontrak tema" className="flex flex-col gap-3 rounded-2 border border-garis p-4">
      <h3 className="text-judul font-semibold">Kontrak tema</h3>
      <p className="text-teks-kecil text-tinta-2">
        {VERSI_KONTRAK_TEMA}. Hanya variabel dan nama bagian ini yang dijamin tampilannya tetap sama.
      </p>
      <dl className="flex flex-col gap-0.5">
        {VARIABEL_KONTRAK.map((nama) => (
          <div key={nama} className="flex gap-2">
            <dt className="font-mono text-teks-kecil">{nama}</dt>
            <dd className="text-teks-kecil text-tinta-2">{nilai[nama] ?? '-'}</dd>
          </div>
        ))}
      </dl>
      <p className="text-teks-kecil text-tinta-2">Bagian: {BAGIAN_KONTRAK.join(', ')}</p>
      <Tombol ukuran="kecil" onPress={salin}>
        Salin kontrak
      </Tombol>
    </section>
  )
}
