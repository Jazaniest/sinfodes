import { createFileRoute } from '@tanstack/react-router'
import { HalamanAksesSinfodes } from '@/features/pengaturan/HalamanAksesSinfodes'

export const Route = createFileRoute('/admin/_panel/pengaturan/akses-sinfodes')({ component: HalamanAksesSinfodes })
