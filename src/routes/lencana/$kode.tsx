import { createFileRoute } from '@tanstack/react-router'
import { RuteBuktiLencana } from '@/features/induk/RuteBuktiLencana'

/** `/lencana/:kode` di alamat induk: bukti lencana juara (SPEC-V0.2 §9.6). */
export const Route = createFileRoute('/lencana/$kode')({ component: RuteBuktiLencana })
