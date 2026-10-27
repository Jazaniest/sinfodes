import { createFileRoute } from '@tanstack/react-router'
import { HalamanCetakTagihanKonsol } from '@/features/konsol/tagihan/HalamanCetak'

export const Route = createFileRoute('/konsol/_konsol/tagihan/$id_/tagihan')({ component: HalamanCetakTagihanKonsol })
