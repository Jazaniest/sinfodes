import { galatSchema } from '@sinfodes/kontrak/api'
import { ID_SUNGAI_SIALANG } from '@sinfodes/demo/data/desa-demo'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { buatDbUji, penyandiUji, type DbUji } from '../../../test/basisdata'
import { masukLewatRute, rakitApp } from '../../../test/rakit-app'

// Pemeriksaan aplikasi "jenis sudah dipakai" dilumpuhkan: hanya kunci asing RESTRICT di basis data yang tersisa (rencana 8F2a Ruling 8).
vi.mock('./pemakaian', () => ({ pemakaianJenis: () => Promise.resolve({ jumlah: new Map(), dipakai: new Set() }) }))

const SS = 'http://sungaisialang.sinfodes.localhost'

let uji: DbUji
let app: ReturnType<typeof rakitApp>['app']
let kuki = ''
beforeAll(async () => {
  uji = await buatDbUji()
  app = rakitApp({ klien: uji.klien, penyandi: await penyandiUji(uji.sqlMigrasi) }).app
  kuki = (await masukLewatRute(app, SS, 'rosmiati@sungaisialang.desa.id', 'demo', '10.13.0.1')).kuki as string
  await uji.sqlMigrasi`insert into jenis_surat (id, desa_id, kode, nama, klasifikasi, subjek, isian, boleh_atas_nama, wajib_paraf, online, syarat, teks, aktif, asal)
    values ('js_uji_pks', ${ID_SUNGAI_SIALANG}, 'PKS', 'Jenis PKS', '470', 'pemohon', '[]'::jsonb, false, false, true, '[]'::jsonb, 'Teks', true, 'desa')`
  await uji.sqlMigrasi`insert into permohonan (id, desa_id, dusun_id, tahun, no_urut, jenis_id, kanal, pemohon_id, isian_sandi, status, masuk_pada)
    values ('srt_uji_pks', ${ID_SUNGAI_SIALANG}, 'dsn_ss_1', 2026, 9001, 'js_uji_pks', 'loket', 'pdk_siti_rahmah', 'v1.x', 'menunggu', now())`
})
afterAll(async () => {
  await uji?.tutup()
})

describe('DELETE /jenis-surat/:id bila pemeriksaan aplikasi dilewati (rencana 8F2a Tugas 7)', () => {
  it('basis data menolak 23503 dan jawabannya 409 yang sama, bukan 500; jenis dan permohonan tetap utuh', async () => {
    const r = await app.fetch(new Request(`${SS}/api/v1/jenis-surat/js_uji_pks`, { method: 'DELETE', headers: { Origin: SS, Cookie: kuki } }))
    expect(r.status).toBe(409)
    expect(galatSchema.parse(await r.json()).error.message).toBe('Jenis ini sudah pernah dipakai. Arsipkan saja.')
    expect(Number((await uji.sqlMigrasi`select count(*)::int as n from jenis_surat where id = 'js_uji_pks'`)[0].n)).toBe(1)
    expect(Number((await uji.sqlMigrasi`select count(*)::int as n from permohonan where id = 'srt_uji_pks'`)[0].n)).toBe(1)
  })
})
