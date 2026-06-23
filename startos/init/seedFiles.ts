import { configJson } from '../fileModels/config.json'
import { storeJson } from '../fileModels/store.json'
import { hexKey, urlsafe } from '../secrets'
import { sdk } from '../sdk'

// Runs once on install (and on every version migration). Writes config defaults,
// seeds a random dashboard password when the user hasn't set one, and generates
// the base secrets the app needs to boot. The Anonymize key bundle is generated
// lazily in main.ts the first time Anonymize is enabled.
export const seedFiles = sdk.setupOnInit(async (effects) => {
  const cfg = await configJson.read().once()
  await configJson.merge(effects, {
    dashboardPassword: cfg?.dashboardPassword || urlsafe(32),
  })

  const store = await storeJson.read().once()
  await storeJson.merge(effects, {
    secretKey: store?.secretKey || hexKey(),
    postgresPassword: store?.postgresPassword || urlsafe(24),
    redisPassword: store?.redisPassword || urlsafe(24),
    torControlPassword: store?.torControlPassword || urlsafe(24),
    bolt12GatewayToken: store?.bolt12GatewayToken || urlsafe(32),
  })
})
