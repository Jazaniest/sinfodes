/** Empat tab Detail desa (SPEC §11); bawaannya Ringkasan. */
export const TAB_DETAIL_DESA = ['ringkasan', 'persiapan', 'keaktifan', 'langganan'] as const
export type TabDetailDesa = (typeof TAB_DETAIL_DESA)[number]

export const LABEL_TAB_DETAIL_DESA: Readonly<Record<TabDetailDesa, string>> = {
  ringkasan: 'Ringkasan',
  persiapan: 'Persiapan',
  keaktifan: 'Keaktifan',
  langganan: 'Langganan',
}
