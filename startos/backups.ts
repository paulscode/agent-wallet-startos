import { sdk } from './sdk'

// Backs up the `main` volume — the Postgres datadir, the BOLT 12 gateway state,
// Tor guard state, and (critically) the generated secrets in store.json/config.json
// that decrypt the database. StartOS quiesces the container during backup, so the
// datadir is captured consistently.
//
// Refinement (see the packaging plan §11): switch to a pg_dump logical dump via a
// pre-backup hook and exclude the live datadir, once verified on the servers.
export const { createBackup, restoreInit } = sdk.setupBackups(
  async ({ effects }) => sdk.Backups.ofVolumes('main'),
)
