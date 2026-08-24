# ATG Signal browser application

ATG Signal is a static GitHub Pages application. `index.html`, `signal.css`, `app.js` and
`signal-core.mjs` run directly in the browser; there is no build step, server, database,
analytics service or upload endpoint.

## Architecture

- `signal-core.mjs` is the behavioral port. It keeps platform mappings, engagement formulas,
  thresholds, fallback column names, LinkedIn sheet handling, date filtering and change
  formatting separate from the interface.
- `app.js` manages local `File` objects, validation, tables and downloads. Files remain in page
  memory and are discarded when the page is refreshed or closed.
- `vendor/xlsx.full.min.js` reads CSV/XLS/XLSX files and creates Excel workbooks.
- `vendor/docx.umd.js` creates the Word report.
- `manifest.webmanifest`, `pwa.js` and `service-worker.js` provide optional desktop installation
  and cache only the production application assets needed for offline use. Selected files and
  generated reports are not cached.
- A restrictive Content Security Policy sets `connect-src 'none'`, so the application cannot
  make runtime network requests after the static files have loaded.

## Supported inputs

Top 3 Posts accepts CSV, XLS and XLSX for all five platforms. LinkedIn workbooks use the
`All posts` sheet and skip the first row, matching the Python reference.

Week comparison intentionally preserves the Python reader behavior: LinkedIn uses an Excel
workbook with the `All posts` sheet and skipped first row; X English, X French, Facebook and
Instagram use CSV. Facebook retries Latin-1 when UTF-8 decoding fails.

## Dependencies

The exact versions, upstream sources and licences are recorded in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Runtime files are vendored locally; no CDN is
contacted by the published application.

## Parity tests

From the repository root:

```sh
node tests/signal/run-parity.mjs
```

The runner executes the synthetic fixtures through the read-only Python reference and the
browser JavaScript core, then writes `artifacts/signal/parity-results.json`.
