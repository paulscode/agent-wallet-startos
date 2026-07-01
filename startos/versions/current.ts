import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.17:0',
  releaseNotes: {
    en_US:
      'Tracks upstream Agent Wallet v0.4.17 — a large update bringing everything ' +
      'since v0.1.2. Headline: capital-efficient inbound (receive) liquidity ' +
      'building that opens a channel, swaps its balance back on-chain, and ' +
      'reuses the funds to build several times your starting amount — now with a ' +
      'thorough reliability pass so automated builds no longer stall ("Event ' +
      'loop is closed", "peer not online", stuck reverse-swap payments, or LND ' +
      'anchor-reserve rejections). The build progress view survives a page ' +
      'refresh, every on-chain step links to your mempool explorer, and a ' +
      'failed build can be retried from a dashboard banner. See the upstream ' +
      'changelog for the full 0.1.3-0.4.17 history.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
