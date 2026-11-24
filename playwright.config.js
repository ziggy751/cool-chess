import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir:'tests',
  testMatch:'*.spec.js',
  timeout:90000,
  workers:1,
  expect:{timeout:20000},
  use:{baseURL:'http://localhost:5173',launchOptions:{args:['--enable-unsafe-swiftshader']}},
  webServer:{command:'npm run dev',url:'http://localhost:5173',reuseExistingServer:true},
})
