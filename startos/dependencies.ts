import { T } from '@start9labs/start-sdk'
import { configJson } from './fileModels/config.json'
import { sdk } from './sdk'

// Requirements driven by the selected config: LND is always required (no
// alternative); exactly one indexer and exactly one Mempool flavor become
// required by the user's selection; the Liquid Electrum backend becomes required
// only when the experimental Liquid hop is enabled.
//
// The selected-or-not choices are optional entries whose `enabled` reads the
// config, so only the selected one is published as a requirement.
//
// Version ranges are placeholders to confirm against the versions installed on
// the target servers. Dependency health-check ids likewise must match the
// installed package's real ids; we require `running` only (plus elements-electrs'
// `index-sync`, whose id is known) to stay robust until confirmed.

const config = (effects: T.Effects) =>
  configJson
    .read((c) => ({
      indexer: c.indexer,
      mempool: c.mempool,
      liquid: c.liquid,
    }))
    .const(effects)

const indexerDescription =
  'Electrum indexer used for on-chain address and fee lookups.'

const lnd = sdk.Dependency.required('lnd', {
  description: 'The Lightning node Agent Wallet connects to and controls.',
  metadata: {
    title: 'LND',
    icon: 'https://raw.githubusercontent.com/Start9Labs/lnd-startos/master/icon.svg',
  },
  kind: 'running',
  versionRange: '>=0.18:0',
  healthChecks: [],
})

const electrs = sdk.Dependency.optional('electrs', {
  description: indexerDescription,
  metadata: {
    title: 'Electrs',
    icon: 'https://raw.githubusercontent.com/Start9-Community/electrs-startos/master/icon.svg',
  },
  kind: 'running',
  versionRange: '>=0.10:0',
  healthChecks: [],
  enabled: async ({ effects }) =>
    (await config(effects))?.indexer === 'electrs',
})

// Fulcrum is the default: anything other than an explicit Electrs choice.
const fulcrum = sdk.Dependency.optional('fulcrum', {
  description: indexerDescription,
  metadata: {
    title: 'Fulcrum',
    icon: 'https://raw.githubusercontent.com/Start9Labs/fulcrum-startos/master/icon.png',
  },
  kind: 'running',
  versionRange: '>=1.9:0',
  healthChecks: [],
  enabled: async ({ effects }) =>
    (await config(effects))?.indexer !== 'electrs',
})

// Exactly one Mempool, the one selected. The official one is the default.
const mempoolSelected = async (effects: T.Effects) =>
  (await config(effects))?.mempool ?? 'mempool'

const mempool = sdk.Dependency.optional('mempool', {
  description: 'Local Mempool explorer queried for fees and chain data.',
  metadata: {
    title: 'Mempool',
    icon: 'https://raw.githubusercontent.com/Start9Labs/mempool-startos/master/icon.svg',
  },
  kind: 'running',
  versionRange: '>=3:0',
  healthChecks: [],
  enabled: async ({ effects }) =>
    (await mempoolSelected(effects)) === 'mempool',
})

const mempoolPruned = sdk.Dependency.optional('mempool-pruned', {
  description:
    'Mempool explorer for a pruned node, queried for fees and chain data. It must follow the same chain as LND.',
  metadata: {
    title: 'Mempool Pruned',
    icon: 'https://raw.githubusercontent.com/paulscode/mempool-pruned-startos/master/icon.png',
  },
  kind: 'running',
  versionRange: '>=3:0',
  healthChecks: [],
  enabled: async ({ effects }) =>
    (await mempoolSelected(effects)) === 'mempool-pruned',
})

const mempoolRdts = sdk.Dependency.optional('mempool-rdts', {
  description:
    'BIP-110 / RDTS Mempool explorer, now retired. Kept for installs already using it.',
  metadata: {
    title: 'Mempool BIP-110 / RDTS',
    icon: 'https://raw.githubusercontent.com/paulscode/mempool-bip110-startos/master/icon.png',
  },
  kind: 'running',
  versionRange: '>=3:0',
  healthChecks: [],
  enabled: async ({ effects }) =>
    (await mempoolSelected(effects)) === 'mempool-rdts',
})

