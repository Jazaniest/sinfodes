import { createFileRoute } from '@tanstack/react-router'
import { HalamanCetakKwitansi } from '@/features/pengaturan/HalamanCetakKwitansi'

export const Route = createFileRoute('/admin/_panel/pengaturan/langganan_/kwitansi/$id')({ component: HalamanCetakKwitansi })
