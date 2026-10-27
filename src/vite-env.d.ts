/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO: 'true' | 'false'
  readonly VITE_API_BASE: string
  readonly VITE_DOMAIN_INDUK?: string
}
