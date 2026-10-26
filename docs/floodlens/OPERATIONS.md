# OpenATG FloodLens

Public route: `https://openatg.com/floodlens/`. Existing deployment route: GitHub
Pages, `UNIS25/openatg-site`, `main`, repository root, behind existing Cloudflare.
No framework, backend, external font, runtime map library or new credential.

## Data contract and release scope

`floodlens/data/reviewed.json` contains manually reviewed, selected official
bulletins, eleven dated station observations and two dated reservoir fallback observations.
It is not complete national alert or gauge coverage. Every warning has original
URL, issue time, expiry, scope, authority, SHA-256 and explicit DS-code mapping.
The rainfall advisory's document issue time (03:00 SLST) is kept separately from
its DMC listing time (03:30). All timestamps include time-zone offsets.

The current 26 October river PDF was issued at 15:30 SLST; its selected measurements
are at 15:00. The superseded 12:30 report and eight previous readings remain in
provenance. Source remarks are station classifications, not area predictions.
All eleven selected gauges use metres. Nagalagam Street is deliberately not
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

## Reservoir directory and client compatibility

`reservoirs.json` adds all 74 records from the verified CSV capture: 55 have the
26 October date, 14 have older dates and 5 contain invalid source dates. The five
invalid dates are null/unknown, never the retrieval date. Missing spill discharge
and source spreadsheet errors also remain null. Units and dates are preserved.
The parser rejects unexpected schema/numeric formats; its tests check missing,
zero, invalid and dated values. This is source coverage, not all Sri Lanka dams.
National observations are collapsed by default and never labeled as local to
the selected DS. The directory loads when opened and is searchable across all
74 records; six display initially, with a show-all option.

The private location map uses the licensed local boundary data. Optional
third-party street tiles require consent as described below. It depicts administrative areas, never a hazard extent.
The original Tamil Ratnapura district name is retained in the catalogue while
a curated display spelling corrects its truncated source label.

All executable/style assets carry one release version in their URLs. Snapshot
`minClientVersion` and explicit supported-severity checks reject incompatible
future data in an already-open client, remove partial warning cards, request a
page reload, and retain the official DMC link. Overview severity is derived from
the actual source levels, not a fixed range string. Older tabs opened before
the compatibility guard was introduced require a one-time reload.

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

The user explicitly approved a separate reservoir observation publisher with
job-level `contents: write` and `pages: write` on 26 October 2026.
`.github/workflows/floodlens-observation-update.yml` runs at minute 37 hourly
and on manual dispatch, using the ephemeral `GITHUB_TOKEN`. Its only permitted
changed/staged/committed path is `floodlens/data/reservoirs.json`. Actual token
permissions are repository-wide; the path restriction is a code safeguard.
The publisher validates exact column names/units, all 74 reviewed identities,
number bounds, dates (no future or regressed dates), and unknown fields. It
makes a normal non-force push, explicitly requests the existing Pages build,
checks the exact commit's successful build, and attempts a public file hash check.
Cloudflare rejects default Python requests with HTTP 403 / error 1010. The job
respects this rejection, records a visible warning and a blocked edge check,
and never claims a public hash match in that case. Separate real-browser
verification confirmed the first published data. No user-agent disguise,
challenge bypass or security configuration change is used.
Concurrent runs are serialized. An advancing main aborts the push; the next run
starts fresh. A fetch/validation failure preserves prior readings and dates,
publishes failure metadata, and fails the workflow visibly. A failed build, a public data mismatch or an unclassified verification error
also fails visibly; no successful build is inferred from a commit. An explicit
401/403 edge denial is a warning distinct from confirmed Pages publication.

The job uses the existing free standard public-repository runner, no artifact
or cache storage and no permanent credential. Repository defaults, security,
domain and Pages configuration are unchanged. Raw CSV is temporary on the
runner; its hash, validated records, provenance and each status persist in the
data commit and run log. The UI displays source-check time/failure, warns when
no check within two hours is confirmed, and labels every observation date.

New/changed warning interpretation remains review-gated. Source-check run logs
include raw official document links and changed hashes as a concrete review
queue. Automatic comparison of actual issue times in new PDF layouts is not
validated, so no automatic newer-bulletin banner or severity is inferred from
listing timestamps. The warning section prominently discloses that hourly
checks do not update assessments and newer official bulletins may await review.

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

About 95 KB of name/index data loads when location matching or manual search
is requested. A 246 KB display basemap loads for the map. Exact, unsimplified
geometries are sharded by district (largest ~3.7 MB) for location matching. An accuracy
circle intersects bounding boxes locally, then Polygon/MultiPolygon membership
and hole/edge checks run in the browser. GPS accuracy from 1.5–10 km retains all intersecting warning candidates with
explicit uncertainty and an Improve location action. Above 10 km the user must
correct the pin before matching. A 30 m conservative administrative edge buffer
retains warnings from all plausible divisions; it is not a hazard boundary. No nearest-DS fallback is used. This metric is solely for
administrative matching, never hydrologic routing.

Exact coordinates never enter request URLs, storage, console, telemetry, analytics
or source queries. The private map uses bundled data. Optional OpenStreetMap tiles
are off until explicit per-page consent naming the provider and disclosing the
viewed area and IP/network information. Tile indices reveal a map area; therefore
the street map does not promise that the viewed location stays private. District shard filenames may indicate a coarse area to the
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

## 14:45 bulletin update

