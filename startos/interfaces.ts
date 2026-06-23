import { sdk } from './sdk'
import { dashboardPort } from './utils'

// One HTTP UI interface fronting the dashboard. The app serves its UI under
// `/dashboard/` (not `/`), so the interface path points there; the app also adds
// a `/` -> `/dashboard/` redirect so any entry point lands correctly.
export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const uiMulti = sdk.MultiHost.of(effects, 'main')
  const uiMultiOrigin = await uiMulti.bindPort(dashboardPort, {
    protocol: 'http',
  })
  const ui = sdk.createInterface(effects, {
    name: 'Dashboard',
    id: 'dashboard',
    description: 'The Agent Wallet dashboard and API.',
    type: 'ui',
    schemeOverride: null,
    masked: false,
    username: null,
    path: '/dashboard/',
    query: {},
  })

  const receipt = await uiMultiOrigin.export([ui])
  return [receipt]
})
