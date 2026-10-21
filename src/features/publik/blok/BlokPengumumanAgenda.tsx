import { BULAN_PENDEK, formatTanggal } from '@/domain/format/tanggal'
import type { BlokTampil } from '@/domain/publik/schema'
import { teksJamAgenda } from '@/domain/website/schema'
import { Rubrik } from '@/ui/website/Rubrik'
import { WadahBlok } from './RenderSusunan'

type Props = { blok: Extract<BlokTampil, { jenis: 'pengumuman-agenda' }> }

/** Pengumuman dan agenda (SPEC-V0.2 11.4): `bertumpuk` seperti kolom sempit Warta v0.1, `berdampingan` dua kolom. */
export function BlokPengumumanAgenda({ blok }: Props) {
  const { pengumuman, agenda } = blok.data
  return (
    <WadahBlok blok={blok}>
      <div className={blok.varian === 'berdampingan' ? 'grid gap-[var(--desa-jarak,2.5rem)] sm:grid-cols-2' : 'flex flex-col gap-[var(--desa-jarak,2.5rem)]'}>
        <Rubrik id={`${blok.id}-pengumuman`} judul="Pengumuman" bagian="blok-pengumuman">
          {pengumuman.length === 0 ? (
            <p className="text-tinta-2">Tidak ada pengumuman yang sedang berlaku.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {pengumuman.map((p) => (
                <li key={p.id} className="border-l-2 border-biru pl-3">
                  <p className="font-medium">{p.judul}</p>
                  <p className="text-teks-kecil text-tinta-2">{p.isi}</p>
                  <p className="mt-1 text-teks-kecil text-tinta-2">Berlaku sampai {formatTanggal(p.sampai, 'pendek')}</p>
                </li>
              ))}
            </ul>
          )}
        </Rubrik>
        <Rubrik id={`${blok.id}-agenda`} judul="Agenda" bagian="blok-agenda">
          {agenda.length === 0 ? (
            <p className="text-tinta-2">Belum ada agenda dalam waktu dekat.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {agenda.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <time dateTime={a.tanggal} className="flex w-12 shrink-0 flex-col items-center rounded-1 border border-garis bg-lembar py-1">
                    <span className="font-serif text-judul-bagian font-medium">{Number(a.tanggal.slice(8))}</span>
                    <span className="text-label text-tinta-2 uppercase">{BULAN_PENDEK[Number(a.tanggal.slice(5, 7)) - 1]}</span>
                  </time>
                  <div className="min-w-0">
                    <p className="font-medium">{a.judul}</p>
                    <p className="text-teks-kecil text-tinta-2">
                      {formatTanggal(a.tanggal, 'hari')} · {teksJamAgenda(a)} · {a.tempat}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Rubrik>
      </div>
    </WadahBlok>
  )
}
