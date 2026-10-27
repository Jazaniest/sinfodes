import { Funnel, X } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { AGAMA, PEKERJAAN, PENDIDIKAN, STATUS_DASAR, STATUS_PERKAWINAN } from '@/domain/penduduk/enum'
import {
  LABEL_PRESET, PRESET_PENDUDUK, URUTAN_PENDUDUK, type FilterPenduduk as Filter, type UrutanPenduduk,
} from '@/domain/penduduk/filter'
import { namaDusun } from '@/domain/wilayah/alamat'
import type { Desa, Dusun } from '@/domain/wilayah/schema'
import { ChipFilter } from '@/ui/data/ChipFilter'
import { SearchField } from '@/ui/isian/SearchField'
import { Select, type OpsiPilihan } from '@/ui/isian/Select'
import { TextField } from '@/ui/isian/TextField'
import { PopoverTombol } from '@/ui/lapisan/Popover'
import { Tombol } from '@/ui/tombol/Tombol'
import { daftarFilterAktif, HAPUS_SEMUA_FILTER } from './filter-url'

const SEMUA = 'semua'
const LABEL_URUT: Readonly<Record<UrutanPenduduk, string>> = {
  nama: 'Nama (A-Z)',
  umur: 'Umur (termuda dulu)',
  dusun: 'Dusun dan RT',
  diubah: 'Terakhir diubah',
}
const opsi = (daftar: readonly string[], labelSemua: string): OpsiPilihan[] => [
  { id: SEMUA, label: labelSemua },
  ...daftar.map((x) => ({ id: x, label: x })),
]

type Istilah = Desa['istilahWilayah']

type Props = {
  filter: Filter
  onUbah: (ubah: Partial<Filter>) => void
  kata: string
  onKata: (kata: string) => void
  dusun: readonly Dusun[]
  istilah: Istilah
  /** Kepala Dusun hanya melihat dusunnya: pilihan dusun disembunyikan. */
  tampilkanDusun: boolean
  aturKolom: ReactNode
}

/** Bilah filter daftar penduduk (SPEC §6.2). Kata cari tidak masuk filter URL. */
export function FilterPenduduk({ filter, onUbah, kata, onKata, dusun, istilah, tampilkanDusun, aturKolom }: Props) {
  const aktif = daftarFilterAktif(filter, dusun, istilah).filter((c) => c.kunci !== 'preset')
  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-end gap-3">
        <SearchField label="Cari penduduk" placeholder="Nama, NIK, atau nomor KK" value={kata} onChange={onKata} className="w-full sm:w-72" />
        {tampilkanDusun && (
          <Select
            label={istilah.dusun}
            pilihan={[
              { id: SEMUA, label: `Semua ${istilah.dusun.toLowerCase()}` },
              ...dusun.map((d) => ({ id: String(d.nomor), label: namaDusun(d, istilah) })),
            ]}
            nilai={filter.dusun === undefined ? SEMUA : String(filter.dusun)}
            onUbah={(id) => onUbah({ dusun: id && id !== SEMUA ? Number(id) : undefined, rt: undefined, page: 1 })}
            className="w-56"
          />
        )}
        <Select
          label="Jenis kelamin"
          pilihan={[{ id: SEMUA, label: 'Semua' }, { id: 'L', label: 'Laki-laki' }, { id: 'P', label: 'Perempuan' }]}
          nilai={filter.jk ?? SEMUA}
          onUbah={(id) => onUbah({ jk: id === 'L' || id === 'P' ? id : undefined, page: 1 })}
          className="w-40"
        />
        <Select
          label="Urutkan"
          pilihan={URUTAN_PENDUDUK.map((u) => ({ id: u, label: LABEL_URUT[u] }))}
          nilai={filter.urut}
          onUbah={(id) => {
            const urut = URUTAN_PENDUDUK.find((u) => u === id)
            if (urut) onUbah({ urut, page: 1 })
          }}
          className="w-52"
        />
        <PopoverTombol label="Filter lainnya" judul="Filter lainnya" ikon={<Funnel aria-hidden size={16} />} lebar="w-80">
          {(tutup) => (
            <FilterLainnya
              filter={filter}
              dusun={dusun}
              istilah={istilah}
              onTerapkan={(ubah) => {
                onUbah({ ...ubah, page: 1 })
                tutup()
              }}
            />
          )}
        </PopoverTombol>
        {aturKolom}
      </div>
      <ChipFilter
        label="Filter siap pakai"
        pilihan={[{ id: SEMUA, label: 'Semua' }, ...PRESET_PENDUDUK.map((p) => ({ id: p, label: LABEL_PRESET[p] }))]}
        nilai={filter.preset ?? SEMUA}
        onUbah={(id) => onUbah({ preset: PRESET_PENDUDUK.find((p) => p === id), page: 1 })}
      />
      {aktif.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-teks-kecil">
          <span className="text-tinta-2">Filter aktif:</span>
          {aktif.map((c) => (
            <Tombol key={c.kunci} ukuran="kecil" aria-label={`Hapus filter ${c.label}`} ikon={<X aria-hidden size={12} />} onPress={() => onUbah(c.hapus)}>
              {c.label}
            </Tombol>
          ))}
          <Tombol varian="teks" onPress={() => onUbah(HAPUS_SEMUA_FILTER)}>
            Hapus filter
          </Tombol>
        </div>
      )}
    </div>
  )
}

