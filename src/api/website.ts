import { queryOptions } from '@tanstack/react-query'
import { daftarSchema } from '@/domain/api'
import {
  agendaSchema, artikelSchema, fotoGaleriSchema, pengumumanSchema, tampilanWebsiteSchema, type UbahTampilan,
} from '@/domain/website/schema'
import { panggilApi } from './client'

const daftarArtikelSchema = daftarSchema(artikelSchema)
const daftarPengumumanSchema = daftarSchema(pengumumanSchema)
const daftarAgendaSchema = daftarSchema(agendaSchema)
const daftarGaleriSchema = daftarSchema(fotoGaleriSchema)

export const kunciWebsite = {
  semua: ['website'] as const,
  artikel: ['website', 'artikel'] as const,
  pengumuman: ['website', 'pengumuman'] as const,
  agenda: ['website', 'agenda'] as const,
  galeri: ['website', 'galeri'] as const,
  tampilan: ['website', 'tampilan'] as const,
}

export function daftarArtikel(signal?: AbortSignal) {
  return panggilApi('GET', '/website/artikel', { skema: daftarArtikelSchema, signal })
}
export const opsiArtikel = () => queryOptions({ queryKey: kunciWebsite.artikel, queryFn: ({ signal }) => daftarArtikel(signal) })

export function daftarPengumuman(signal?: AbortSignal) {
  return panggilApi('GET', '/website/pengumuman', { skema: daftarPengumumanSchema, signal })
}
export const opsiPengumuman = () => queryOptions({ queryKey: kunciWebsite.pengumuman, queryFn: ({ signal }) => daftarPengumuman(signal) })

export function daftarAgenda(signal?: AbortSignal) {
  return panggilApi('GET', '/website/agenda', { skema: daftarAgendaSchema, signal })
}
export const opsiAgenda = () => queryOptions({ queryKey: kunciWebsite.agenda, queryFn: ({ signal }) => daftarAgenda(signal) })

export function daftarGaleri(signal?: AbortSignal) {
  return panggilApi('GET', '/website/galeri', { skema: daftarGaleriSchema, signal })
}
export const opsiGaleri = () => queryOptions({ queryKey: kunciWebsite.galeri, queryFn: ({ signal }) => daftarGaleri(signal) })

export function ambilTampilan(signal?: AbortSignal) {
  return panggilApi('GET', '/website/tampilan', { skema: tampilanWebsiteSchema, signal })
}
export const opsiTampilan = () => queryOptions({ queryKey: kunciWebsite.tampilan, queryFn: ({ signal }) => ambilTampilan(signal) })
export function simpanTampilan(isian: UbahTampilan) {
  return panggilApi('PUT', '/website/tampilan', { skema: tampilanWebsiteSchema, body: isian })
}