const elementsElectrs = sdk.Dependency.optional('elements-electrs', {
  description:
    'Liquid Electrum server, required only when the experimental Liquid hop in Anonymize is enabled.',
  metadata: {
    title: 'Liquid Electrum Server',
    icon: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDUwMCA1MDAiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICMxNDkwOWM7CiAgICAgIH0KCiAgICAgIC5jbHMtMiB7CiAgICAgICAgZmlsbDogIzIyZTFjOTsKICAgICAgfQoKICAgICAgLmNscy0zIHsKICAgICAgICBmaWxsOiAjMGQxNDM3OwogICAgICB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMjguNi4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogMS4yLjAgQnVpbGQgNzA5KSAgLS0+CiAgPGc+CiAgICA8ZyBpZD0iTGF5ZXJfMSI+CiAgICAgIDxnIGlkPSJMYXllcl8xLTIiIGRhdGEtbmFtZT0iTGF5ZXJfMSI+CiAgICAgICAgPGcgaWQ9IkxheWVyXzEtMiI+CiAgICAgICAgICA8Zz4KICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz0iY2xzLTMiIGN4PSIyNTAiIGN5PSIyNTAiIHI9IjI1MCIvPgogICAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0yMzIuNiwyMDcuMWMxMS45LTcxLjIsODcuOS02MS44LDk3LTYwLjQsOS41LDIuNywxOC41LTYuNSwxMy4zLTE1LjUtMjEtMzUuOS02Mi42LTU5LjEtOTQuNC02MC43LDgtNi4xLDM0LjQtOS43LDYyLjQtOC41LDkuOS40LDE0LTEyLjYsNS42LTE3LjktLjgtLjUtMS40LS45LTIuNS0xLjItMzguMy0xMS43LTc5LjQtMTIuOS0xMTguNS0yLjYtMjksNy42LTU3LjEsMjEuMi04MS45LDQxLjQtMTAuNCw4LjUtMjAsMTcuNi0yOC4yLDI3LjQtNjIuNCw3Mi41LTcwLDE3OC45LTE2LjgsMjU5LjksMSwxLjYsMi4xLDMuMSwzLjEsNC43LjksMS4xLDEuMiwxLjcsMS42LDIuMiwyLjUsMy42LDUuMSw3LjIsOCwxMC44LDMsMy44LDYuNCw3LjUsOS44LDExLC45LjksMS42LDEuNywyLjYsMi42LDMsMy4xLDYuMSw2LjQsOS42LDkuNC4yLjMuNi41LjkuOSwzLjUsMy4xLDcuMyw2LjEsMTAuOSw5LjIuOS44LDEuOCwxLjQsMi42LDIuMSwzLjQsMi42LDYuOSw1LDEwLjIsNy42LjUuMy45LjYsMS4yLjksMy45LDIuNiw4LDUuMSwxMiw3LjYuOS41LDEuNi45LDIuNCwxLjQsMy44LDIuMSw3LjYsNC4xLDExLjQsNiwuNS4zLjkuNSwxLjIuNiw0LjQsMi4xLDguOCw0LDEzLjIsNS44LjYuMywxLjEuNSwxLjcuOCw0LjIsMS42LDguNSwzLjEsMTIuNyw0LjQuNCwwLC44LjMuOS40LDQuNiwxLjUsOS41LDIuOCwxNC4yLDRoLjZjNC42LDEuMSw5LjUsMi4xLDE0LjIsMi45aC42YzEwLDEuNiwyMC4xLDIuNiwzMC4xLDIuOWguMmM0OS45LDEuMiwxMDAuMi0xNC40LDE0Mi00OC4zLDI1LjUtMjAuOCw0NS4zLTQ2LDU4LjgtNzMuOC44LTEuNSwxLjUtMy4xLDIuMi00LjYsMy45LTguNiw3LjQtMTcuNSwxMC0yNi41LTEzMC44LDQ5LjMtMjM5LjktMTcuNy0yMjUtMTA2LjZ2LS4yaC0uNS4xWiIvPgogICAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTIiIGQ9Ik0xNTUuOSwyMjguOWMyNS41LTM0LjQsMzcuMy0yOC4zLDM5LjYtMzguOSwzLjMtMTQuNS00OS42LTI3LjEtOTAuNyw0LjUsNTcuMi03MS42LDE0Ni41LTg4LjEsMjIyLjUtNDguOCwxMC4xLDUuMiwyMS41LTQuOCwxNS42LTE0LjYtMjEtMzUuOS02Mi42LTU5LjEtOTQuNC02MC43LDgtNi4xLDM0LjQtOS43LDYyLjQtOC41LDkuOS40LDE0LTEyLjYsNS42LTE3LjktLjgtLjUtMS40LS45LTIuNS0xLjItMzguMy0xMS43LTc5LjQtMTIuOS0xMTguNS0yLjYtMjksNy42LTU3LjEsMjEuMi04MS45LDQxLjQtMTAuNCw4LjUtMjAsMTcuNi0yOC4yLDI3LjQtNjIuNCw3Mi41LTcwLDE3OC45LTE2LjgsMjU5LjksMSwxLjYsMi4xLDMuMSwzLjEsNC43LjksMS4xLDEuMiwxLjcsMS42LDIuMiwyLjUsMy42LDUuMSw3LjIsOCwxMC44LDU1LjQsNjguNSwxNDQuMSw5NC40LDIyNC4xLDczLjMtMjA0LjUtMzAuMy0xNzMuNC0xOTguOS0xNDkuNS0yMzAuOWgtLjEsMFoiLz4KICAgICAgICAgIDwvZz4KICAgICAgICA8L2c+CiAgICAgIDwvZz4KICAgIDwvZz4KICA8L2c+Cjwvc3ZnPg==',
  },
  kind: 'running',
  versionRange: '>=0.1.0:0',
  healthChecks: ['index-sync'],
  enabled: async ({ effects }) => !!(await config(effects))?.liquid,
})

export const dependencies = sdk.Dependencies.of()
  .addDependency(lnd)
  .addDependency(electrs)
  .addDependency(fulcrum)
  .addDependency(mempool)
  .addDependency(mempoolPruned)
  .addDependency(mempoolRdts)
  .addDependency(elementsElectrs)
