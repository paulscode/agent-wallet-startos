import { setupManifest } from '@start9labs/start-sdk'

const short = 'A self-custodial Bitcoin & Lightning wallet with an automation API'

const long =
  'Agent Wallet is a self-custodial Bitcoin and Lightning wallet that connects to your own LND node and exposes a dashboard plus a programmatic API designed for AI agents to initiate payments within configured limits. It integrates with an installed Electrum indexer (Electrs or Fulcrum) and a Mempool explorer for on-chain data, and offers an optional, experimental Anonymize feature. Anyone or anything holding the dashboard password or an issued API key can spend from the connected node up to its limits — treat those credentials like a hot wallet.'

export const manifest = setupManifest({
  id: 'agent-wallet',
  title: 'Agent Wallet',
  license: 'MIT',
  packageRepo: 'https://github.com/paulscode/agent-wallet-startos',
  upstreamRepo: 'https://github.com/paulscode/agent-wallet',
  marketingUrl: 'https://github.com/paulscode/agent-wallet',
  donationUrl: null,
  description: { short, long },
  // One data volume holds Postgres, Redis, Tor state, the BOLT 12 gateway state,
  // and the generated secrets/key backups. Dependency volumes (LND) are mounted
  // via mountDependency in main.ts, not declared here.
  volumes: ['main'],
  images: {
    main: {
      source: {
        dockerBuild: {
          dockerfile: 'Dockerfile',
          workdir: '.',
        },
      },
      arch: ['x86_64', 'aarch64'],
    },
  },
  // The actual required-vs-optional decision is made dynamically in
  // dependencies.ts based on the selected config; these entries are the metadata
  // StartOS shows. LND is always needed; exactly one indexer and one Mempool
  // flavor are selected; the Liquid backend is required only when the Liquid hop
  // is enabled. (Version ranges are confirmed against the installed packages.)
  dependencies: {
    lnd: {
      description: 'The Lightning node Agent Wallet connects to and controls.',
      // Mandatory — there is no alternative. (The indexer and Mempool deps are
      // optional only because each is one of two interchangeable choices.)
      optional: false,
      metadata: {
        title: 'LND',
        icon: 'https://raw.githubusercontent.com/Start9Labs/lnd-startos/master/icon.svg',
      },
    },
    electrs: {
      description: 'Electrum indexer used for on-chain address and fee lookups.',
      optional: true,
      metadata: {
        title: 'Electrs',
        icon: 'https://raw.githubusercontent.com/Start9-Community/electrs-startos/master/icon.svg',
      },
    },
    fulcrum: {
      description: 'Electrum indexer used for on-chain address and fee lookups.',
      optional: true,
      metadata: {
        title: 'Fulcrum',
        icon: 'https://raw.githubusercontent.com/Start9Labs/fulcrum-startos/master/icon.png',
      },
    },
    mempool: {
      description: 'Local Mempool explorer queried for fees and chain data.',
      optional: true,
      metadata: {
        title: 'Mempool',
        icon: 'https://raw.githubusercontent.com/Start9Labs/mempool-startos/master/icon.svg',
      },
    },
    'mempool-rdts': {
      description:
        'BIP-110 / RDTS Mempool explorer queried for fees and chain data.',
      optional: true,
      metadata: {
        title: 'Mempool BIP-110 / RDTS',
        icon: 'https://raw.githubusercontent.com/paulscode/mempool-bip110-startos/master/icon.png',
      },
    },
    'elements-electrs': {
      description:
        'Liquid Electrum server, required only when the experimental Liquid hop in Anonymize is enabled.',
      optional: true,
      metadata: {
        title: 'Liquid Electrum Server',
        icon: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDUwMCA1MDAiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICMxNDkwOWM7CiAgICAgIH0KCiAgICAgIC5jbHMtMiB7CiAgICAgICAgZmlsbDogIzIyZTFjOTsKICAgICAgfQoKICAgICAgLmNscy0zIHsKICAgICAgICBmaWxsOiAjMGQxNDM3OwogICAgICB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMjguNi4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogMS4yLjAgQnVpbGQgNzA5KSAgLS0+CiAgPGc+CiAgICA8ZyBpZD0iTGF5ZXJfMSI+CiAgICAgIDxnIGlkPSJMYXllcl8xLTIiIGRhdGEtbmFtZT0iTGF5ZXJfMSI+CiAgICAgICAgPGcgaWQ9IkxheWVyXzEtMiI+CiAgICAgICAgICA8Zz4KICAgICAgICAgICAgPGNpcmNsZSBjbGFzcz0iY2xzLTMiIGN4PSIyNTAiIGN5PSIyNTAiIHI9IjI1MCIvPgogICAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0yMzIuNiwyMDcuMWMxMS45LTcxLjIsODcuOS02MS44LDk3LTYwLjQsOS41LDIuNywxOC41LTYuNSwxMy4zLTE1LjUtMjEtMzUuOS02Mi42LTU5LjEtOTQuNC02MC43LDgtNi4xLDM0LjQtOS43LDYyLjQtOC41LDkuOS40LDE0LTEyLjYsNS42LTE3LjktLjgtLjUtMS40LS45LTIuNS0xLjItMzguMy0xMS43LTc5LjQtMTIuOS0xMTguNS0yLjYtMjksNy42LTU3LjEsMjEuMi04MS45LDQxLjQtMTAuNCw4LjUtMjAsMTcuNi0yOC4yLDI3LjQtNjIuNCw3Mi41LTcwLDE3OC45LTE2LjgsMjU5LjksMSwxLjYsMi4xLDMuMSwzLjEsNC43LjksMS4xLDEuMiwxLjcsMS42LDIuMiwyLjUsMy42LDUuMSw3LjIsOCwxMC44LDMsMy44LDYuNCw3LjUsOS44LDExLC45LjksMS42LDEuNywyLjYsMi42LDMsMy4xLDYuMSw2LjQsOS42LDkuNC4yLjMuNi41LjkuOSwzLjUsMy4xLDcuMyw2LjEsMTAuOSw5LjIuOS44LDEuOCwxLjQsMi42LDIuMSwzLjQsMi42LDYuOSw1LDEwLjIsNy42LjUuMy45LjYsMS4yLjksMy45LDIuNiw4LDUuMSwxMiw3LjYuOS41LDEuNi45LDIuNCwxLjQsMy44LDIuMSw3LjYsNC4xLDExLjQsNiwuNS4zLjkuNSwxLjIuNiw0LjQsMi4xLDguOCw0LDEzLjIsNS44LjYuMywxLjEuNSwxLjcuOCw0LjIsMS42LDguNSwzLjEsMTIuNyw0LjQuNCwwLC44LjMuOS40LDQuNiwxLjUsOS41LDIuOCwxNC4yLDRoLjZjNC42LDEuMSw5LjUsMi4xLDE0LjIsMi45aC42YzEwLDEuNiwyMC4xLDIuNiwzMC4xLDIuOWguMmM0OS45LDEuMiwxMDAuMi0xNC40LDE0Mi00OC4zLDI1LjUtMjAuOCw0NS4zLTQ2LDU4LjgtNzMuOC44LTEuNSwxLjUtMy4xLDIuMi00LjYsMy45LTguNiw3LjQtMTcuNSwxMC0yNi41LTEzMC44LDQ5LjMtMjM5LjktMTcuNy0yMjUtMTA2LjZ2LS4yaC0uNS4xWiIvPgogICAgICAgICAgICA8cGF0aCBjbGFzcz0iY2xzLTIiIGQ9Ik0xNTUuOSwyMjguOWMyNS41LTM0LjQsMzcuMy0yOC4zLDM5LjYtMzguOSwzLjMtMTQuNS00OS42LTI3LjEtOTAuNyw0LjUsNTcuMi03MS42LDE0Ni41LTg4LjEsMjIyLjUtNDguOCwxMC4xLDUuMiwyMS41LTQuOCwxNS42LTE0LjYtMjEtMzUuOS02Mi42LTU5LjEtOTQuNC02MC43LDgtNi4xLDM0LjQtOS43LDYyLjQtOC41LDkuOS40LDE0LTEyLjYsNS42LTE3LjktLjgtLjUtMS40LS45LTIuNS0xLjItMzguMy0xMS43LTc5LjQtMTIuOS0xMTguNS0yLjYtMjksNy42LTU3LjEsMjEuMi04MS45LDQxLjQtMTAuNCw4LjUtMjAsMTcuNi0yOC4yLDI3LjQtNjIuNCw3Mi41LTcwLDE3OC45LTE2LjgsMjU5LjksMSwxLjYsMi4xLDMuMSwzLjEsNC43LjksMS4xLDEuMiwxLjcsMS42LDIuMiwyLjUsMy42LDUuMSw3LjIsOCwxMC44LDU1LjQsNjguNSwxNDQuMSw5NC40LDIyNC4xLDczLjMtMjA0LjUtMzAuMy0xNzMuNC0xOTguOS0xNDkuNS0yMzAuOWgtLjEsMFoiLz4KICAgICAgICAgIDwvZz4KICAgICAgICA8L2c+CiAgICAgIDwvZz4KICAgIDwvZz4KICA8L2c+Cjwvc3ZnPg==',
      },
    },
  },
  alerts: {
    install:
      'Agent Wallet can move real Bitcoin and Lightning funds, and it is designed to let AI agents initiate payments within configured limits. Anyone or anything with the dashboard password — or an issued API key — can spend from the connected LND node up to its rate limits. Treat the dashboard password like a hot-wallet key. The Anonymize feature is experimental. You are responsible for your funds; review the disclaimers before use.',
  },
})
