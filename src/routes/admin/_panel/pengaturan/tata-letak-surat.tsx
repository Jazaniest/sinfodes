import { createFileRoute } from '@tanstack/react-router'
import { HalamanTataLetakSurat } from '@/features/pengaturan/HalamanTataLetakSurat'

export const Route = createFileRoute('/admin/_panel/pengaturan/tata-letak-surat')({ component: HalamanTataLetakSurat })
