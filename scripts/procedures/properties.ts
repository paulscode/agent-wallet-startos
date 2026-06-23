import { types as T } from "../deps.ts";

// Surfaces the dashboard login password (copyable) on the Properties page. The
// password is read from the rendered config on the main volume. It is shown
// unmasked + copyable by design; treat it like a hot-wallet key. The interface
// (Tor / LAN) addresses are shown on the Interfaces page.
export const properties: T.ExpectedExports.properties = async (
  effects: T.Effects,
) => {
  let password = "";
  try {
    const raw = await effects.readFile({
      volumeId: "main",
      path: "start9/config.yaml",
    });
    const m = raw.match(/^dashboard-password:\s*"?([^"\n]+)"?/m);
    if (m) password = m[1];
  } catch (_) {
    // Config not rendered yet — show an empty value rather than failing.
  }

  return {
    result: {
      version: 2,
      data: {
        "Dashboard Password": {
          type: "string",
          value: password,
          description:
            "Use this to log in to the dashboard. Treat it like a hot-wallet key; change it in Config.",
          copyable: true,
          masked: false,
          qr: false,
        },
      },
    },
  };
};
