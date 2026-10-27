import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { BlokTampil } from '@/domain/publik/schema'
import { renderPublik } from '@/test/render'
import { BlokVideo } from './BlokVideo'

type BlokVideoTampil = Extract<BlokTampil, { jenis: 'video' }>

const blok = {
  id: 'blk_video01',
  jenis: 'video',
  varian: 'lebar',
  lebar: 'penuh',
  tersembunyi: false,
  isi: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', judul: 'Video profil desa' },
} as BlokVideoTampil

describe('BlokVideo (rencana 7F-1 Tugas 5)', () => {
  it('sebelum diklik tidak ada iframe; pratinjau i.ytimg.com dengan tombol Putar video', () => {
    const { container } = renderPublik(<BlokVideo blok={blok} />)
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })
  it('setelah tombol ditekan, iframe youtube-nocookie dimuat', async () => {
    const user = userEvent.setup()
    const { container } = renderPublik(<BlokVideo blok={blok} />)
    await user.click(container.querySelector('button') as HTMLButtonElement)
    const iframe = container.querySelector('iframe')
    expect(iframe?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1')
    expect(iframe?.getAttribute('title')).toBe('Video profil desa')
    expect(iframe?.getAttribute('allowfullscreen')).not.toBeNull()
  })
  it('alamat video yang tidak dikenali tidak dirender', () => {
    const rusak = { ...blok, isi: { url: 'https://vimeo.com/12345', judul: 'Video' } } as BlokVideoTampil
    const { container } = renderPublik(<BlokVideo blok={rusak} />)
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
  })
})