type PropsLainnya = { filter: Filter; dusun: readonly Dusun[]; istilah: Istilah; onTerapkan: (ubah: Partial<Filter>) => void }

/** Isi "Filter lainnya": diterapkan sekaligus lewat tombol Terapkan, bukan per ketukan. */
function FilterLainnya({ filter, dusun, istilah, onTerapkan }: PropsLainnya) {
  const [rt, setRt] = useState<string>(filter.rt ?? SEMUA)
  const [umurMin, setUmurMin] = useState(filter.umurMin?.toString() ?? '')
  const [umurMax, setUmurMax] = useState(filter.umurMax?.toString() ?? '')
  const [agama, setAgama] = useState<string>(filter.agama ?? SEMUA)
  const [pendidikan, setPendidikan] = useState<string>(filter.pendidikan ?? SEMUA)
  const [pekerjaan, setPekerjaan] = useState<string>(filter.pekerjaan ?? SEMUA)
  const [kawin, setKawin] = useState<string>(filter.kawin ?? SEMUA)
  const [status, setStatus] = useState<string>(filter.status)
  const [galatUmur, setGalatUmur] = useState<string | undefined>()

  const daftarRt = (filter.dusun === undefined ? dusun : dusun.filter((d) => d.nomor === filter.dusun)).flatMap((d) =>
    d.rw.flatMap((w) => w.rt.map((t) => t.nomor)),
  )
  const bacaUmur = (teks: string) => (teks.trim() === '' ? undefined : Number(teks))
  const umurSah = (n?: number) => n === undefined || (Number.isInteger(n) && n >= 0 && n <= 150)

  const terapkan = () => {
    const min = bacaUmur(umurMin)
    const max = bacaUmur(umurMax)
    if (!umurSah(min) || !umurSah(max)) {
      setGalatUmur('Umur harus angka bulat 0-150.')
      return
    }
    if (min !== undefined && max !== undefined && min > max) {
      setGalatUmur('Umur "dari" tidak boleh lebih besar dari umur "sampai".')
      return
    }
    onTerapkan({
      rt: rt === SEMUA ? undefined : rt,
      umurMin: min,
      umurMax: max,
      agama: AGAMA.find((x) => x === agama),
      pendidikan: PENDIDIKAN.find((x) => x === pendidikan),
      pekerjaan: PEKERJAAN.find((x) => x === pekerjaan),
      kawin: STATUS_PERKAWINAN.find((x) => x === kawin),
      status: STATUS_DASAR.find((x) => x === status) ?? 'Hidup',
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Select label={istilah.rt} pilihan={opsi(daftarRt, `Semua ${istilah.rt}`)} nilai={rt} onUbah={(id) => setRt(id ?? SEMUA)} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Umur dari" inputMode="numeric" value={umurMin} onChange={setUmurMin} />
        <TextField label="Umur sampai" inputMode="numeric" value={umurMax} onChange={setUmurMax} />
      </div>
      {galatUmur && (
        <p role="alert" className="text-teks-kecil text-merah">
          {galatUmur}
        </p>
      )}
      <Select label="Agama" pilihan={opsi(AGAMA, 'Semua agama')} nilai={agama} onUbah={(id) => setAgama(id ?? SEMUA)} />
      <Select label="Pendidikan" pilihan={opsi(PENDIDIKAN, 'Semua pendidikan')} nilai={pendidikan} onUbah={(id) => setPendidikan(id ?? SEMUA)} />
      <Select label="Pekerjaan" pilihan={opsi(PEKERJAAN, 'Semua pekerjaan')} nilai={pekerjaan} onUbah={(id) => setPekerjaan(id ?? SEMUA)} />
      <Select label="Status perkawinan" pilihan={opsi(STATUS_PERKAWINAN, 'Semua status')} nilai={kawin} onUbah={(id) => setKawin(id ?? SEMUA)} />
      <Select
        label="Status"
        pilihan={STATUS_DASAR.map((s) => ({ id: s, label: s }))}
        nilai={status}
        onUbah={(id) => setStatus(id ?? 'Hidup')}
        keterangan="Bawaan: Hidup. Pilih Meninggal atau Pindah untuk melihat mantan penduduk."
      />
      <div className="flex justify-end pt-1">
        <Tombol varian="utama" ukuran="kecil" onPress={terapkan}>
          Terapkan
        </Tombol>
      </div>
    </div>
  )
}
