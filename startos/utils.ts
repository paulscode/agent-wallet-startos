// Shared constants for the 0.4.x sources. Sibling StartOS services are reached
// at their `.startos` hostnames; the dashboard is fronted on `dashboardPort`.

// The FastAPI dashboard/API listens here inside the container.
export const dashboardPort = 8100

// The bundled BOLT 12 gateway's gRPC surface (loopback, never exposed).
export const bolt12GatewayPort = 50061

// LND (always a dependency) — REST API + the read mount of its data volume.
export const lndHost = 'lnd.startos'
export const lndRestPort = 8080
export const lndMountpoint = '/mnt/lnd'

// Electrum indexers (exactly one selected) — plaintext electrum protocol.
export const electrumPort = 50001
export const indexerHosts = {
  electrs: 'electrs.startos',
  fulcrum: 'fulcrum.startos',
} as const

// Mempool explorer flavors (exactly one selected) — internal API port.
export const mempoolApiPort = 8999
export const mempoolHosts = {
  mempool: 'mempool.startos',
  'mempool-rdts': 'mempool-rdts.startos',
} as const

// The separate Liquid Electrum backend (required only with the Liquid hop).
export const elementsElectrsHost = 'elements-electrs.startos'

export type Indexer = keyof typeof indexerHosts
export type MempoolFlavor = keyof typeof mempoolHosts

export const logLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'] as const
export type LogLevel = (typeof logLevels)[number]
