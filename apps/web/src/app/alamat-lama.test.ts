import { expect, it } from 'vitest'
import { alihAlamatLama } from './alamat-lama'

it.each([
  [['/desa/sungai-sialang/verifikasi', '?kode=SS-7K3M-Q9TD', ''], { tujuan: { jenis: 'desa', label: 'sungai-sialang' }, jalur: '/verifikasi?kode=SS-7K3M-Q9TD' }],
  [['/desa/sungai-sialang', '', '#kabar'], { tujuan: { jenis: 'desa', label: 'sungai-sialang' }, jalur: '/#kabar' }],
  [['/konsol/desa/desa_x', '?tab=langganan', ''], { tujuan: { jenis: 'konsol' }, jalur: '/desa/desa_x?tab=langganan' }],
  [['/konsol', '', ''], { tujuan: { jenis: 'konsol' }, jalur: '/' }],
  [['/desa/', '', ''], null],
  [['/desa/Bad_Label', '', ''], null],
  [['/admin/surat', '', ''], null],
  [['/kabarku', '', ''], null],
  [['/konsolidasi', '', ''], null],
])('alamat v0.1 %j (SPEC-V0.2 §4.4)', ([pathname, search, hash], hasil) =>
  expect(alihAlamatLama({ pathname, search, hash })).toEqual(hasil))
