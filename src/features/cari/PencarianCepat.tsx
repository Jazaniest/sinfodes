import { MagnifyingGlass } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Autocomplete, Dialog, Header, Input, Menu, MenuItem, MenuSection, Modal, ModalOverlay, SearchField, Text,
} from 'react-aria-components'
import { opsiCari } from '@/api/cari'
import { cocokNama, kataCukup } from '@/domain/penduduk/cari'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import { boleh } from '@/domain/pengguna/hak-akses'
import type { Peran } from '@/domain/pengguna/schema'
import { useTunda } from '@/ui/hooks/useTunda'
import { HALAMAN_CARI } from './halaman'

type Props = { isOpen: boolean; onOpenChange: (buka: boolean) => void; peran: Peran }

const kelasKepala = 'px-5 pt-3 pb-1 text-label font-medium text-tinta-2 uppercase'

function ItemHasil({ id, href, judul, keterangan }: { id: string; href: string; judul: string; keterangan: string }) {
  return (
    <MenuItem
      id={id}
      href={href}
      textValue={judul}
      className="mx-2 flex cursor-default flex-col rounded-1 px-3 py-2 outline-none data-[focused]:bg-biru-muda"
    >
      <Text slot="label" className="font-medium">
        {judul}
      </Text>
      <Text slot="description" className="text-teks-kecil text-tinta-2">
        {keterangan}
      </Text>
    </MenuItem>
  )
}

/** Pencarian cepat Ctrl+K (SPEC §5.4). Kata dikirim lewat POST /cari; halaman disaring di layar. */
export function PencarianCepat({ isOpen, onOpenChange, peran }: Props) {
  const [kata, setKata] = useState('')
  const kataTunda = useTunda(kata.trim(), 250)
  const bolehCari = boleh(peran, 'penduduk.lihat') && kataCukup(kataTunda)
  const hasil = useQuery({ ...opsiCari(kataTunda), enabled: isOpen && bolehCari })
  const halaman = HALAMAN_CARI.filter(
    (h) => (h.kemampuan === null || boleh(peran, h.kemampuan)) && (kata.trim() === '' || cocokNama(h.label, kata)),
  )
  const penduduk = bolehCari ? (hasil.data?.penduduk ?? []) : []
  const keluarga = bolehCari ? (hasil.data?.keluarga ?? []) : []
  const ubahBuka = (buka: boolean) => {
    if (!buka) setKata('')
    onOpenChange(buka)
  }
  const teksKosong =
    kata.trim() === ''
      ? 'Ketik nama, NIK (minimal 4 angka), nomor KK, atau nama halaman.'
      : hasil.isFetching
        ? 'Mencari…'
        : 'Tidak ada yang cocok.'

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={ubahBuka}
      isDismissable
      className="fixed inset-0 z-50 flex items-start justify-center bg-tinta/30 px-4 pt-[12vh]"
    >
      <Modal className="w-full max-w-xl rounded-2 border border-garis bg-lembar shadow-melayang outline-none">
        <Dialog aria-label="Pencarian cepat" className="outline-none">
          <Autocomplete inputValue={kata} onInputChange={setKata}>
            <SearchField aria-label="Cari penduduk, nomor KK, atau halaman" autoFocus className="flex items-center gap-2 border-b border-garis px-4">
              <MagnifyingGlass aria-hidden size={16} className="text-tinta-2" />
              <Input
                placeholder="Cari nama, NIK, nomor KK, atau halaman…"
                className="h-12 flex-1 bg-transparent text-teks-isian outline-none [&::-webkit-search-cancel-button]:hidden"
              />
            </SearchField>
            <Menu
              aria-label="Hasil pencarian"
              onAction={() => ubahBuka(false)}
              renderEmptyState={() => <p className="px-5 py-6 text-tinta-2">{teksKosong}</p>}
              className="max-h-[60vh] overflow-y-auto pb-2 outline-none"
            >
              {halaman.length > 0 && (
                <MenuSection>
                  <Header className={kelasKepala}>Halaman</Header>
                  {halaman.map((h) => (
                    <ItemHasil key={h.href} id={`halaman:${h.href}`} href={h.href} judul={h.label} keterangan={h.keterangan} />
                  ))}
                </MenuSection>
              )}
              {penduduk.length > 0 && (
                <MenuSection>
                  <Header className={kelasKepala}>Penduduk</Header>
                  {penduduk.map((p) => (
                    <ItemHasil
                      key={p.id}
                      id={`penduduk:${p.id}`}
                      href={`/admin/kependudukan/penduduk/${p.id}`}
                      judul={p.nama}
                      keterangan={[p.nik ? kelompokkanNik(p.nik) : 'Belum ada NIK', p.statusDasar === 'Hidup' ? null : p.statusDasar]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  ))}
                </MenuSection>
              )}
              {keluarga.length > 0 && (
                <MenuSection>
                  <Header className={kelasKepala}>Keluarga</Header>
                  {keluarga.map((k) => (
                    <ItemHasil
                      key={k.id}
                      id={`keluarga:${k.id}`}
                      href={`/admin/kependudukan/keluarga/${k.id}`}
                      judul={`KK ${k.namaKepala}`}
                      keterangan={kelompokkanNik(k.nomorKk)}
                    />
                  ))}
                </MenuSection>
              )}
            </Menu>
          </Autocomplete>
          <p className="border-t border-garis px-5 py-2 text-teks-kecil text-tinta-2">↑↓ memilih · Enter membuka · Esc menutup</p>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
