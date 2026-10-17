import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.4.18:4',
  releaseNotes: {
    en_US:
      'Rebuilt on version 3 of the StartOS packaging SDK, which needs StartOS ' +
      '0.4.0.2. Nothing you have set changes. ' +
      'Fixes the wallet never finishing startup on StartOS 0.4.0.2: its ' +
      'internal queue (Redis) refused the server language setting and ' +
      'restarted every second. ' +
      'Uses version 3.0.6 of the packaging SDK.',
  },
  migrations: {
    // Nothing to migrate: the SDK changed, and nothing on disk does.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
