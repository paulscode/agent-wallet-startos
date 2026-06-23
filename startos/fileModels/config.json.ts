import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

// User-facing settings. main.ts reads these (plus the generated secrets in
// store.json) and passes them to the container entrypoint as environment.
//
// The dashboard password lives here (not in store.json) because it is the one
// secret the user is meant to see and change — it is surfaced on the Properties
// page and seeded with a random value on first init when left blank.
export const configJson = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: '/config.json',
  },
  z.object({
    mempool: z.enum(['mempool', 'mempool-rdts']).catch('mempool-rdts'),
    // 0.4.x defaults to Fulcrum (see actions/config.ts); the 0.3.x package
    // defaults to Electrs.
    indexer: z.enum(['electrs', 'fulcrum']).catch('fulcrum'),
    mempoolExplorerUrl: z.string().nullable().catch(''),
    dashboardPassword: z.string().catch(''),
    braiinsDeposit: z.boolean().catch(true),
    bolt12: z.boolean().catch(true),
    anonymize: z.boolean().catch(false),
    liquid: z.boolean().catch(false),
    logLevel: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']).catch('INFO'),
  }),
)
