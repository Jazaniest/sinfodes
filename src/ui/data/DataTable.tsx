import { CaretDown, CaretUp } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Cell, Column, Row, Table, TableBody, TableHeader, type SortDescriptor } from 'react-aria-components'
import { cn } from '../cn'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { ErrorState } from '../umpan-balik/ErrorState'
import { BarisKerangka } from '../umpan-balik/Skeleton'

export type KolomTabel<T> = {
  id: string
  judul: string
  isi: (baris: T) => ReactNode
  /** Kunci urutan di API. Kolom tanpa kunci tidak bisa diurutkan. */
  urut?: string
  arahUrut?: 'ascending' | 'descending'
  rataKanan?: boolean
  lebar?: string
  /** Tidak bisa disembunyikan lewat "Atur kolom". */
  wajib?: boolean
}

type Props<T extends { id: string }> = {
  label: string
  kolom: readonly KolomTabel<T>[]
  baris: readonly T[] | undefined
  memuat: boolean
  galat: string | null
  onCobaLagi?: () => void
  kosong: ReactNode
  urutAktif?: string
  onUrut?: (urut: string) => void
  onBukaBaris?: (baris: T) => void
  /** Isi baris bertumpuk untuk layar < 640px (SPEC §5.7). */
  barisRingkas?: (baris: T) => ReactNode
  /** Kolom kepala baris (nama baris untuk pembaca layar, menempel saat digeser). Bawaan: kolom pertama. */
  kolomUtama?: string
}

const fokusBaris =
  'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-biru'

/** Tabel data bergaya buku register (SPEC §4.3, §4.4): urut, klik baris, kondisi memuat/galat/kosong. */
export function DataTable<T extends { id: string }>(props: Props<T>) {
  const { label, kolom, baris, memuat, galat, onCobaLagi, kosong, urutAktif, onUrut, onBukaBaris, barisRingkas, kolomUtama } = props
  const sempit = useMediaQuery('(max-width: 639px)')

  if (galat !== null) return <ErrorState pesan={galat} onCobaLagi={onCobaLagi} />
  if (memuat || baris === undefined) return <BarisKerangka jumlah={8} label={`Memuat ${label.toLowerCase()}…`} />
  if (baris.length === 0) return <>{kosong}</>

  if (sempit && barisRingkas) {
    return (
      <ul aria-label={label} className="divide-y divide-garis border-y border-garis bg-lembar">
        {baris.map((b) => (
          <li key={b.id}>
            {onBukaBaris ? (
              <button
                type="button"
                onClick={() => onBukaBaris(b)}
                className="block min-h-12 w-full px-3 py-3 text-left hover:bg-kertas focus-visible:-outline-offset-2"
              >
                {barisRingkas(b)}
              </button>
            ) : (
              <div className="px-3 py-3">{barisRingkas(b)}</div>
            )}
          </li>
        ))}
      </ul>
    )
  }

  const kolomUrut = kolom.find((k) => k.urut !== undefined && k.urut === urutAktif)
  const sortDescriptor: SortDescriptor | undefined = kolomUrut
    ? { column: kolomUrut.id, direction: kolomUrut.arahUrut ?? 'ascending' }
    : undefined
  const idUtama = kolomUtama ?? kolom[0]?.id

  return (
    <div className="overflow-x-auto border-y border-garis bg-lembar print:overflow-visible">
      <Table
        aria-label={label}
        sortDescriptor={sortDescriptor}
        onSortChange={(s) => {
          const k = kolom.find((x) => x.id === s.column)
          if (k?.urut) onUrut?.(k.urut)
        }}
        onRowAction={
          onBukaBaris
            ? (kunci) => {
                const b = baris.find((x) => x.id === kunci)
                if (b) onBukaBaris(b)
              }
            : undefined
        }
        className="w-full border-collapse text-teks"
      >
        <TableHeader columns={kolom}>
          {(k) => (
            <Column
              id={k.id}
              isRowHeader={k.id === idUtama}
              allowsSorting={Boolean(k.urut && onUrut)}
              className={cn(
                'border-b-[1.5px] border-tinta px-3 py-2 text-left text-label font-medium whitespace-nowrap text-tinta-2 uppercase',
                fokusBaris,
                k.rataKanan && 'text-right',
                k.lebar,
                k.id === idUtama && 'sticky left-0 z-10 bg-lembar',
              )}
            >
              {({ allowsSorting, sortDirection }) => (
                <span className="inline-flex items-center gap-1">
                  {k.judul}
                  {allowsSorting &&
                    sortDirection &&
                    (sortDirection === 'ascending' ? <CaretUp aria-hidden size={12} /> : <CaretDown aria-hidden size={12} />)}
                </span>
              )}
            </Column>
          )}
        </TableHeader>
        <TableBody items={baris} dependencies={[kolom]}>
          {(b) => (
            <Row
              id={b.id}
              columns={kolom}
              className={cn('group border-b border-garis', fokusBaris, onBukaBaris && 'cursor-pointer data-[hovered]:bg-kertas')}
            >
              {(k) => (
                <Cell
                  className={cn(
                    'px-3 py-2 align-top',
                    k.rataKanan && 'text-right tabular-nums',
                    k.id === idUtama && 'sticky left-0 bg-lembar group-data-[hovered]:bg-kertas',
                  )}
                >
                  {k.isi(b)}
                </Cell>
              )}
            </Row>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
