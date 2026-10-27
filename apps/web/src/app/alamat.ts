import { alamatLuar, bacaAlamat, type KonteksAlamat, type TujuanAlamat } from '@/domain/alamat/alamat'

/** Domain induk semua alamat (SPEC-V0.2 §4.5): `sinfodes.localhost` saat pengembangan, `demo.sinfodes.com` untuk demo. */
export const DOMAIN_INDUK: string = import.meta.env.VITE_DOMAIN_INDUK || 'sinfodes.localhost'

/** Konteks alamat halaman ini, dibaca dari hostname. */
export function konteksSekarang(): KonteksAlamat {
  return bacaAlamat(window.location.hostname, DOMAIN_INDUK)
}

/** URL lengkap ke alamat lain dengan protokol dan port halaman ini (semua alamat demo berbagi port). */
export function keAlamat(tujuan: TujuanAlamat, jalur = '/'): string {
  return alamatLuar(tujuan, jalur, { domainInduk: DOMAIN_INDUK, protokol: window.location.protocol, port: window.location.port })
}

/** Asal website desa, mis. `http://sungaisialang.sinfodes.localhost:5173`. */
export const asalDesa = (label: string): string => keAlamat({ jenis: 'desa', label }, '')
