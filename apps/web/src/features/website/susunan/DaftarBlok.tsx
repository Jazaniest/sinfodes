import { ArrowDown, ArrowUp, Copy, DotsSixVertical, Eye, EyeSlash, Trash } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, GridList, GridListItem, useDragAndDrop } from 'react-aria-components'
import { LABEL_JENIS_BLOK, labelVarianBlok, type Blok } from '@/domain/website/blok'
import { cn } from '@/ui/cn'
import { Tombol } from '@/ui/tombol/Tombol'
import { labelBlok, MAKS_BLOK } from './aksi-susunan'

type Props = {
  blok: readonly Blok[]
  /** ID blok yang sumber datanya belum ada (dari pratinjau), ditandai "Kosong". */
  kosong: ReadonlySet<string>
  terpilih: string | null
  onPilih: (id: string) => void
  onPindah: (id: string, ke: number) => void
  onGandakan: (id: string) => void
  onTersembunyi: (id: string, tersembunyi: boolean) => void
  onHapus: (id: string) => void
  onTambah: () => void
}

function Aksi({ label, blok, children, onTekan, mati, aksi }: {
  label: string
  blok: Blok
  children: ReactNode
  onTekan: () => void
  mati?: boolean
  aksi: string
}) {
  return (
    <Tombol ukuran="kecil" isDisabled={mati} onPress={onTekan} data-blok={blok.id} data-aksi={aksi} className="px-2">
      {children}
      <span className="sr-only">
        {label}: {labelBlok(blok)}
      </span>
    </Tombol>
  )
}

/**
 * Daftar blok halaman (SPEC-V0.2 11.4): seret-taruh memakai React Aria, tombol Naik/Turun untuk papan ketik, dan tanda
 * Tersembunyi atau Kosong. Perpindahan urutan diumumkan lewat wilayah aria-live.
 */
export function DaftarBlok(props: Props) {
  const { blok, kosong, terpilih, onPilih, onPindah, onGandakan, onTersembunyi, onHapus, onTambah } = props
  const [pengumuman, setPengumuman] = useState('')
  const fokus = useRef<{ id: string; aksi: string } | null>(null)

  // Fokus kembali ke tombol yang sama setelah bloknya berpindah (fokus review 3).
  useEffect(() => {
    if (!fokus.current) return
    document.querySelector<HTMLElement>(`[data-blok="${fokus.current.id}"][data-aksi="${fokus.current.aksi}"]`)?.focus()
    fokus.current = null
  })

  const pindah = (b: Blok, ke: number) => {
    onPindah(b.id, ke)
    fokus.current = { id: b.id, aksi: ke < blok.indexOf(b) ? 'naik' : 'turun' }
    setPengumuman(`${LABEL_JENIS_BLOK[b.jenis]} dipindah ke posisi ${Math.min(Math.max(ke, 0), blok.length - 1) + 1} dari ${blok.length}.`)
  }

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((k) => ({ 'text/plain': String(k) })),
    onReorder: (e) => {
      const urutan = blok.map((b) => b.id)
      const sumber = urutan.indexOf(String([...e.keys][0]))
      const target = urutan.indexOf(String(e.target.key))
      if (sumber < 0 || target < 0) return
      const ke = e.target.dropPosition === 'after' ? target + 1 : target
      pindah(blok[sumber], ke > sumber ? ke - 1 : ke)
    },
  })

  const penuh = blok.length >= MAKS_BLOK
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-label font-medium text-tinta-2 uppercase">Blok halaman</p>
        <div className="flex items-center gap-2">
          {penuh && <span className="text-teks-kecil text-tinta-2">Paling banyak {MAKS_BLOK} blok di satu halaman.</span>}
          <Tombol ukuran="kecil" isDisabled={penuh} onPress={onTambah} data-aksi="tambah">
            Tambah blok
          </Tombol>
        </div>
      </div>
      <GridList
        aria-label="Blok halaman"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={terpilih ? [terpilih] : []}
        onSelectionChange={(k) => {
          const id = [...k][0]
          if (id) onPilih(String(id))
        }}
        dragAndDropHooks={dragAndDropHooks}
        className="flex flex-col gap-2"
      >
        {blok.map((b) => (
          <GridListItem
            key={b.id}
            id={b.id}
            textValue={labelBlok(b)}
            aria-label={labelBlok(b)}
            className={({ isSelected }) =>
              cn(
                'rounded-2 border bg-lembar p-3 outline-none',
                isSelected ? 'border-tinta ring-1 ring-tinta' : 'border-garis',
                'data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru',
              )
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button slot="drag" aria-label={`Seret: ${labelBlok(b)}`} className="cursor-grab rounded-1 p-1 text-tinta-2 outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:outline-biru">
                <DotsSixVertical aria-hidden size={14} />
              </Button>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="min-w-0 font-medium">
                  {LABEL_JENIS_BLOK[b.jenis]} <span className="text-tinta-2">({labelVarianBlok(b).toLocaleLowerCase('id-ID')})</span>
                </span>
                <span className="flex flex-wrap gap-1">
                  {b.tersembunyi && (
                    <span className="rounded-penuh bg-kertas-2 px-2 py-0.5 text-label font-medium text-tinta-2">Tersembunyi</span>
                  )}
                  {kosong.has(b.id) && (
                    <span className="rounded-penuh bg-oker-muda px-2 py-0.5 text-label font-medium text-oker">Kosong, tidak tampil di website</span>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Aksi label="Naik" blok={b} aksi="naik" mati={blok[0]?.id === b.id} onTekan={() => pindah(b, blok.indexOf(b) - 1)}>
                  <ArrowUp aria-hidden size={12} />
                </Aksi>
                <Aksi label="Turun" blok={b} aksi="turun" mati={blok[blok.length - 1]?.id === b.id} onTekan={() => pindah(b, blok.indexOf(b) + 1)}>
                  <ArrowDown aria-hidden size={12} />
                </Aksi>
                <Aksi label="Gandakan" blok={b} aksi="gandakan" onTekan={() => onGandakan(b.id)}>
                  <Copy aria-hidden size={12} />
                </Aksi>
                {b.tersembunyi ? (
                  <Aksi label="Tampilkan" blok={b} aksi="tampilkan" onTekan={() => onTersembunyi(b.id, false)}>
                    <Eye aria-hidden size={12} />
                  </Aksi>
                ) : (
                  <Aksi label="Sembunyikan" blok={b} aksi="sembunyikan" onTekan={() => onTersembunyi(b.id, true)}>
                    <EyeSlash aria-hidden size={12} />
                  </Aksi>
                )}
                <Aksi label="Hapus" blok={b} aksi="hapus" onTekan={() => onHapus(b.id)}>
                  <Trash aria-hidden size={12} />
                </Aksi>
              </div>
            </div>
          </GridListItem>
        ))}
      </GridList>
      <p aria-live="polite" className="sr-only">
        {pengumuman}
      </p>
    </div>
  )
}
