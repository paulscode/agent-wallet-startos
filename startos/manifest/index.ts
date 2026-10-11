import { setupManifest } from '@start9labs/start-sdk'

const short =
  'A self-custodial Bitcoin & Lightning wallet with an automation API'

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
  // StartOS 0.4.0.2, not the SDK's default, so the registry hides releases from
  // older servers. Every release from 2026-10-11 on targets 0.4.0.2.
  osVersion: '0.4.0.2',
  // One data volume holds Postgres, Redis, Tor state, the BOLT 12 gateway state,
  // and the generated secrets/key backups. Dependency volumes (LND) are mounted
  // via mountDependency in main.ts, not declared here. Dependencies themselves
  // are declared in dependencies.ts.
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
})
