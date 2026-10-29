import { awalPeriode } from '@sinfodes/kontrak/surat/waktu'
import type { Db } from '../../basisdata/klien'
import { bacaPemakaianJenis } from '../permohonan/repositori'

/** `jumlah`: permohonan 12 bulan terakhir per jenis. `dipakai`: jenis yang pernah dipakai permohonan mana pun, kapan pun. */
export type Pemakaian = { jumlah: ReadonlyMap<string, number>; dipakai: ReadonlySet<string> }

/**
 * Pemakaian jenis surat oleh permohonan (rencana 8F1 Ruling 7, diisi 8F2a). "12 bulan terakhir" = 365 hari menurut WIB,
 * sama dengan tiruan. `dipakai` menentukan apakah jenis boleh dihapus; kunci asing `ON DELETE RESTRICT` menjaga yang serentak.
 */
export const pemakaianJenis = (db: Db, desaId: string, sekarang: Date): Promise<Pemakaian> => bacaPemakaianJenis(db, desaId, awalPeriode(365, sekarang))
