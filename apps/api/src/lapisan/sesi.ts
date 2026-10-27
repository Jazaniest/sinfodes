import type { MiddlewareHandler } from 'hono'
import type { Konfigurasi } from '../konfigurasi'
import { bentukTokenSah, hashToken } from '../kripto/token'
import { cariSesiMenurutHash, geserAktif, JEDA_PERBARUI_MS, penggunaSesiDari, sesiBerlaku } from '../sesi/repositori'
import { bacaKukiPanel } from '../sesi/toples'
import type { Waktu } from '../waktu'
import type { LingkunganApp } from './konteks'

/**
 * Cookie menjadi pelaku (SPEC-V0.3 §6.2, §8.1). Dicari lewat hash token di dalam transaksi ber-konteks desa alamat, jadi
 * cookie desa A di alamat desa B tidak menemukan apa pun (RLS) dan tidak pula lolos pemeriksaan kode. Cookie tidak sah,
 * habis, atau dicabut membuat pelaku `null` tanpa membedakan sebabnya; rute yang butuh pelaku menjawab 401.
 */
export function lapisanSesi(deps: { cookieAwalan: Konfigurasi['cookieAwalan']; waktu: Waktu }): MiddlewareHandler<LingkunganApp> {
  return async (c, next) => {
    c.set('pelaku', null)
    const db = c.get('dbTransaksi')
    const desa = c.get('alamat').desa
    const token = bacaKukiPanel(c, deps.cookieAwalan)
    if (db && desa && token && bentukTokenSah(token)) {
      const ketemu = await cariSesiMenurutHash(db, hashToken(token))
      const sekarang = deps.waktu()
      if (ketemu && sesiBerlaku(ketemu, desa.desa.id, sekarang)) {
        const pengguna = penggunaSesiDari(ketemu.pengguna)
        if (pengguna) {
          c.set('pelaku', { ...pengguna, sesiId: ketemu.sesi.id })
          if (sekarang.getTime() - ketemu.sesi.terakhirAktif.getTime() > JEDA_PERBARUI_MS) await geserAktif(db, ketemu.sesi.id, sekarang)
        }
      }
    }
    await next()
  }
}
