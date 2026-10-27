import { createFileRoute } from '@tanstack/react-router'
import { HalamanCetakTagihan } from '@/features/pengaturan/HalamanCetakTagihan'

export const Route = createFileRoute('/admin/_panel/pengaturan/langganan_/tagihan/$id')({ component: HalamanCetakTagihan })