The source recheck found the newer 26 October 14:45 NBRI bulletin. PDF pages 1–3
were visually verified before replacing the 09:00 snapshot. New ID:
`LEWM-26-10-2026-1445-00`, valid until 27 October 14:45 SLST. The six Red DS areas
are represented by exact codes, with original instructions linked. Selected
division severity is explicit; no blanket district severity or autonomous
evacuation decision is generated. Previous source hashes remain in provenance.

## Rollback

For a faulty update, revert that release commit with a normal git revert and
push to `main`; never reset or force-push. To remove FloodLens entirely, revert
its release commits in reverse order through `e11350e`, preserving unrelated
commits. This removes FloodLens, its homepage notice, and the read-only source
checker. Verify the Pages build and existing home/store/signal routes after
any rollback. Never restore a superseded warning as a current warning without
rechecking its validity and the latest official bulletin.

## Location-first interface, release 20261026-8

Screen 1 contains language choice only. Screen 2 requests GPS through an explicit
button; manual map placement is a fallback. Screen 3 centers the real obtained
GPS position, shows its stated accuracy, and presents one concise result with
at most three short facts. Bulletins, observations, source review history and
limitations are behind Details. No default city or administrative centroid is
used as the user's location. Area search only changes the manual map view;
users must explicitly place/confirm a pin. Manual pin accuracy is unknown.
Approximate GPS and boundary overlap preserve relevant Red, Amber and Yellow
official warnings with “may cover” language. Rain-only coverage explicitly shows
a broad Heavy-rain advisory, not local inundation. Unlisted areas remain unassessed.
Manual placement uses a fixed centre crosshair, one-finger pan, two-finger pinch,
keyboard controls, and a separate large confirmation button. Search does not
submit a pin; a map interaction followed by confirmation is required.

The on-device administrative basemap is a 246 KB display-only simplification
of the licensed 2022 boundaries. Exact unsimplified district shards still perform
matching. Pan/pinch coordinates use the SVG transform. Both layers use Web
Mercator for alignment. The default map has no external tiles or geocoder.
An optional street map uses standard OpenStreetMap browser tiles only after
consent; attribution stays visible. Native HTTP cache rules and origin Referer
are retained. Only the visible viewport loads; there is no prefetch, bulk download
or offline tile cache. Tile failure returns to the private map. Automated tests
mock these tiles and do not send headless tile requests. Provider service is
best-effort, with no SLA: https://operations.osmfoundation.org/policies/tiles/ . The map can
fail without blocking the text result or official action link.

43 official reservoir points have unique exact-name matches to directory
records, retaining source Tank_Code. Two ambiguous Mahadivul Wewa points were
excluded, as were unmatched spellings; no fuzzy join is used. This is partial
mapped coverage. Marker popups show dated effective storage and expressly do
not establish upstream connection or local danger. The source is Irrigation
Department Scheme_Data_2 layer 3; full provenance and source hash are bundled
in `reservoir-locations.json`. No river network or directed routing is inferred.

Build-time tools: `build_map_overview.py`, `build_reservoir_points.py`. The
observation updater retains its existing one-file publication restriction.
The future community-input boundary is documented in COMMUNITY_REPORTS.md;
no Telegram, Grok or social-media ingestion has been connected.

Release 8 regression cases: Ratnapura (80.399, 6.682) and Pelmadulla
(80.529, 6.628): Red landslide; Horana (80.062, 6.715): Amber flood;
Puttalam (79.828, 8.036): Amber heavy rain. A 3 km Ratnapura accuracy circle
includes Ratnapura, Pelmadulla and Elapatha and retains Red with uncertainty.
Actual administrative-edge geometry is unit-tested; synthetic boundary browser
fixtures separately test Red and Amber retention. No river-channel identity is
inferred from an administrative edge. These do not reproduce the user's
unspecified failed pin. Satellite and tide feeds remain unconnected in this release.

Client version 5 adds explicit reviewed Amber severity fields for the two flood
bulletins and rain advisory. Unsupported or missing non-landslide severity
requires an update instead of rendering an assumed Amber badge. Published
snapshot minClientVersion 5 also causes already-open older clients to request
a reload. Raw source hashes, issue times, validity and reviewed geography remain
unchanged. Multiple concurrent landslide bulletins are ranked by the highest
applicable reviewed DS level, never by source order.

## 15:30 river report review, release 20261026-9

Original PDF SHA-256: `68f6608b19221bc5b16569b128f59a717163ad27a8bad111760b3a3cfefb60fd`.
The 14:00 and 15:00 columns were independently read from the rendered original.
All eight existing stations are retained. Holombuwa is Minor Flood/Falling;
Rathnapura is Minor Flood/Rising. Kithulgala and Nawalapitiya have source
classification Normal with blank trend, preserved as null rather than inferred.
Panadugama, Urawa and Peradeniya are added as Alert/Rising. This is eleven
selected stations, including all nine non-normal rows in this particular report,
not continuous or comprehensive national coverage. The 6-hour rainfall column
is not ingested or mixed with earlier 3-hour figures.

Existing warning objects, severities, scope, issue/expiry times and reservoir
data/workflows are unchanged. DMC flood/landslide/weather listing snapshots and
unchanged warning PDF hashes are included in the review provenance. General
weather forecasts issued 14:00 and 16:00 were reviewed; they are not a cancellation
or a local-flood replacement for the 03:00 Amber advisory.

Client version 6 adds only Normal and Minor Flood/Falling station labels in all
three languages and rejects unknown future station classifications. The snapshot
requires version 6 so older open tabs request a reload instead of showing raw
classification keys. Normal remains a station classification, never an all-clear.
