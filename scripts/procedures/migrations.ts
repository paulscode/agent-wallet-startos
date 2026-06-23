import { compat, types as T } from "../deps.ts";

const current = "0.1.0";

export const migration: T.ExpectedExports.migration = (
  effects: T.Effects,
  version: string,
  ...args: unknown[]
) => {
  return compat.migrations.fromMapping(
    {
      // No migrations: 0.1.0 is the first release.
    },
    current,
  )(effects, version, ...args);
};
