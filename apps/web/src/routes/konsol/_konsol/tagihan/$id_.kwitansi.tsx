import { createFileRoute } from '@tanstack/react-router'
import { HalamanCetakKwitansiKonsol } from '@/features/konsol/tagihan/HalamanCetak'

export const Route = createFileRoute('/konsol/_konsol/tagihan/$id_/kwitansi')({ component: HalamanCetakKwitansiKonsol })
