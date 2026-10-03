import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'tests',testMatch:'**/*.spec.ts',workers:3,timeout:90000,
  use:{baseURL:process.env.PUBLIC_RELEASE_URL||'http://127.0.0.1:4188',headless:true},
  reporter:[['list'],['json',{outputFile:'artifacts/browser-results.json'}]],
  outputDir:'artifacts/test-results',
});
