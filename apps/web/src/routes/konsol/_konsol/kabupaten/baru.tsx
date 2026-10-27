import { createFileRoute } from '@tanstack/react-router'
import { HalamanTambahKabupaten } from '@/features/konsol/kabupaten/HalamanKabupatenKonsol'

export const Route = createFileRoute('/konsol/_konsol/kabupaten/baru')({ component: HalamanTambahKabupaten })
