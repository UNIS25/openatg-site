import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'tests',testMatch:'**/*.spec.ts',workers:3,timeout:process.env.PUBLIC_RELEASE_URL?180000:90000,
  expect:{timeout:process.env.PUBLIC_RELEASE_URL?30000:5000},
  use:{baseURL:process.env.PUBLIC_RELEASE_URL||'https://127.0.0.1:4189',ignoreHTTPSErrors:!process.env.PUBLIC_RELEASE_URL,headless:true},
  reporter:[['list'],['json',{outputFile:'artifacts/browser-results.json'}]],
  outputDir:'artifacts/test-results',
  projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
});
