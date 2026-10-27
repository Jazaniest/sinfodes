import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { BlokTampil } from '@/domain/publik/schema'
import { srcdocBingkai, tinggiDariPesan } from '@/domain/website/bingkai-html'
import { variabelTema } from '@/domain/website/tema'
import { PublikKonteks } from '../publik-konteks'
import { WadahBlok } from './RenderSusunan'

type Props = {
  blok: Extract<BlokTampil, { jenis: 'html' }>
  /** Variabel kontrak tema untuk `:root` bingkai; bila tidak diberikan, diambil dari identitas website desa. */
  variabelTema?: Readonly<Record<string, string>>
}

/**
 * Blok HTML tingkat Lanjut (SPEC-V0.2 11.5, 7G): kode desa berjalan di bingkai `srcdoc` bersandbox `allow-scripts`
 * (keputusan 5) yang dikunci CSP, tanpa akses ke kuki, penyimpanan, jaringan, maupun dokumen induk. Tinggi otomatis
 * mulai 150 px lalu mengikuti pesan `sinfodes-tinggi` dari bingkai (keputusan 7); bila bingkai berpindah halaman,
 * `srcdoc` dipasang ulang (keputusan 6).
 */
export function BlokHtml({ blok, variabelTema: dariProps }: Props) {
  const { nama, kode, tinggi } = blok.data
  const identitas = useContext(PublikKonteks)
  const bingkai = useRef<HTMLIFrameElement>(null)
  const muat = useRef(0)
  const [ukuran, setUkuran] = useState(150)
  const otomatis = tinggi.mode === 'otomatis'
  // Kunci memo berupa nilai (bukan identitas objek) supaya `srcdoc` tidak dibuat ulang — dan bingkai tidak
  // dimuat ulang — setiap kali data blok dibentuk ulang oleh penyegaran pratinjau.
  const srcdoc = useMemo(
    () =>
      srcdocBingkai({
        kode,
        variabelTema: dariProps ?? (identitas ? variabelTema(identitas.tema) : {}),
        otomatis,
        asalMedia: `${window.location.origin}/demo/foto/`,
      }),
    [kode, otomatis, dariProps, identitas],
  )

  useEffect(() => {
    const saatPesan = (event: MessageEvent) => {
      const el = bingkai.current
      if (!el || event.source !== el.contentWindow) return
      const tinggiBaru = tinggiDariPesan(event.data)
      if (tinggiBaru !== null) setUkuran(tinggiBaru)
    }
    window.addEventListener('message', saatPesan)
    return () => window.removeEventListener('message', saatPesan)
  }, [])

  return (
    <WadahBlok blok={blok}>
      <iframe
        ref={bingkai}
        srcDoc={srcdoc}
        title={nama}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        loading="lazy"
        style={{ width: '100%', height: tinggi.mode === 'tetap' ? tinggi.px : ukuran, border: 0 }}
        onLoad={() => {
          const el = bingkai.current
          if (!el) return
          muat.current += 1
          if (muat.current === 1) return // muat awal dari pemasangan pertama dibiarkan
          muat.current = 0 // pemasangan ulang memicu satu muat baru yang dianggap muat awal
          el.srcdoc = srcdoc
        }}
      />
    </WadahBlok>
  )
}
