import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.18:1',
  releaseNotes: {
    en_US:
      'Fixes login failing with "Request timed out — the node may be ' +
      'unreachable" on StartOS 0.4.0. StartOS 0.4.0 ships an LND whose TLS ' +
      'certificate no longer covers the name `lnd.startos`, so the connection ' +
      'was rejected for a hostname mismatch even though the certificate itself ' +
      'was the right one. Agent Wallet now connects to LND at an address its ' +
      'certificate does cover. No settings change is needed — update and start. ' +
      'Same app version as 0.4.18:0 otherwise. ' +
      'Tracks upstream Agent Wallet v0.4.18 — a large update bringing everything ' +
      'since v0.1.2. Headline: capital-efficient inbound (receive) liquidity ' +
      'building that opens a channel, swaps its balance back on-chain, and ' +
      'reuses the funds to build several times your starting amount — now with a ' +
      'thorough reliability pass so automated builds no longer stall ("Event ' +
      'loop is closed", "peer not online", stuck reverse-swap payments, LND ' +
      'anchor-reserve rejections, or a recycled round whose claim txid was not ' +
      'recorded). The build progress view survives a page refresh, every ' +
      'on-chain step links to your mempool explorer, and a failed build can be ' +
      'retried from a dashboard banner. See the upstream changelog for the full ' +
      '0.1.3-0.4.18 history.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
