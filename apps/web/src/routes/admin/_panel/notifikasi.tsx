import { createFileRoute } from '@tanstack/react-router'
import { HalamanNotifikasi } from '@/features/notifikasi/HalamanNotifikasi'

export const Route = createFileRoute('/admin/_panel/notifikasi')({ component: HalamanNotifikasi })
