import { createFileRoute } from '@tanstack/react-router'
import { HalamanDaftarKabupaten } from '@/features/konsol/kabupaten/HalamanKabupatenKonsol'

export const Route = createFileRoute('/konsol/_konsol/kabupaten/')({ component: HalamanDaftarKabupaten })
