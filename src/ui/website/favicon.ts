/** Inisial desa untuk monogram: huruf pertama dua kata pertama, atau dua huruf pertama bila satu kata. */
function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter((k) => /\p{L}/u.test(k))
  if (kata.length === 0) return 'SD'
  const huruf = kata.length > 1 ? kata[0][0] + kata[1][0] : kata[0].slice(0, 2)
  return huruf.toUpperCase()
}

/** Favicon monogram SVG (data URL) dari inisial desa. */
export function monogramFavicon(nama: string, warna = '#1F4E79'): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="${warna}"/>` +
    `<text x="32" y="43" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="28" fill="#FFFFFF">${inisial(nama)}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Memasang favicon desa ke `link[rel=icon]`: lambang desa bila ada, kalau tidak monogram. Mengembalikan fungsi yang
 * memulihkan favicon semula (atau menghapus link yang dibuat di sini).
 */
export function pasangFavicon(href: string | null, nama: string, warna?: string): () => void {
  const ada = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')
  const link = ada ?? document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }))
  const semula = { href: link.getAttribute('href'), type: link.getAttribute('type') }
  link.setAttribute('href', href ?? monogramFavicon(nama, warna))
  link.removeAttribute('type')
  return () => {
    if (!ada) {
      link.remove()
      return
    }
    if (semula.href === null) link.removeAttribute('href')
    else link.setAttribute('href', semula.href)
    if (semula.type === null) link.removeAttribute('type')
    else link.setAttribute('type', semula.type)
  }
}
