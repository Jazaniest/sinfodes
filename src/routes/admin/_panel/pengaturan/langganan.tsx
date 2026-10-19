import { createFileRoute } from '@tanstack/react-router'
import { HalamanLangganan } from '@/features/pengaturan/HalamanLangganan'

export const Route = createFileRoute('/admin/_panel/pengaturan/langganan')({ component: HalamanLangganan })
