import { createFileRoute } from '@tanstack/react-router'
import { HalamanPengaduanBaru } from '@/features/warga/pengaduan/HalamanPengaduanBaru'

export const Route = createFileRoute('/warga/_app/pengaduan/baru')({ component: HalamanPengaduanBaru })
