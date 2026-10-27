import { createFileRoute } from '@tanstack/react-router'
import { HalamanDetailKabupaten } from '@/features/konsol/kabupaten/HalamanKabupatenKonsol'

export const Route = createFileRoute('/konsol/_konsol/kabupaten/$kode')({ component: HalamanDetailKabupaten })
