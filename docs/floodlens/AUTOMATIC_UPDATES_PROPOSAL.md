# Guarded automatic observation publication: approved implementation

Exact target: **UNIS25/openatg-site**, branch **main**, existing branch-based
GitHub Pages publication at **https://openatg.com/floodlens/**.

Current deployed job: `.github/workflows/floodlens-source-check.yml`, hourly,
`contents: read`, source retrieval/hash checking only. It does not publish public
updates. First manual execution succeeded:
https://github.com/UNIS25/openatg-site/actions/runs/40302669679

## Approved permission delta

The separate observation publication job uses:

```yaml
permissions:
  contents: write
  pages: write
```

Use GitHub's ephemeral `GITHUB_TOKEN`. Do not create a PAT, deploy key or other
persistent credential. Do not change repository-wide default permissions,
branch protection, domain, HTTPS, Cloudflare or Pages publishing configuration.

`contents: write` permits a data commit. `pages: write` permits an explicit
`POST /repos/UNIS25/openatg-site/pages/builds` because GitHub-token pushes do not
automatically trigger branch-based Pages builds. The publisher checks the exact build commit and public JSON hash before
reporting automatic publication success.

GitHub documents these constraints:
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build

**Actual scope/risk:** GitHub does not scope these permissions to file paths.
The token can write repository contents and request Pages builds. Path limits
below are reviewed code safeguards, not a token-enforced security boundary.

## Eligible data and code safeguards

Initially automate only dated reservoir observations from the already verified,
public official CSV. Strict column names, numeric parsing, original units,
calendar dates, source URL/hash, retrieval time and unknown observation time
are mandatory. Nulls remain unknown; no zero-filling. The source's `DS IMPACT`
field must never generate a safety claim. Reject malformed CSV, missing known
records, unsupported units, future dates, duplicate records and unexplained
schema changes. Old dates remain visibly old.

The deterministic directory is isolated in `floodlens/data/reservoirs.json`,
including its source hash and retrieval timestamp; reviewed warning content
stays in `reviewed.json`. The publication step stages only that exact path and
fails if `git diff --cached --name-only` contains anything else. It must not
modify frontend code, workflow files, warning severity, DS mappings, validity,
translations or arbitrary paths derived from source text. No model calls or
source-driven shell commands occur. Normal non-force pushes and a concurrency
group protect against competing updates. Verify the resulting Pages build SHA
and public JSON contents before reporting publication success.

On fetch/parse failure, retain prior values with their original dates and
publish an explicit failure/freshness record if this narrowly scoped behavior
is included in the approved change. Never silently replace failure with empty
or apparently fresh data. Keep run logs/source hashes auditable and avoid paid
runner classes or artifact/cache storage.

## Data that remains review-gated

Flood/landslide/rainfall warning scope, cancellation/supersession, severity and
translations remain a reviewed transcription of original official bulletins.
The PDF layout matters; the 14:45 landslide update introduced six Level 3 areas
that were absent from the earlier snapshot. An unattended LLM must not publish
interpretations as official warnings.

ArcGIS gauge database `CreationDate`/`EditDate` are not verified measurement
timestamps. That feed is not eligible for automatic observed-level publication
until measurement-time, unit and rainfall-interval semantics are confirmed.

The user approved this exact permission delta on 26 October 2026. The enabled
workflow is `.github/workflows/floodlens-observation-update.yml`, hourly at minute
37 plus manual dispatch. Runtime evidence is in its public Actions run history.
Do not infer a successful publication from the workflow configuration alone.
