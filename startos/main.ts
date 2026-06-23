import { readFile, readdir } from 'fs/promises'
import { configJson } from './fileModels/config.json'
import { storeJson } from './fileModels/store.json'
import { fernetKey, urlsafe } from './secrets'
import { sdk } from './sdk'
import {
  dashboardPort,
  electrumPort,
  elementsElectrsHost,
  indexerHosts,
  lndHost,
  lndMountpoint,
  lndRestPort,
  mempoolApiPort,
  mempoolHosts,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  const cfg = await configJson.read().const(effects)
  if (!cfg) throw new Error('config.json not found')
  const store = await storeJson.read().const(effects)
  if (!store) throw new Error('store.json not found')

  // Generate the Anonymize key bundle the first time Anonymize is enabled, then
  // persist it so it is stable across restarts and captured in backups.
  let anon = store.anonymize
  if (cfg.anonymize && !anon.reuseDetectionKeyFernet) {
    anon = {
      reuseDetectionKeyFernet: fernetKey(),
      hopIdempotencyKeyFernet: fernetKey(),
      quoteTokenHmacKeyFernet: fernetKey(),
      quoteCacheSigningKeyFernet: fernetKey(),
      stepupCookieHmacKeyFernet: fernetKey(),
      decoySeedFernet: fernetKey(),
      decoySeedAccountKey: urlsafe(32),
      liquidSeedFernet: fernetKey(),
    }
    await storeJson.merge(effects, { anonymize: anon })
  }

  // Mount our data volume read-write and LND's data volume read-only (for its
  // TLS cert + admin macaroon). If the SDK requires the LND manifest type on
  // mountDependency, add `lnd-startos` to package.json and pass it as the generic.
  const mounts = sdk.Mounts.of()
    .mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: '/data',
      readonly: false,
    })
    .mountDependency({
      dependencyId: 'lnd',
      volumeId: 'main',
      subpath: null,
      mountpoint: lndMountpoint,
      readonly: true,
    })

  const container = await sdk.SubContainer.of(
    effects,
    { imageId: 'main' },
    mounts,
    'agent-wallet',
  )

  // Read LND credentials from the mounted volume. Detect the network subdir
  // (mainnet/testnet/signet/regtest) rather than hardcoding mainnet.
  const lndRoot = `${container.rootfs}${lndMountpoint}`
  const tlsCertB64 = await readFile(`${lndRoot}/tls.cert`)
    .then((b) => b.toString('base64'))
    .catch(() => '')
  const chainDir = `${lndRoot}/data/chain/bitcoin`
  const networks = await readdir(chainDir).catch(() => [] as string[])
  const network = networks.includes('mainnet')
    ? 'mainnet'
    : (networks[0] ?? 'mainnet')
  const macaroonHex = await readFile(`${chainDir}/${network}/admin.macaroon`)
    .then((b) => b.toString('hex'))
    .catch(() => '')

  // User-facing Mempool explorer URL for the dashboard's clickable links. The
  // internal LND_MEMPOOL_URL (.startos) is not browser-reachable, so resolve, in
  // order: an explicit operator override, the installed Mempool's own address
  // (auto-detected from the dependency's exported interface — LAN/.local
  // preferred, then its .onion), then the public mempool.space. Read once (not
  // reactive) so a later address change doesn't bounce the service.
  const mempoolPkgId = cfg.mempool === 'mempool' ? 'mempool' : 'mempool-rdts'
  let autoMempoolUrl = ''
  try {
    autoMempoolUrl = await sdk.serviceInterface
      .get(effects, { id: 'webui', packageId: mempoolPkgId }, (si) => {
        const lan = si?.addressInfo?.filter({ kind: 'mdns' }).format() ?? []
        const onion = si?.addressInfo?.public.format() ?? []
        return (lan[0] ?? onion[0] ?? '') as string
      })
      .once()
  } catch (_e) {
    autoMempoolUrl = ''
  }
  const mempoolPublicUrl =
    (cfg.mempoolExplorerUrl || '').trim() || autoMempoolUrl || 'https://mempool.space'

  // Dynamic / secret / config-derived environment. Static in-image infrastructure
  // (DATABASE_URL, REDIS_URL, Tor-on-localhost, API_HOST, COOKIE_SECURE, etc.) is
  // set by docker_entrypoint_040.sh, which consumes the passwords passed here.
  const env: Record<string, string> = {
    LOG_LEVEL: cfg.logLevel,
    BITCOIN_NETWORK: network === 'mainnet' ? 'bitcoin' : network,

    SECRET_KEY: store.secretKey,
    POSTGRES_PASSWORD: store.postgresPassword,
    REDIS_PASSWORD: store.redisPassword,
    TOR_CONTROL_PASSWORD: store.torControlPassword,
    DASHBOARD_TOKEN: cfg.dashboardPassword,
    // Braiins / Pool Deposit tab (default on); the dashboard shows/hides the tab.
    BRAIINS_DEPOSIT_ENABLED: String(cfg.braiinsDeposit),
    BOLT12_GATEWAY_TOKEN: store.bolt12GatewayToken,
    // BOLT 12 toggle (default on): point the wallet at the co-resident gateway
    // over loopback when enabled; empty keeps both the wallet runtime and the
    // gateway s6 service idle.
    BOLT12_GATEWAY_GRPC: cfg.bolt12 ? '127.0.0.1:50061' : '',

    LND_REST_URL: `https://${lndHost}:${lndRestPort}`,
    LND_MACAROON_HEX: macaroonHex,
    LND_TLS_CERT: tlsCertB64,

    LND_ELECTRUM_URL: `tcp://${indexerHosts[cfg.indexer]}:${electrumPort}`,
    LND_MEMPOOL_URL: `http://${mempoolHosts[cfg.mempool]}:${mempoolApiPort}`,
    MEMPOOL_PUBLIC_URL: mempoolPublicUrl,

    ANONYMIZE_ENABLED: String(cfg.anonymize),
    ANONYMIZE_LIQUID_ENABLED: String(cfg.anonymize && cfg.liquid),
  }

  if (cfg.anonymize) {
    Object.assign(env, {
      ANONYMIZE_REUSE_DETECTION_KEY_FERNET: anon.reuseDetectionKeyFernet,
      ANONYMIZE_HOP_IDEMPOTENCY_KEY_FERNET: anon.hopIdempotencyKeyFernet,
      ANONYMIZE_QUOTE_TOKEN_HMAC_KEY_FERNET: anon.quoteTokenHmacKeyFernet,
      ANONYMIZE_QUOTE_CACHE_SIGNING_KEY_FERNET: anon.quoteCacheSigningKeyFernet,
      ANONYMIZE_STEPUP_COOKIE_HMAC_KEY_FERNET: anon.stepupCookieHmacKeyFernet,
      ANONYMIZE_DECOY_SEED_FERNET: anon.decoySeedFernet,
      ANONYMIZE_DECOY_SEED_ACCOUNT_KEY: anon.decoySeedAccountKey,
    })
    if (cfg.liquid) {
      Object.assign(env, {
        ANONYMIZE_LIQUID_SEED_FERNET: anon.liquidSeedFernet,
        ANONYMIZE_LIQUID_INTEGRATION_VERIFIED: 'true',
        ANONYMIZE_LIQUID_ELECTRUM_URL: `tcp://${elementsElectrsHost}:${electrumPort}`,
      })
    }
  }

  return (
    sdk.Daemons.of(effects)
      // The dashboard being reachable is the MAIN ready signal — it must not
      // depend on LND, so a locked/syncing LND doesn't strand the package.
      .addDaemon('main', {
        subcontainer: container,
        exec: {
          command: ['/usr/local/bin/docker_entrypoint_040.sh'],
          env,
          runAsInit: true,
          sigtermTimeout: 120_000,
        },
        ready: {
          display: 'Web Interface',
          fn: () =>
            sdk.healthCheck.checkPortListening(effects, dashboardPort, {
              successMessage: 'The dashboard is ready',
              errorMessage: 'The dashboard is starting',
            }),
        },
        requires: [],
      })
      // Node/DB connectivity is a SEPARATE, non-blocking health check: a locked
      // or syncing LND shows as degraded without blocking the package.
      .addHealthCheck('node-connectivity', {
        ready: {
          display: 'Node Connectivity',
          fn: async () => {
            const res = await container
              .exec(
                [
                  'curl',
                  '-fsS',
                  '-o',
                  '/dev/null',
                  `http://127.0.0.1:${dashboardPort}/ready`,
                ],
                {},
              )
              .catch(() => null)
            if (res && res.exitCode === 0) {
              return { result: 'success', message: 'LND and database reachable' }
            }
            return {
              result: 'loading',
              message:
                'Waiting on LND / database (the dashboard may already be usable)',
            }
          },
        },
        requires: [],
      })
  )
})
