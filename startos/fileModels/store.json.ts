import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

// Package-generated secrets, never surfaced to the user. Seeded once on first
// init (seedFiles.ts) and read by main.ts into the container environment. These
// MUST be included in backups (they decrypt the database) — the `main` volume
// is backed up wholesale.
//
// The Anonymize bundle is generated lazily the first time Anonymize is enabled;
// until then the fields are empty strings.
export const storeJson = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: '/store.json',
  },
  z.object({
    secretKey: z.string().catch(''),
    postgresPassword: z.string().catch(''),
    redisPassword: z.string().catch(''),
    torControlPassword: z.string().catch(''),
    bolt12GatewayToken: z.string().catch(''),
    anonymize: z
      .object({
        reuseDetectionKeyFernet: z.string().catch(''),
        hopIdempotencyKeyFernet: z.string().catch(''),
        quoteTokenHmacKeyFernet: z.string().catch(''),
        quoteCacheSigningKeyFernet: z.string().catch(''),
        stepupCookieHmacKeyFernet: z.string().catch(''),
        decoySeedFernet: z.string().catch(''),
        decoySeedAccountKey: z.string().catch(''),
        liquidSeedFernet: z.string().catch(''),
      })
      .catch({
        reuseDetectionKeyFernet: '',
        hopIdempotencyKeyFernet: '',
        quoteTokenHmacKeyFernet: '',
        quoteCacheSigningKeyFernet: '',
        stepupCookieHmacKeyFernet: '',
        decoySeedFernet: '',
        decoySeedAccountKey: '',
        liquidSeedFernet: '',
      }),
  }),
)
