# Third-party notices

ATG Signal includes the following locally vendored runtime dependencies.

## SheetJS Community Edition 0.20.3

- Purpose: CSV, XLS and XLSX parsing; XLSX report generation.
- Upstream: https://sheetjs.com/ and https://cdn.sheetjs.com/xlsx-0.20.3/
- Runtime file: `vendor/xlsx.full.min.js`
- Licence: Apache License 2.0; full text in `vendor/LICENSE.sheetjs.txt`.
- Vendored SHA-256: `cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41`

## docx 9.7.1

- Purpose: browser-side `.docx` report generation.
- Upstream: https://github.com/dolanmiu/docx and https://docx.js.org/
- Runtime file: `vendor/docx.umd.js`
- Licence: MIT; full text in `vendor/LICENSE.docx.txt`.
- npm package SHA-256: `b02e37956d989b29d139d96cd44d24b23ee7a36b9ac18e5f33d41019726ab978`
- Vendored SHA-256: `096ce30fdd0a8ddc94fe44a86ab1d5ce58165c88d8be797005eba8788fab7203`

Both scripts are loaded from the same `/signal/` origin. They are never fetched from their
upstream hosts at runtime.
