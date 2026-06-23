import { configJson } from './fileModels/config.json'
import { sdk } from './sdk'

// Conditional requirements driven by the selected config: LND is always required
// (no alternative); exactly one indexer and exactly one Mempool flavor become
// required by the user's selection; the Liquid Electrum backend becomes required
// only when the experimental Liquid hop is enabled.
//
// LND is returned unconditionally so the result type satisfies the mandatory
// (`optional: false`) LND dependency declared in the manifest.
//
// Version ranges are placeholders to confirm against the versions installed on
// the target servers. Dependency health-check ids likewise must match the
// installed package's real ids; we require `running` only (plus elements-electrs'
// `index-sync`, whose id is known) to stay robust until confirmed.
export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  const cfg = await configJson.read().const(effects)

  return {
    lnd: { kind: 'running', versionRange: '>=0.18:0', healthChecks: [] },
    ...(cfg?.indexer === 'electrs'
      ? { electrs: { kind: 'running', versionRange: '>=0.10:0', healthChecks: [] } }
      : { fulcrum: { kind: 'running', versionRange: '>=1.9:0', healthChecks: [] } }),
    ...(cfg?.mempool === 'mempool'
      ? { mempool: { kind: 'running', versionRange: '>=3:0', healthChecks: [] } }
      : {
          'mempool-rdts': {
            kind: 'running',
            versionRange: '>=3:0',
            healthChecks: [],
          },
        }),
    ...(cfg?.liquid
      ? {
          'elements-electrs': {
            kind: 'running',
            versionRange: '>=0.1.0:0',
            healthChecks: ['index-sync'],
          },
        }
      : {}),
  }
})
