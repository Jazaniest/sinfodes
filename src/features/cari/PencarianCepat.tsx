import { MagnifyingGlass } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useRef, useState, type KeyboardEvent } from 'react'
import {
  Autocomplete, Dialog, Header, Input, Menu, MenuItem, MenuSection, Modal, ModalOverlay, SearchField, Text,
} from 'react-aria-components'
import { opsiCari } from '@/api/cari'
import { cocokNama, kataAngka, kataCukup } from '@/domain/penduduk/cari'
import { kelompokkanNik } from '@/domain/penduduk/nik'
import type { Kemampuan } from '@/domain/pengguna/hak-akses'
import { LABEL_STATUS } from '@/domain/surat/permohonan'
import { useTunda } from '@/ui/hooks/useTunda'
import { HALAMAN_CARI } from './halaman'

type Props = { isOpen: boolean; onOpenChange: (buka: boolean) => void; boleh: (kemampuan: Kemampuan) => boolean }

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

/** Pencarian cepat Ctrl+K (SPEC §5.4): penduduk, keluarga, surat (nomor), permohonan (nama pemohon), dan halaman. */
export function PencarianCepat({ isOpen, onOpenChange, boleh }: Props) {
  const [kata, setKata] = useState('')
  const kataTunda = useTunda(kata.trim(), 250)
  const bolehCari = boleh('penduduk.lihat') && kataCukup(kataTunda)
  const hasil = useQuery({ ...opsiCari(kataTunda), enabled: isOpen && bolehCari })
  const halaman = HALAMAN_CARI.filter(
    (h) => (h.kemampuan === null || boleh(h.kemampuan)) && (kata.trim() === '' || cocokNama(h.label, kata)),
  )
  const penduduk = bolehCari ? (hasil.data?.penduduk ?? []) : []
  const keluarga = bolehCari ? (hasil.data?.keluarga ?? []) : []
  const surat = bolehCari ? (hasil.data?.surat ?? []) : []
  // Nomor KK yang diketik lengkap: yang dicari KK-nya, bukan anggotanya, jadi Keluarga tampil lebih dulu.
  const angka = kataAngka(kataTunda)
  const kkDulu = angka !== null && keluarga.some((k) => k.nomorKk === angka)
  const menuRef = useRef<HTMLDivElement>(null)
  const ubahBuka = (buka: boolean) => {
    if (!buka) setKata('')
    onOpenChange(buka)
  }
  // React Aria sengaja tidak memfokuskan hasil saat teks ditempel (demi pembaca layar). Padahal NIK dan nomor KK
  // sering ditempel; Enter tanpa hasil terfokus tetap membuka hasil pertama.
  const enterTanpaFokus = (e: KeyboardEvent) => {
    const menu = menuRef.current
    if (e.key !== 'Enter' || !menu || menu.querySelector('[data-focused]')) return
    menu.querySelector<HTMLElement>('[role="menuitem"]')?.click()
  }
  const teksKosong =
    kata.trim() === ''
      ? 'Ketik nama, NIK (minimal 4 angka), nomor KK, nomor surat, atau nama halaman.'
      : hasil.isFetching
        ? 'Mencari…'
        : 'Tidak ada yang cocok.'
  const bagianKeluarga = keluarga.length > 0 && (
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
  )

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
            <SearchField aria-label="Cari penduduk, nomor KK, surat, atau halaman" autoFocus className="flex items-center gap-2 border-b border-garis px-4">
              <MagnifyingGlass aria-hidden size={16} className="text-tinta-2" />
              <Input
                onKeyDown={enterTanpaFokus}
                placeholder="Cari nama, NIK, nomor KK, nomor surat, atau halaman…"
                className="h-12 flex-1 bg-transparent text-teks-isian outline-none [&::-webkit-search-cancel-button]:hidden"
              />
            </SearchField>
            <Menu
              ref={menuRef}
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
              {kkDulu && bagianKeluarga}
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
              {!kkDulu && bagianKeluarga}
              {surat.length > 0 && (
                <MenuSection>
                  <Header className={kelasKepala}>Surat</Header>
                  {surat.map((s) => (
                    <ItemHasil
                      key={s.id}
                      id={`surat:${s.id}`}
                      href={`/admin/surat/${s.id}`}
                      judul={`${s.jenisNama} · ${s.pemohon}`}
                      keterangan={`${s.nomor ?? 'Belum bernomor'} · ${LABEL_STATUS[s.status]}`}
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
