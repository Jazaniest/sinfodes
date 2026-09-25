export const JENIS_KELAMIN = ['L', 'P'] as const
export type JenisKelamin = (typeof JENIS_KELAMIN)[number]
