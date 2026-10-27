import { useEffect, useMemo, useRef, useState } from 'react'
import type { BlokTampil } from '@/domain/publik/schema'
import { variabelTema } from '@/domain/website/tema'
import { BlokHtml as PratinjauBlokHtml } from '../../publik/blok/BlokHtml'
import { cn } from '@/ui/cn'
import { gayaKotakBebas } from '@/ui/isian/gaya'
import { useDrafSitus } from '../tampilan/useDrafSitus'
import { SalinPrompt } from './SalinPrompt'

/**
 * Penyunting satu kode HTML (7G): isian kode dengan penghitung ukuran byte UTF-8 dan pratinjau `BlokHtml` langsung.
 * Kode masuk draf 500 ms setelah ketikan, sekaligus jadi sumber pratinjau supaya bingkai tidak ikut muat ulang tiap
 * huruf.
 */
export function PenyuntingBlokHtml({ id }: { id: string }) {
  const { isi, ubah } = useDrafSitus()
  const item = isi?.blokHtml.find((b) => b.id === id)
  const [kode, setKode] = useState(() => item?.kode ?? '')
  const tersimpan = useRef(item?.kode ?? '')
  const tema = isi?.tema
  const variabel = useMemo(() => (tema ? variabelTema(tema) : {}), [tema])

  useEffect(() => {
    const jadwal = setTimeout(() => {
      if (kode === tersimpan.current) return
      tersimpan.current = kode
      ubah((d) => ({ ...d, blokHtml: d.blokHtml.map((b) => (b.id === id ? { ...b, kode } : b)) }))
    }, 500)
    return () => clearTimeout(jadwal)
  }, [kode, id, ubah])

  if (!isi || !item) return null

  const byte = new TextEncoder().encode(kode).length
  const blok: Extract<BlokTampil, { jenis: 'html' }> = {
    id: 'blk_pratinjau',
    jenis: 'html',
    varian: 'bingkai',
    lebar: 'penuh',
    tersembunyi: false,
    isi: { htmlId: item.id },
    data: { nama: item.nama, kode: item.kode, tinggi: item.tinggi },
  }

  return (
    <section aria-label={`Kode ${item.nama}`} className="flex flex-col gap-3 rounded-2 border border-garis p-4">
      <h4 className="text-label font-medium text-tinta-2 uppercase">Kode {item.nama}</h4>
      <textarea
        aria-label="Kode HTML"
        spellCheck={false}
        rows={12}
        value={kode}
        onChange={(e) => setKode(e.target.value)}
        className={cn(gayaKotakBebas, 'w-full font-mono text-teks-kecil')}
      />
      <p className="text-teks-kecil text-tinta-2">
        Ukuran kode: {(byte / 1024).toFixed(1).replace('.', ',')} KB dari 64 KB.
      </p>
      <PratinjauBlokHtml blok={blok} variabelTema={variabel} />
      <SalinPrompt jenis="html" />
    </section>
  )
}
