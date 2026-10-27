import { tautanWhatsapp } from '@/domain/format/whatsapp'
import { formatWhatsapp } from '@/domain/warga/akun'
import { Tautan } from '@/ui/navigasi/Tautan'
import { Rubrik } from '@/ui/website/Rubrik'
import { usePublik } from '../publik-konteks'

/**
 * Profil singkat desa rekaman (SPEC-V0.2 §13): dua paragraf dari templat, ditambah jam layanan dan kontak kantor desa. Dipakai
 * Beranda dan halaman Profil desa yang belum punya profil lengkap.
 */
export function ProfilSingkat({ paragraf }: { paragraf: readonly string[] }) {
  const d = usePublik()
  return (
    <Rubrik id="profil-singkat" judul="Profil singkat">
      <div className="flex max-w-[56ch] flex-col gap-4 text-baca">
        {paragraf.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        <div className="flex flex-col border-b border-garis pb-2">
          <dt className="text-teks-kecil text-tinta-2">Jam layanan</dt>
          <dd>
            {d.jamLayanan.length === 0 ? (
              'Belum diumumkan'
            ) : (
              <ul>
                {d.jamLayanan.map((j) => (
                  <li key={j.hari}>
                    {j.hari} {j.buka}-{j.tutup} WIB
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div className="flex flex-col border-b border-garis pb-2">
          <dt className="text-teks-kecil text-tinta-2">Kontak</dt>
          <dd>
            <Tautan href={tautanWhatsapp(d.telepon)} target="_blank" rel="noopener noreferrer">
              WhatsApp kantor {formatWhatsapp(d.telepon)}
            </Tautan>
          </dd>
        </div>
      </dl>
    </Rubrik>
  )
}
