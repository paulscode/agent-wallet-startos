import { randomBytes } from 'crypto'

// Secret generators matching what start.sh produces natively.

// SECRET_KEY: 64 hex chars (32 bytes). The app requires >= 32 chars.
export const hexKey = (): string => randomBytes(32).toString('hex')

// URL-safe token for passwords / DASHBOARD_TOKEN / BOLT12_GATEWAY_TOKEN.
// 32 bytes -> 43 url-safe chars (>= the app's 32-char / 8-distinct minimums and
// safe to embed in a connection-string password).
export const urlsafe = (bytes = 32): string =>
  randomBytes(bytes).toString('base64url')

// A Fernet key: url-safe base64 of 32 bytes, WITH padding (44 chars) — the form
// `cryptography.fernet.Fernet.generate_key()` emits and the app validates.
export const fernetKey = (): string =>
  randomBytes(32).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
