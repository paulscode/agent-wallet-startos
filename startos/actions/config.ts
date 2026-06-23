import { configJson } from '../fileModels/config.json'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

export const inputSpec = InputSpec.of({
  // 0.4.x defaults to Fulcrum — the indexer featured in the official 0.4
  // marketplace (Electrs moved to the community marketplace), so most 0.4 users
  // run it. The 0.3.x package defaults to Electrs, which is featured in the
  // 0.3.5.1 Bitcoin section. Keep the two version defaults intentionally different.
  indexer: Value.select({
    name: 'Indexer',
    description:
      'The Electrum indexer the wallet uses for on-chain lookups. The selected one must be installed.',
    values: { fulcrum: 'Fulcrum', electrs: 'Electrs' },
    default: 'fulcrum',
  }),
  mempool: Value.select({
    name: 'Mempool Explorer',
    description:
      'Which installed Mempool explorer the wallet links to and queries. The selected one must be installed.',
    values: {
      'mempool-rdts': 'Mempool BIP-110 / RDTS',
      mempool: 'Mempool (official)',
    },
    default: 'mempool-rdts',
  }),
  mempoolExplorerUrl: Value.text({
    name: 'Mempool Explorer URL (for links)',
    description:
      'Normally leave this blank. The dashboard’s clickable transaction / address links then point at your installed Mempool service’s own address, detected automatically. Enter a URL here only to override that with a specific explorer — for example its .onion, or the public https://mempool.space.',
    placeholder: 'Leave blank to use your installed Mempool',
    required: false,
    default: null,
  }),
  dashboardPassword: Value.text({
    name: 'Dashboard Password',
    description:
      'The password to log in to the dashboard. Copy it to log in, or change it here. Treat it like a hot-wallet key.',
    required: true,
    default: null,
    masked: true,
  }),
  braiinsDeposit: Value.toggle({
    name: 'Enable Braiins / Pool Deposit',
    description:
      'Show the Braiins Deposit tab in the dashboard, for funding a Braiins / Ocean / Datum mining payout address from your wallet. Turn off to hide the tab if you don’t mine.',
    default: true,
  }),
  bolt12: Value.toggle({
    name: 'Enable BOLT 12 Offers',
    description:
      'Run the bundled BOLT 12 onion-message gateway so the wallet can publish offers and receive payouts (for example from Ocean). Turn off if you only use the dashboard / agent API and want to save the gateway’s resources.',
    default: true,
  }),
  anonymize: Value.toggle({
    name: 'Enable Anonymize (Experimental)',
    description:
      'Experimental privacy feature. Routes funds through extra hops; at startup the app enforces onion-only egress and verifies a signed operator registry (uses the bundled Tor).',
    warning:
      'EXPERIMENTAL. Leave off unless you understand the trade-offs. Enabling it generates additional keys.',
    default: false,
  }),
  liquid: Value.toggle({
    name: 'Use Liquid Hop in Anonymize (Experimental)',
    description:
      'Adds a Liquid hop to Anonymize. Requires installing the separate Liquid Electrum Server (elements-electrs) package. Only meaningful when Anonymize is on.',
    warning:
      'EXPERIMENTAL. The Liquid Electrum Server needs ~115 GB disk and ~14 GiB RAM during its initial sync; run it on a host with at least 32 GB total RAM alongside your other services.',
    default: false,
  }),
  logLevel: Value.select({
    name: 'Log Level',
    description: 'Log verbosity. Less is usually better.',
    values: {
      ERROR: 'Error',
      WARN: 'Warning',
      INFO: 'Info',
      DEBUG: 'Debug',
      TRACE: 'Trace',
    },
    default: 'INFO',
  }),
})

export const config = sdk.Action.withInput(
  'config',

  async ({ effects }) => ({
    name: 'Configure',
    description: 'Configure Agent Wallet',
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  // Pre-fill with the current config (the dashboard password was seeded on init).
  async ({ effects }) => configJson.read().once(),

  async ({ effects, input }) => configJson.merge(effects, input),
)
