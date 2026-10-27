/** Kunci kiriman baru (fokus review 1). Dibuat sekali per formulir, dan diganti sesudah kiriman berhasil. */
export const kunciKirimBaru = (): string => crypto.randomUUID()
