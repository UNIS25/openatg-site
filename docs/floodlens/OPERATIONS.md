# OpenATG FloodLens

Public route: `https://openatg.com/floodlens/`. Existing deployment route: GitHub
Pages, `UNIS25/openatg-site`, `main`, repository root, behind existing Cloudflare.
No framework, backend, external font, runtime map library or new credential.

## Data contract and release scope

`floodlens/data/reviewed.json` contains manually reviewed, selected official
bulletins, eight dated station observations and two dated reservoir observations.
It is not complete national alert or gauge coverage. Every warning has original
URL, issue time, expiry, scope, authority, SHA-256 and explicit DS-code mapping.
The rainfall advisory's document issue time (03:00 SLST) is kept separately from
its DMC listing time (03:30). All timestamps include time-zone offsets.

The 26 October river PDF was issued at 12:30 SLST; its selected measurements are
at 12:00. Source remarks are station classifications, not area predictions.
All eight selected gauges use metres. Nagalagam Street is deliberately not
ingested; its official unit is feet. No ArcGIS `CreationDate` or `EditDate` is
presented as an observation timestamp, and rainfall-period semantics are not
invented. Reservoir values are daily reports dated 26 October; time unknown.
Percentages denote effective storage/capacity. Spill discharge retains cusecs
(ft³/s). `DS IMPACT = Normal` is never used as a downstream safety assertion.

`provenance.json` preserves retrieval timestamps, exact source URLs, hashes,
byte counts, media types and fetch results. Raw first-release files are retained
locally in ignored `artifacts/floodlens/source-check/`. Their source hashes are
public. No scraped HTML or PDF content is executed or injected into the UI.

Warning validity and source freshness are separate. Within-period official
warnings remain visible even when a gauge is stale. Source checks and gauge
observations over three hours old are explicitly stale. Daily reservoirs become
older observations on the next Sri Lanka calendar day. Expired, unknown,
missing, future-dated or failed data never produce an all-clear.

## Deployed source checks and permission boundary

`.github/workflows/floodlens-source-check.yml` runs at minute 17 each hour and
on manual dispatch. This is a best-effort GitHub Actions schedule; it can be
delayed or disabled by GitHub for inactivity. It uses the existing public
repository's free standard Ubuntu runner, `contents: read` and no stored token.
It reads nine allowlisted public sources, verifies file shape, records hashes,
and writes a public job summary and run log. No Actions artifacts/cache storage
is allocated. Raw retrievals are temporary in the runner; source hashes and
parsed provenance persist in the run log. Fetch failure fails the job visibly.

This workflow does **not** update the public warning snapshot. The page links
to its run history and says automatic bulletin publishing is not enabled.
The page fetches the published snapshot every five minutes while visible and
updates age/expiry each minute. It sends no location and does not claim anyone
is continuously monitoring the user.

Automatic snapshot publishing would require a workflow-level permission delta
from `contents: read` to `contents: write` for the ephemeral `GITHUB_TOKEN`.
No new credential is necessary, but that grants a workflow repository writes.
That expansion is not authorized by this release and is not implemented.
Repository default permissions, security settings and deployment settings are
unchanged. New/changed warning interpretation must remain review-gated even if
deterministic observations are later automatically published.

## Update procedure

1. Run `python3 scripts/floodlens/check_sources.py` and inspect the audit report.
2. Open the original official bulletin, including its layout and all languages.
3. Review validity, severity, limited scope, cancellations and supersession.
4. Update `reviewed.json` and provenance only after that review. Preserve the
   source publication time separately from retrieval time. Every DS must resolve
   to an exact district-scoped code; use documented aliases, never fuzzy-only
   exclusion. Unresolved areas remain explicit unknowns.
5. Run the safety/browser tests and publish through the existing Pages route.

`seed_reviewed.py` records the first source transcription and is a one-time
reproduction aid, not an updater. It must never be scheduled. The initial hash
capture refuses to overwrite an existing provenance baseline.

## Location, boundary limits and privacy

Catalogue: 25 districts and 339 DS divisions, original Sinhala/Tamil/English
names, Survey Department of Sri Lanka / OCHA HDX COD-AB v03. Boundary survey
date 2 August 2022, validity 16 August 2022; CC BY 3.0 IGO. The catalogue and
NOTICE link source/licence. Later changes may be missing (current counts can
differ). No parcel accuracy or abrupt safe edge is claimed.

About 95 KB of name/index data loads initially. Exact, unsimplified geometries
are sharded by district (largest ~3.7 MB) and load only on GPS use. An accuracy
circle intersects bounding boxes locally, then Polygon/MultiPolygon membership
and hole/edge checks run in the browser. GPS accuracy worse than 1.5 km requires
manual search. A 30 m conservative edge buffer requests manual confirmation for
multiple candidates. No nearest-DS fallback is used. This metric is solely for
administrative matching, never hydrologic routing.

Coordinates never enter request URLs, storage, console, telemetry, analytics or
source queries. District shard filenames may indicate a coarse area to the
same-origin host as an ordinary asset request. Map links disclose that external
providers receive normal network information (such as IP); no coordinates are
added. No map embeds or analytics scripts are included. CSP blocks scripts from
external origins; existing Cloudflare analytics injection may consequently
produce an already-known blocked-script message on the live domain. Do not
weaken CSP or change Cloudflare settings to silence it.

## Language and safety limits

The interface and core safety states are available in Sinhala, Tamil and
English. They are non-official translations. Original multilingual official
bulletins remain one tap away. Independent native-speaker safety review is
pending and is disclosed. The app does not issue autonomous evacuation orders;
it points to official instructions and DMC's verified disaster hotline 117.

No validated local flood-depth, arrival-time, safe-route, tide-boundary,
satellite interpretation or reservoir cascade model is provided. Tabbowa is on
Nanneri Oya, Inginimitiya on Mee Oya; they are not implemented as a serial cascade.
Reservoir/river maps open the official Irrigation dashboards in a new tab, so
the core warning interface is never blocked on a map.

## Verification

`node --test tests/floodlens/safety.test.mjs`

For browser checks, install/use Playwright, then:

`PLAYWRIGHT_PATH=/absolute/path/to/playwright/index.mjs CHROME_PATH=/absolute/path/to/Chrome node tests/floodlens/browser.mjs`

`BASE_URL=https://openatg.com` runs the same browser checks against production;
synthetic states are injected by Playwright routing only, never product query
parameters or production fixtures. Generated screenshots/results are ignored
under `artifacts/floodlens/`. Original local OpenATG checkout stays untouched.

## Rollback

Revert the single FloodLens release commit (normal git revert; never reset or
force-push) and push to `main`. This removes only FloodLens, its homepage notice,
and read-only source checker while preserving other projects. Verify the Pages
build and existing home/store/signal routes after any rollback.
