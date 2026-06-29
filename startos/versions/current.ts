import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.2:0',
  releaseNotes: {
    en_US:
      'Tracks upstream Agent Wallet v0.1.2. Fixes reverse swaps failing with a ' +
      'Boltz "invalid pair hash" error (cold-storage Lightning withdrawals, ' +
      'Open Inbound to wallet, channel-mix rebalances, and channel-funded ' +
      'Braiins deposits), and Braiins deposits stalling at "awaiting ' +
      'confirmation" when the chain indexer is briefly unreachable (now falls ' +
      'back to LND). Small-channel Braiins deposits open to the most economic ' +
      'vetted catalog peer with automatic fallback; the routing-headroom fee ' +
      'line has an explanatory info popover; and the tip-the-developer flow ' +
      'drops a redundant step.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
