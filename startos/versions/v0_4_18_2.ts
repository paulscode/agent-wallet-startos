import { readFile } from 'fs/promises'
import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { configJson } from '../fileModels/config.json'
import { sdk } from '../sdk'

// 0.4.18:2 stays a node of its own: its migration pins an unsaved Mempool
// choice to the old default, and must not run again on later updates.
export const v0_4_18_2 = VersionInfo.of({
  version: '0.4.18:2',
  releaseNotes: {
    en_US:
      'The Mempool Explorer setting now defaults to the official Mempool, and ' +
      'offers Mempool Pruned for a pruned node. Mempool BIP-110 / RDTS is ' +
      'retired along with the soft fork it was built to visualise, and is no ' +
      'longer offered for new installs. If you already use it, nothing changes: ' +
      'your setting is kept, and you can move to another Mempool from the ' +
      'Configure action whenever you like. ' +
      'Same app version as 0.4.18:1 otherwise.',
  },
  migrations: {
    // The Mempool default moved from mempool-rdts to the official mempool. An
    // install that never saved a choice would otherwise switch on update to a
    // Mempool it may not have, so pin it to the old default. Read raw, because the
    // file model's .catch() would report the new default for a missing value.
    // Idempotent: a valid saved choice is left exactly as it is.
    up: async ({ effects }) => {
      const raw = await readFile(
        sdk.volumes.main.subpath('/config.json'),
        'utf8',
      )
        .then((t) => JSON.parse(t) as { mempool?: unknown })
        .catch(() => null)
      if (
        raw &&
        !['mempool', 'mempool-pruned', 'mempool-rdts'].includes(
          raw.mempool as string,
        )
      ) {
        await configJson.merge(effects, { mempool: 'mempool-rdts' })
      }
    },
    down: IMPOSSIBLE,
  },
})
