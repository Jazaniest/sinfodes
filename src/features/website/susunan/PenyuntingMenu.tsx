import { ArrowDown, ArrowUp, MinusCircle, PlusCircle, Trash } from '@phosphor-icons/react'
import { useState } from 'react'
import { HALAMAN_WAJIB, LABEL_HALAMAN_SISTEM, type ItemMenu, type Susunan } from '@/domain/website/susunan'
import { Saklar } from '@/ui/isian/Saklar'
import { Tombol } from '@/ui/tombol/Tombol'
import { useDrafSitus } from '../tampilan/useDrafSitus'
import { aturMenuHalaman, aturTampilMenu, hapusTautan, MAKS_TAUTAN, pindahMenu, tambahTautan } from './aksi-susunan'
import { DialogTautan } from './DialogTautan'

const LABEL_AKSI = { naik: 'Naik', turun: 'Turun', keluarkan: 'Keluarkan dari menu', masukkan: 'Masukkan ke menu', hapus: 'Hapus' } as const

function AksiBaris({ nama, aksi, onTekan, mati }: { nama: string; aksi: keyof typeof LABEL_AKSI; onTekan: () => void; mati?: boolean }) {
  return (
    <Tombol ukuran="kecil" isDisabled={mati} onPress={onTekan} className="px-2">
      {aksi === 'naik' && <ArrowUp aria-hidden size={12} />}
      {aksi === 'turun' && <ArrowDown aria-hidden size={12} />}
      {aksi === 'keluarkan' && <MinusCircle aria-hidden size={12} />}
      {aksi === 'masukkan' && <PlusCircle aria-hidden size={12} />}
      {aksi === 'hapus' && <Trash aria-hidden size={12} />}
      <span className="sr-only">
        {LABEL_AKSI[aksi]}: {nama}
      </span>
    </Tombol>
  )
}

/** Penyunting Menu website (keputusan 10): urutan, Tampil, keluarkan/masukkan halaman, dan tautan luar. */
export function PenyuntingMenu() {
  const { isi, ubah } = useDrafSitus()
  const [dialogTautan, setDialogTautan] = useState(false)
  if (!isi) return null

  const { menu, halaman } = isi.susunan
  const ubahSusunan = (f: (s: Susunan) => Susunan) => ubah((i) => ({ ...i, susunan: f(i.susunan) }))
  const labelItem = (item: ItemMenu): string => {
    if (item.jenis === 'sistem') return LABEL_HALAMAN_SISTEM[item.kunci]
    if (item.jenis === 'halaman') return halaman.find((h) => h.id === item.halamanId)?.judul ?? 'Halaman'
    return item.label
  }
  const dalamMenu = new Set(menu.flatMap((m) => (m.jenis === 'halaman' ? [m.halamanId] : [])))
  const belumDiMenu = halaman.filter((h) => !dalamMenu.has(h.id))
  const jumlahTautan = menu.filter((m) => m.jenis === 'tautan').length

  return (
    <section aria-label="Menu website" className="flex flex-col gap-3 rounded-2 border border-garis p-4">
      <p className="text-label font-medium text-tinta-2 uppercase">Menu website</p>
      <ul className="flex flex-col gap-2">
        {menu.map((item, i) => (
          <li key={`${item.jenis}-${i}`} className="flex flex-wrap items-center gap-2 rounded-1 border border-garis bg-lembar px-3 py-2">
            <span className="min-w-0 flex-1 font-medium">
              {labelItem(item)}
              {item.jenis === 'tautan' && <span className="text-tinta-2"> (tautan luar)</span>}
            </span>
            {item.jenis === 'sistem' && (
              <>
                <Saklar
                  isSelected={item.tampil}
                  isDisabled={(HALAMAN_WAJIB as readonly string[]).includes(item.kunci)}
                  onChange={(v) => ubahSusunan((s) => aturTampilMenu(s, item.kunci, v))}
                >
                  Tampil<span className="sr-only">: {labelItem(item)}</span>
                </Saklar>
                {(HALAMAN_WAJIB as readonly string[]).includes(item.kunci) && (
                  <span className="text-teks-kecil text-tinta-2">Wajib ada</span>
                )}
              </>
            )}
            {item.jenis === 'halaman' && (
              <AksiBaris nama={labelItem(item)} aksi="keluarkan" onTekan={() => ubahSusunan((s) => aturMenuHalaman(s, item.halamanId, false))} />
            )}
            {item.jenis === 'tautan' && (
              <AksiBaris nama={labelItem(item)} aksi="hapus" onTekan={() => ubahSusunan((s) => hapusTautan(s, i))} />
            )}
            <AksiBaris nama={labelItem(item)} aksi="naik" mati={i === 0} onTekan={() => ubahSusunan((s) => pindahMenu(s, i, i - 1))} />
            <AksiBaris nama={labelItem(item)} aksi="turun" mati={i === menu.length - 1} onTekan={() => ubahSusunan((s) => pindahMenu(s, i, i + 1))} />
          </li>
        ))}
      </ul>

      {belumDiMenu.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-teks-kecil text-tinta-2">Halaman yang belum di menu</p>
          <ul className="flex flex-col gap-2">
            {belumDiMenu.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 rounded-1 border border-garis px-3 py-2">
                <span className="min-w-0 flex-1">{h.judul}</span>
                <AksiBaris nama={h.judul} aksi="masukkan" onTekan={() => ubahSusunan((s) => aturMenuHalaman(s, h.id, true))} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <Tombol ukuran="kecil" isDisabled={jumlahTautan >= MAKS_TAUTAN} onPress={() => setDialogTautan(true)}>
          Tambah tautan luar
        </Tombol>
        {jumlahTautan >= MAKS_TAUTAN && <p className="mt-1 text-teks-kecil text-tinta-2">Paling banyak {MAKS_TAUTAN} tautan luar.</p>}
      </div>

      <DialogTautan
        isOpen={dialogTautan}
        onOpenChange={setDialogTautan}
        onTambah={(label, url) => {
          const hasil = tambahTautan(isi.susunan, label, url)
          if ('galat' in hasil) return hasil.galat
          ubahSusunan(() => hasil)
          return null
        }}
      />
    </section>
  )
}
