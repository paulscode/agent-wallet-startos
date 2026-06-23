import { types as T } from "../deps.ts";

// No dependency config checks/auto-configure are needed: the manifest declares
// `config: ~` for every dependency, and the conditional requirements are driven
// by setConfig.ts.
export const dependencies: T.ExpectedExports.dependencies = {};
