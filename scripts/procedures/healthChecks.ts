import { types as T } from "../deps.ts";

// Both health checks run in-container (they curl the app on loopback), so they
// are declared as docker/inject checks in manifest.yaml and implemented in
// assets/scripts/health-check.sh. No script-type checks here.
export const health: T.ExpectedExports.health = {};
