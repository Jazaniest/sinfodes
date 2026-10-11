import { createFileRoute } from '@tanstack/react-router'
import { HalamanDaftarJenis } from '@/features/surat/jenis/HalamanDaftarJenis'

export const Route = createFileRoute('/admin/_panel/surat/jenis/')({ component: HalamanDaftarJenis })
