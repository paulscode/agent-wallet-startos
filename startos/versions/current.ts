import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.1:0',
  releaseNotes: {
    en_US:
      'Tracks upstream Agent Wallet v0.1.1. Adds small-channel peer discovery ' +
      '(a vetted peer catalog plus an onboarding peer picker) and a channel-mix ' +
      'planner for opening several small channels in one pass, along with ' +
      'dashboard, BOLT 12, and Boltz reverse-swap refinements. Fixes PostgreSQL ' +
      'connection-pool exhaustion under reverse-swap load and the reverse-swap ' +
      'max-amount calculation.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
