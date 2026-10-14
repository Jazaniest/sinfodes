import { LABEL_PERAN, type Peran } from '@/domain/pengguna/schema'

export type AkunDemo = { id: string; nama: string; peran: Peran; email: string }

type Props = {
  akun: readonly AkunDemo[]
  aktifId: string | null
  /** Akun yang sedang masuk di luar `akun` (mis. akun desa baru); tampil sebagai pilihan terpilih. */
  lain?: { id: string; label: string } | null
  sibuk: boolean
  onPilih: (akun: AkunDemo) => void
}

/** Pilihan peran di toolbar demo (SPEC §3.6). Hanya muncul saat berada di panel admin. */
export function PilihPeranDemo({ akun, aktifId, lain = null, sibuk, onPilih }: Props) {
  return (
    <span className="flex items-center gap-2">
      <label htmlFor="demo-peran" className="max-sm:sr-only">
        Peran
      </label>
      <select
        id="demo-peran"
        value={aktifId ?? ''}
        disabled={sibuk}
        onChange={(e) => {
          const pilihan = akun.find((a) => a.id === e.target.value)
          if (pilihan) onPilih(pilihan)
        }}
        className="max-w-44 bg-transparent py-1.5 text-kapur disabled:opacity-60 [&>option]:text-tinta"
      >
        {aktifId === null && !lain && <option value="">Pilih peran…</option>}
        {lain && <option value={lain.id}>{lain.label}</option>}
        {akun.map((a) => (
          <option key={a.id} value={a.id}>
            {LABEL_PERAN[a.peran]} · {a.nama}
          </option>
        ))}
      </select>
    </span>
  )
}
