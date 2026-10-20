import { createFileRoute } from '@tanstack/react-router'
import { HalamanDetailTagihan } from '@/features/konsol/tagihan/HalamanTagihan'

export const Route = createFileRoute('/konsol/_konsol/tagihan/$id')({ component: HalamanDetailTagihan })
