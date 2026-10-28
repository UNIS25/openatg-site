# OpenATG FloodLens

Latest reviewed river update: the 28 October 12:30 SLST report contains noon
observations and the previous 11:00 comparison. The same 22 selected metre
gauges include three Minor Flood, six Alert and thirteen Normal classifications.
Galgamuwa and Thanthirimale have new numeric readings; their earlier missing
readings remain in provenance. Blank official trends are not inferred. The
three-hour rainfall totals ending noon remain separate from level data.
Lightning Bulletin 05 and Gin No. 02 are now reviewed with their exact limited
scope and original validity. No warning expiry establishes an all-clear.
The recovery section below records the reviewed originals and checks.

Public route: `https://openatg.com/ark/`. The legacy `/floodlens/` entry redirects to `/ark/`; data/assets and automated publisher paths remain under `/floodlens/`. Existing deployment route: GitHub
Pages, `UNIS25/openatg-site`, `main`, repository root, behind existing Cloudflare.
No framework, backend, external font, runtime map library or new credential.

## Data contract and release scope

`floodlens/data/reviewed.json` contains manually reviewed, selected official
bulletins, eighteen dated station observations and two dated reservoir fallback observations.
It is not complete national alert or gauge coverage. Every warning has original
URL, issue time, expiry, scope, authority, SHA-256 and explicit DS-code mapping.
The rainfall advisory's document issue time (03:00 SLST) is kept separately from
its DMC listing time (03:30). All timestamps include time-zone offsets.

The current river PDF was issued at 00:30 SLST on 27 October; its selected
measurements are at 00:00, with a separate 23:00 previous column. Superseded
reports and readings remain in provenance. Eighteen selected stations include
four Minor Flood and ten Alert classifications, plus four Normal readings.
Dunamale is now Minor Flood. Hanwella, Putupaula, Baddegama and Thalgahagoda are
newly included. Thalgahagoda's blank trend is null, not inferred as steady.
Missing Horowpothana, Weraganthota, Thanthirimale and Galgamuwa readings are not
converted to Normal. The 15-hour rainfall column is not ingested as level data.
Station classifications do not cancel official area warnings. The river-only
review time is separate from the unchanged official-warning review time.
All eighteen selected gauges use metres. Nagalagam Street is deliberately not
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

The location map uses licensed local boundaries and first-party OSM-derived road cells. No third-party map tiles load at runtime. It depicts administrative areas, never a hazard extent.
The original Tamil Ratnapura district name is retained in the catalogue while
a curated display spelling corrects its truncated source label.

All executable/style assets carry one release version in their URLs. Snapshot
`minClientVersion` and explicit supported-severity checks reject incompatible
future data in an already-open client, remove partial warning cards, request a
page reload, and retain the official DMC link. Overview severity is derived from
the actual source levels, not a fixed range string. Older tabs opened before
the compatibility guard was introduced require a one-time reload.

## Deployed source checks and permission boundary

`.github/workflows/floodlens-source-check.yml` runs at minutes 17 and 47 each hour and
on manual dispatch. This is a best-effort GitHub Actions schedule; it can be
delayed or disabled by GitHub for inactivity. It uses the existing public
repository's free standard Ubuntu runner, `contents: read` and no stored token.
It checks the reviewed source documents and three allowlisted official lists,
then builds a deterministic read-only review queue. It verifies file shape,
records hashes, and writes a public job summary and run log. No Actions artifacts/cache storage
is allocated. Raw retrievals are temporary in the runner; source hashes and
parsed provenance persist in the run log. Fetch failure fails the job visibly.

This workflow does **not** update the public warning snapshot. The page links
to its run history and says automatic bulletin publishing is not enabled.
The page fetches the published snapshot every five minutes while visible and
updates age/expiry each minute. It sends no location and does not claim anyone
is continuously monitoring the user.

The user approved the original reservoir publisher on 26 October and the bounded
forecast/cloud/tide extension on 27 October 2026. The same job-level ephemeral
`contents: write` and `pages: write` permissions remain; repository defaults and
security settings are unchanged. Actual token scope is repository-wide. The
following exact **ten paths** are enforced by code at the worktree, staged and
commit boundaries (no wildcards):

- `floodlens/data/reservoirs.json`
- `floodlens/data/forecast/forecast.json`
- `floodlens/data/forecast/provenance.json`
- `floodlens/data/clouds/clouds.json`
- `floodlens/data/clouds/provenance.json`
- `floodlens/data/clouds/frame-0.png`
- `floodlens/data/clouds/frame-1.png`
- `floodlens/data/clouds/frame-2.png`
- `floodlens/data/tides/colombo.json`
- `floodlens/data/tides/validation.json`

`.github/workflows/floodlens-observation-update.yml` checks at minutes 7 and 37,
plus manual dispatch. The optional manual `force_refresh` input performs a real
forecast re-fetch and tide recalculation through the same gates; it never just
rewrites freshness timestamps. GitHub schedules are best-effort and may be delayed. The
existing public repository's standard Ubuntu runner is used, with no new keys,
paid service, persistent credentials, Actions artifacts or cache allocation.
Pinned decoders are installed on the temporary runner. Checkout credentials
are not persisted. Source constants, scripts, warnings, news, cyclone bulletins,
translations and map files are excluded from publication.

ECMWF candidates use anonymous bounded GRIB byte ranges from data.ecmwf.int.
At most four already-issued 6-hour run slots are checked. Missing (404) slots
are not treated as data; an access denial stops that source. A newer run must
pass same-run, exact grid, physical-unit, finite-pixel, provenance/hash and
complete-upcoming-24-hour checks at all 198 Sri Lanka grid points. Missing
intervals never become zero rain. Unchanged runs retain original capture times.

NASA GIBS uses advertised Himawari timestamps, four fixed country tiles per
frame and three distinct validated frames. Masks/coverage, dimensions, hashes,
capture times and the three-hour expiry are checked. Schema 2 uses three fixed
image slots. Both clients fetch and SHA-256 verify bytes before using a data-URI
image. A cross-version cache mismatch displays unavailable imagery rather than
attaching the new timestamp to old pixels. Old clients reject schema 2; older
timestamped images remain for already-open legacy views. No GPS is transmitted.

Colombo predictions use the existing immutable CC BY 4.0 harmonic record and
MIT engine, with a rolling 48-hour interval. They refresh when fewer than 42
hours remain, not by relabelling old predictions as new observations. Each new
snapshot is independently compared with uptide 1.2 on 36 shared constituents
at 2,881 one-minute samples. Quadratic refinement stays within adjacent samples;
publication requires maximum level difference <= 0.02 m and extrema difference
<= 5 minutes. The first rolling trial showed why the old five-minute sampled
extrema were not a three-minute precision test: refined extrema differed by up
to about 4.5 minutes while height differences stayed below 0.014 m. These bounds
are numerical cross-checks of differing astronomical formulations, not observed
accuracy, storm surge, navigation, or a Puttalam/lagoon transfer model. All 50
licensed constituents are retained in displayed predictions.

Each source group validates before any published file is changed. Failed weather
or tide candidates preserve the prior group and all original source times.
Reservoir failures preserve prior readings and dates, with explicit failure
metadata as before. Successful groups may publish while a failed group remains
old; the job then fails visibly and the client retains honest age/expiry states.
No failed check bumps an observation, model-run, capture or validity timestamp.

Only pre-existing regular non-executable files are eligible. Unknown paths,
symlinks, untracked/staged surprises and regressed dates are rejected. Concurrent
runs are serialized. An advancing main aborts the normal push; no force push is
used. The publisher requests the existing Pages build and waits for the exact
commit to build. It checks public hashes when permitted. A 401/403 edge rejection
stops further probes and is reported separately; it is never bypassed or claimed
as a hash match. A separate real browser verifies that case. No security or
Cloudflare setting is changed.

New/changed warning interpretation remains review-gated. Source-check run logs
include structured document identities, listing timestamps, original links,
changed hashes and incomplete/failure states as a concrete review queue.
Automatic extraction of actual issue times in new PDF layouts is not validated,
so no automatic newer-bulletin banner or severity is inferred from listing timestamps. The warning section prominently discloses that 30-minute
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
reproduction aid, not an updater. It must never be scheduled. The source checker is now strictly read-only: its former one-time
`--initial-capture` write mode has been removed. Reviewers edit published data
only through the separate reviewed release procedure.

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
or source queries. The map uses bundled boundaries and first-party OSM-derived
road cells. District and 0.1-degree road-cell filenames disclose a coarse viewed
area to the same-origin host/CDN, which also receives normal network metadata.
No external tile or geocoding provider receives the map viewport. See
LOCAL_ROAD_MAP.md for the build-time source, attribution and ODbL derived database. Map links disclose that external
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
submit a pin. Since release 15, search centres the visible map approximately and the user can explicitly confirm that centre without a mandatory drag. Manual accuracy remains unknown.

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

## Current lightning advisory, release 20261026-10

Bulletin 03 / LLA/26/10/26/01, Amber, issued 26 October 11:30 SLST and valid
until 23:00 SLST the same day. Original two-page source visually verified, hash
`e5a055762cc5fff61fe0ae610ce6241395f811d76ae020b955d21c98f707ac5c`.
Text scope is North-central Province (Anuradhapura LK71 and Polonnaruwa LK72),
Trincomalee LK53 and Batticaloa LK51. Map illustration red/orange colours are
not converted into different warning levels or a nationwide advisory.

Lightning is a separate explicit weather kind. It cannot imply floodwater,
percentage probability, or a safe location outside the named scope. The compact
result preserves Red landslide/flood warnings before lightning, then rain;
all relevant originals remain under Details. Expiry is exact and never an
all-clear. The primary lightning result links the original, shows its expiry
and a short shelter/trees instruction grounded in official guidance.

The current original has Sinhala and English. Tamil terminology and generic
action wording were visually checked against the 25 October official Tamil
lightning bulletin. That prior bulletin is a wording reference only; its scope,
time and map are not current evidence. The translated current summary remains
non-official, and the existing native-speaker review limitation remains visible.

Source checks now request and record 100 entries per DMC list to avoid relying
on only the first ten. Manual review of those lists found no replacement for
the current Kalu/Mahaweli or 14:45 landslide warnings. Client version 7 and
minClientVersion 7 guard older clients against an unknown hazard kind. Slow
initial bulletin loading stays in Checking rather than briefly presenting a
completed unknown assessment. No reservoir workflow permissions changed.


## 18:00 landslide replacement, same release 20261026-10

The final pre-publication source check discovered bulletin
`LEWM-26-10-2026-1800-33`, issued 26 October 18:00 SLST, valid through
27 October 18:00. Original SHA-256
`35e492bf3495070ff0e2fcfaf161528ebf942bb302fffbaa66f78949fdec716f`.
Pages 1–4 were visually inspected; page 5 is blank. The original explicitly
identifies the previous 14:45 message. Its full snapshot remains in provenance.

The replacement lists 71 unique DS divisions: 28 Yellow, 33 Amber and 10 Red.
New Red areas are Bulathsinhala, Dodangoda, Ambagamuwa Korale and Norwood;
the six Ratnapura Red divisions remain. All named divisions resolve to exact
existing district-scoped codes, including Kotmale East/West and Thalawakele.
Spelling aliases are recorded explicitly in provenance, with no fuzzy matching.
Surrounding-area and 2022-boundary limitations remain visible. The generic
existing translations are preserved with the obsolete six-division sentence
removed. Flood, lightning, rainfall, river and reservoir records are unchanged.

Regression checks include the four new Red divisions, Attanagalla Amber,
Pitabeddara Yellow, all 71 unique codes, exact expiry and all previous location,
privacy, stale-data and failure cases. No new UI kind or permission is needed.


## Deterministic discovery and read-only review queue

`discover_bulletins.py` runs inside the existing minute-17 source-check workflow.
Permissions remain `contents: read`; checkout does not retain credentials.
No public JSON, warning interpretation, repository commit or deployment is
written by the checker. The reservoir publisher's sole writable data path and
its permissions remain unchanged. The existing Details link opens workflow
run history; this milestone does not claim automatic public warning updates.

Each of the flood, landslide and weather lists requests 100 rows per page.
The scanner continues until it crosses a seven-day overlap window or exhausts
the list, with a maximum of five pages per list. The window extends earlier
when needed to cover the issue date of any still-active reviewed warning,
plus one day. All currently reviewed source URLs are checked even if absent
from the scanned rows. A missing link is not a cancellation. An absent Next
link on a full recent page, repeated page, unexpected pagination link, changed
row/date format, out-of-order listing, page budget or fetch failure makes
coverage explicitly incomplete. Unknown formats fail closed.

This is **listing-window coverage**, not proof of all active national warnings.
Unreviewed PDF validity remains unknown; an older listing date cannot establish
expiry. Original URLs remain available for manual review. A sufficiently old,
long-duration unreviewed notice could be outside the bounded window. No all-clear
or current-warning conclusion is inferred from an empty or incomplete queue.

Document identity is the canonical allowlisted DMC PDF URL plus captured byte
hash. The same update number/title can identify multiple documents; neither
is a deduplication key. Repeated URL rows retain all listing aliases. Same-URL
changed bytes require review even if the bytes appeared in historical provenance.
The JSON queue records whether a listing is later than the reviewed listing
time for that stream; earlier unseen documents still require review. The
reviewed snapshot hash and workflow commit identify the comparison baseline.
Listing time is stored separately from verified issue and expiry times; only
an unchanged reviewed source retains those verified times. Titles mentioning
cancellation, withdrawal, replacement or revision are review-priority hints,
never an automatic relationship, cancellation or supersession. Severity,
validity and relationships of new documents stay unreviewed/null.

To limit repeated load on official sources, each run hashes at most 24 additional
PDFs with three concurrent requests. Current reviewed source captures are reused.
All candidate links remain in the queue when this budget is reached, explicitly
`awaiting-document-hash`; they are not declared checked or expired. Fetches are
TLS-verified, size/time bounded, and restricted to official report paths. PDF
bytes are hashed and retained temporarily, never executed or interpreted by an
LLM. Listing text is parsed as data and escaped in Markdown summaries.

`report.json` includes the complete queue, listing-page provenance, document
hashes, scan limits and failures. `review-queue.json` and `summary.md` are local
run outputs under `artifacts/floodlens/source-check/`. The full report persists
in the public Actions run log; the summary shows up to 30 entries. Raw files
are temporary on hosted runners; no Actions artifact/cache storage is added.
Technical source failures or incomplete listing coverage fail the job visibly.
Pending human reviews or deliberately deferred hashes are separately counted;
a successful job does not mean reviews are complete or warnings are current.

Reviewers open original PDFs, verify actual issue/expiry, geography, severity,
cancellation/supersession and language before modifying the public snapshot.
A future automatic public status file would require a separately approved
publisher allowlist change. This release adds no such path, token scope,
credential, paid service or automated warning publication.


## Kelani / Attanagalu 18:00 warnings and 18:30 river report

Both new Amber Number 01 flood warnings are issued 26 October 18:00 SLST,
valid through 27 October 18:00. Their complete two-page originals were visually
reviewed in all supplied languages; the simple interface still links originals
and labels summaries non-official.

Kelani applies to low valley portions of seven named divisions: Ruwanwella,
Seethawaka, Dompe, Dehiowita, Eheliyagoda, Yatiyantota and Bulathkohupitiya.
The conditional downstream-of-Hanwella statement is retained in the summary,
without inventing additional DS coverage. Attanagalu applies to low Attanagalu
and Uruwal valley portions of Divulapitiya, Mirigama, Attanagalla, Mahara,
Gampaha, Minuwangoda, Ja-Ela, Katana and Wattala. District-scoped codes and
spelling aliases are explicit. Basnagoda releases are source context, not a
new live gate feed or a travel-time model. Existing warning objects are unchanged.

River original SHA-256:
`ff8ad0720346edf8b15827a9a843be66d2fe4201c6dbf6596cccaa9f2dbddc9e`.
The table is issued at 18:30, listed at 18:00, with 17:00 and 18:00 columns.
All eleven previously selected stations remain; Glencourse and Thawalama are
added as Alert/Rising. The thirteen selections include all ten non-normal
rows: two Minor Flood and eight Alert. Kithulgala, Nawalapitiya and Urawa are
Normal with blank/null trends. Normal never indicates household safety or
withdraws an active warning. All selected units are metres. The nine-hour
rainfall column is not ingested or mixed with earlier periods.

The current client already supports these warning kinds, status labels and
units. No new hazard calculation, UI screen, translation key, client contract,
publisher path or permission is introduced. Regression checks cover all sixteen
new DS matches, conditional-scope exclusion, precise expiry, all thirteen
readings, three-language display and real polygon-interior pins.


## Dated location context and 30-minute checks, release 20261026-11

The existing language/location/warning flow now adds separate dated evidence
rows. Current official warning, actions, GPS uncertainty and client refresh are
preserved. Copernicus satellite and NASA rainfall snapshots cover only two
bounded regions: parts of Puttalam/Mee Oya and Ratnapura. Locations elsewhere
explicitly lack this captured coverage; no sample or nearest raster is substituted.
The 23 October satellite overlay is off by default and is labelled historical
when enabled. Its flood pixels, reference water and masks are observations,
not present-day inundation or a validated local forecast. NASA reads through
26 October 13:00 UTC were attempted every half hour at 26 fixed grid centres;
only 00:00 and 00:30 yielded valid estimates. Later failures remain recorded.
No rainfall accumulation, risk percentage or future household flood estimate is
published. Satellite/NASA publication is static and this limitation is visible.

Sources and SHA-256 evidence are in `floodlens/data/context/provenance.json`.
The public data carries the original sensing/estimate periods, processing and
retrieval times. GFM native 20 m categorical cells retain exact lookup geometry;
newer NoData cannot erase older observations. Ratnapura's unreadable uncertainty
raster fails closed. The attributed GFM derived subset and NASA estimates were
reviewed against original rasters/metadata and tested locally before publication.
Raw arrays/rasters remain in the original isolated checkout's ignored artifacts.
The additional projection library is locally bundled Proj4js 2.22.0 under MIT.
No browser coordinates are sent to these data providers. No NDRSC records,
private reports, shelter-opening assertions or routing are published.

Reservoir CSV Remarks are preserved as plain text. The parser accepts only
complete reviewed `GO=discharge(opening"@count,...)` notation (or an explicit
single-quote feet unit), matching the separate cusecs column. Unknown/malformed
syntax stays unparsed; `SD` irrigation outlets are separate and never counted as
spill gates. Tabbowa's dated official row reports four gates at 24 in (2 ft),
two at 12 in (1 ft), 2,200 cusecs. Inginimitiya reports two at 12 in (1 ft),
1,000 cusecs. Rajangana's same supported grammar reports 10 × 4 ft, 6 × 3 ft,
2 × 2 ft, 14,963 cusecs. These are dated configurations with **no published
operation time**, not real-time gate states. Conflicting news reports were not
substituted. New optional record fields remain compatible with older clients.

The user requested 30-minute updates. Source discovery is now scheduled at
minutes 17/47; reservoir publication at 7/37. GitHub schedules are best effort.
No permissions, concurrency settings or one-file publishing safeguard changed:
only `floodlens/data/reservoirs.json` can be published by the observation job.
Source discovery still cannot automatically interpret or publish warnings.
The page reads published warning/reservoir data every five minutes while visible.
Static NASA/GFM files are not added to the automated publisher path allowlist.

Verified emergency links under observation Details are DMC 117, Suwa Seriya 1990
and Police 119, with primary DMC, Suwa Seriya and TRCSL source links. They require
a user's tap; no automated calls or dispatch promises. The UNICEF infographic's
conflicting numbers were not copied. Source check date: 26 October 2026.

## Current-answer correction — release 20261026-12

The public Puttalam phone view was reproduced: nearest-only selection omitted
Inginimitiya and the main answer contained old satellite/NASA rows. The current
answer now contains only dated reservoir context below independent official
warnings. Historical satellite/rainfall observations remain public under an
explicit collapsed Historical evidence action, downloaded only on request.
Closing history clears the old map overlay. The 23 October satellite capture
and 26 October 00:30 UTC rainfall estimate cannot enter the current assessment.
This is a source-specific separation: warning validity remains governed by
bulletin expiry; daily reservoir reports turn old at the next Sri Lanka date;
untimed daily gate records never claim current gate operation; historical
snapshots remain historical regardless of recent download or source-check time.

Exact Puttalam district matches (including plausible boundary candidates) show
both Tabbowa R13206 and Inginimitiya R13101. The official Irrigation GIS
Scheme_Data_2 FeatureServer layer 10 was queried for those exact codes on
26 October and returned `Rivr_Basin: Mi Oya` for both. This is selected district
context, not a complete basin inventory or a claim that either reservoir reaches
the selected pin. Elsewhere the existing nearest-mapped relationship remains.
No nearest reservoir is used to infer basin membership.

The 26 October official daily record remains six Tabbowa spill gates, 2,200
cusecs; two Inginimitiya gates, 1,000 cusecs. Exact openings and raw Remarks are
under Details and retain missing operation time. Daily Mirror's original
26 October 15:40 SLST article was independently read and reports eight Tabbowa
gates (4×2ft + 4×1ft), 2,640 cusecs:
https://www.dailymirror.lk/breaking-news/Thabbowa-Reservoir-releases-2-640-cusecs-into-Mee-Oya/108-353422
The discrepancy is separately attributed, is not an official update, and cannot
replace the daily row. The disclosure is bound to that exact dated six-gate row,
so it cannot silently carry forward onto a different subsequent official report.
Other media also disagree; current gate operation is not independently confirmed.

Tide-Forecast's homepage was checked and works, but does not directly provide a
local tide answer. Its generic search link was removed from the product rather
than presented as a connected tide service. Tide times and recession estimates
remain unavailable. No restricted scraper or embedding was introduced.

The requested official regional cyclone reference now links to IMD's sea-area
bulletin (https://mausam.imd.gov.in/Forecast/seaarea_bulletin_new.php?id=0).
The original was checked on 26 October: validity 09–21 UTC, issue 18:00 IST,
mentioning Arnab over the Bay of Bengal. The app links the live original without
copying an enduring storm/track assertion or implying local impact at a pin.

No observation publisher path, workflow permission, source scheduler, reviewed
warning data, credentials or automatic warning interpretation changed. The
separate ECMWF local forecast proof is preserved outside this release.

## Ark and regional forecast — release 20261026-13

User-selected public name: Ark by OpenATG. The main homepage link, app header,
metadata in all three languages, and short Noah's Ark shelter/care note use Ark.
`/floodlens/` and all existing data/workflow paths remain intact. `/ark/` is a
simple tested redirect to that route. No new domain or hosting was created.

A real ECMWF IFS 26 October 06:00 UTC forecast is now bundled as a manually
reviewed regional snapshot. See ECMWF_FORECAST_PROOF.md for original GRIB
metadata, raw-range hashes, licence, units, grid matching and actual examples.
The country-region subset is about 96 KB for 198 published 0.25° grid centres
and nine three-hour intervals. It shows an explicit complete 24-hour window
only when eight future consecutive intervals are present. That window begins
at the next available model interval boundary, not an interpolated now+24h
promise. Three-hour rain playback and instantaneous 10 m wind are optional.
Wind range in the summary is the range at the eight forecast-valid times, not
continuous maximum or gusts. Missing values, mixed schemas, invalid units,
future runs and outdated horizons fail safely. Run age >18 hours is explicitly
older; an expired horizon has no upcoming total. Download/rebuild time never
changes model-run age or original data retrieval time.

ECMWF commercial redistribution is permitted under CC BY 4.0 and additional
attribution terms. Source credit, copyright, licence, modifications and liability
wording are retained. No paid service, account, persistent token or security
change was used. Forecast data publication was specifically authorized after
validation; automatic publication remains unauthorized for the new data paths.
Existing source/observation workflows and one-path reservoir guard are unchanged.

A collapsed 'Water is already here' action offers existing official flood safety
guidance and user-tapped 117/1990/119 phone links. It records no report and does
not change hazard severity or assert inundation. Nearby shelters and routes
remain unverified. Original agency guidance is linked. Interface translations
remain non-official and native-speaker review is pending.

Puttalam Details additionally links to the reviewed public Google Flood Hub
Puttalam place view (a fixed public town URL, not the visitor's GPS). It is
labelled as an external regional model; its displayed likelihood is not copied
into Ark and no issue/expiry time is invented. Primary Google support describes
20 km flash-flood weather modelling and explicitly notes limitations around
man-made causes/dam operations. It does not replace official warnings, the
reservoir daily record or parcel-specific hydraulic evidence.


## Simplified public result — release 20261026-15

The header reads Ark by OpenATG, with the existing mark beside OpenATG. The
result keeps the official status and action, one location map, two 24-hour weather
numbers, optional three-hour playback, and compact reservoir records. Technical
grid/coverage metadata, raw records and full sources remain behind disclosures.
The 24-hour rainfall sum and playback now use exactly the same eight native
three-hour intervals. The earlier interval outside that window is not the default
playback frame. Expired forecast horizons have no playback or current total.

The earlier historical-evidence UI described in releases 12/13 is removed from
the public result at the user's request. No public control, old flood overlay,
satellite/NASA raster request or historical summary remains in that result.
Scientific source files, pixel logic, provenance and tests are preserved; they
are not used to claim current inundation. Official weather and IMD regional
bulletin links remain available, without fabricated current imagery.

The floodwater help question is optional. Advice opens only after the visitor
selects Yes; No/unsure hides it. The answer is not sent, stored or used to change
hazard classification, and resets when the location changes. Disaster help 117
also remains accessible beside the primary result.

No-current-warning wording requires a fresh reviewed snapshot, a resolved
location, no load failure and no expired/unknown locally matching bulletin.
A recently expired local warning remains Information outdated, not an all-clear.
Reservoir gate counts/openings keep the source date, unknown operation time and
source-conflict disclosure; no zero-gate or non-spill value creates a safe state.
No warning/observation data, forecast data, publisher permission or workflow was
changed in this presentation release.


## Canonical Ark and mobile interaction, release 20261026-16

The app HTML now lives at `/ark/`; `/floodlens/` is a styled compatible redirect.
Homepage, canonical metadata and all browser checks use `/ark/`. Runtime data and
assets use absolute `/floodlens/` paths, preserving scheduler/provenance URLs.
No domain, Pages, Cloudflare, CSP or token-permission change was made.

A tiny same-origin bootstrap queues early language taps during module loading.
Preloads reduce module waterfalls. A failed/slow app exposes DMC and 117 links;
it never invents a location. No startup location/data request or local storage.
The formerly unstyled `/ark/` redirect document is removed. Exact DS geometry
is still used for matching; only the bounded, licensed display overview is
rendered. Cached projected rings, viewport culling and animation-frame drawing
keep drag work bounded. Touch pan/pinch stays inside the map; page gestures
outside it remain available. Tests exercise touch movement in all four
directions, pinch, startup delay/failure and explicit manual confirmation.

Nearest mapped reservoir name and straight-line kilometres are calculated from
43 mapped source points. This is not complete national inventory or proof of
upstream influence. Forecast attribution remains available in one compact
disclosure; technical methods, licence, disclaimer and provenance are nested.

The new Gin Ganga Amber No. 01 original (22:30 SLST, 26 October; expiry 22:30,
27 October) was visually reviewed on both pages. It covers low-lying Gin valley
portions of Thawalama LK3118, Nagoda LK3124, Baddegama LK3127 and
Welivitiya-Divithura (catalogue spelling Welivitiya-Divitura) LK3130. It does not
cover every parcel or all Galle. Original hash and selected-source recheck are
preserved in provenance. Existing warnings and station readings are unchanged.

`floodlens/data/reservoir-reports.json` is a separately reviewed media snapshot,
not an automated observation source. Daily Mirror's original 26 October 21:44
SLST article, attributed to Irrigation Director Herath, reports Tabbowa eight
gates (four 2 ft, four 3 ft), 4,400 cusecs, and Inginimitiya four gates (two 2 ft,
two 1 ft), 3,000 cusecs. Actual operation time is unreported. These appear as
attributed media reports, while the differing untimed official daily values
remain in a collapsed comparison. Neither establishes present gate state or
household impact. Publication/review times and captured text hash are retained.
The existing automated publisher still writes only `reservoirs.json`.

Unresolved integrations: no validated, reusable Puttalam tide constants/feed;
Colombo predictions cannot substitute. NASA/NOAA cloud-imagery candidates need
verified Sri Lanka pixel coverage/capture times before embedding; cloud imagery
is not flood extent. No verified current inundation polygon or licensed directed
catchment model was added. These gaps do not block this interface/source release.

## Colombo tide and district news release

The bounded, reviewed Colombo astronomical prediction is displayed directly
below weather. See `COLOMBO_TIDES.md` for exact range, independent numerical
checks, historical harmonics, dataset LAT and limitations. It is never a current
water-level measurement or drainage/recession calculation. Failure/expiry does
not suppress official warnings. No Puttalam substitution is made.

A collapsed **Latest near you** section selects active reviewed government
bulletins for the matched district and the separately reviewed Daily Mirror
Mee Oya reservoir report for Puttalam. Publication and review times stay separate;
media is labeled News outlet and never modifies official hazard classification.
Media is dropped after 48 hours, future dates are rejected, and expired official
bulletins are excluded. There is no Instagram/Facebook feed or private-message
publishing connection; those platforms are not falsely advertised as covered.
The feed is a selected reviewed snapshot, not a complete or real-time news feed.

The detailed map offered on first map use is the normal OpenStreetMap road map,
not satellite imagery. Before any tile request the visitor must accept the
existing area/IP disclosure. Declining leaves the private local map usable.
Consent is per page, not stored, and no external provider request precedes it.
Forecast data now refresh on the visible page's five-minute render cycle, in
addition to the existing official snapshot refresh; this retrieves published
files and does not create an automatic model publisher.

## No-popup road map and plain tide explanation

The earlier external-tile preference is superseded by `LOCAL_ROAD_MAP.md`:
licensed first-party OSM road data is the default, without a popup or any
third-party map request. Only coarse static map-cell requests reach existing
OpenATG hosting; no exact coordinates, storage, new endpoint or permissions.
The simple boundary fallback remains usable. ODbL credit and derived database
are public. No raster tiles were prefetched from the OSM tile server.

The tide panel now explains the practical relationship in plain language:
high tide can slow coastal drainage, falling/low tide can help seaward flow,
but rain, river inflow and blocked drains prevent a guaranteed drainage time.
It retains prediction-not-measurement wording and compact accessible source,
licence and modification credits. The numerical source and validity period
are unchanged. Selected reviewed news remains accurately scoped; no social
platform connection has been added or advertised.

## Recent cloud imagery, release 20261026-19

An optional, collapsed Satellite cloud view now shows three actual JMA
Himawari-9 infrared frames through NASA GIBS, captured at 18:30, 18:40 and
19:00 UTC on 26 October. The advertised 18:50 frame failed retrieval and is
omitted. These are temperature-coloured cloud images, not rain radar or
floodwater. They never alter the official assessment or replace the default
road map. Capture age is explicit; images expire after three hours.

See `CLOUD_IMAGERY.md` for source rights, actual pixel/coverage validation,
provenance, privacy and failure tests. The fixed country crop and local pin
use first-party files only. Publication is manual: no workflow, permission or
automatic publisher path was expanded. This supersedes the earlier statement
that cloud candidates remain unverified, but does not provide a live image feed.

## 00:30 October 27 river review

The original 00:30 SLST report was visually reviewed, with 00:00 observations
and the separate 23:00 previous column retained. Eighteen stations now include
all four Minor Flood and ten Alert rows; four retained stations are Normal.
Dunamale is Minor Flood/Rising. New stations are Hanwella, Putupaula, Baddegama
and Thalgahagoda. Thalgahagoda has a blank trend, preserved as null despite
equal readings. Holombuwa and Peradeniya are Normal station classifications,
not warning cancellations. Missing Horowpothana, Weraganthota, Thanthirimale
and Galgamuwa remain absent; no old Galgamuwa reading is presented as current.
All selected units are metres. The 15-hour rainfall column is not ingested.
Warning objects, translations, review timestamps and reservoir automation
are unchanged; the observation review time and source provenance are separate.

## Optional situation map, release 20261026-20

`/ark/explore/` is a separate regional view linked from the location result.
See [EXPLORE.md](EXPLORE.md) for layer semantics, original cyclone sources,
review deadlines and tests. It does not change the approved reservoir-only
publisher, schedules, token permissions or main location assessment.

## Reviewed overnight weather refresh, 26 October 2026

The ECMWF 12:00 UTC run became available during the 20:51 UTC source check.
All 54 GRIB fields passed run/time/unit/grid validation, with 17 complete
three-hour regional intervals and no capture errors. Direct cumulative-GRIB
endpoint differences independently verified three rolling 24-hour windows at
all 198 grid points, accounting for documented packing precision. Eight raw
wind-vector samples per window also matched at three public test points.
The original 06:00 run remains in Git history; the displayed run is never
relabelled as retrieval time. No automatic publishing permission changed.

NASA GIBS advertised and supplied actual 19:40, 19:50 and 20:00 UTC Himawari
frames. All four source tiles per frame, country alpha coverage and four
public-location pixels passed validation; the latest source crop was visually
inspected. New timestamped images preserve immutable paths for older clients.
The new cloud snapshot hides after 23:00 UTC, three hours after capture.

## Google Puttalam availability note, checked 26 October 21:13 UTC

Independent public-page review found the Puttalam place panel unsupported / no
flooding data, with the earlier orange shading absent on the later check.
Ark never copied that shading or the previous Likely label. Its fixed town
link now records the unavailable-data check at 27 October 02:43 SLST, not a
forecast issue/valid time. This is explicitly not a cancellation or all-clear;
the limitation around dam operations is retained in all three languages. No
Google geometry, private API, visitor coordinates or inferred expiry is used.

## Morning restoration, 27 October 2026

Manual release after Mac reconnection. DMC categories 6/5/2 lists (100 rows each)
and all eight selected warning PDF hashes were checked; no newer land warning
or cancellation was found. Warning review time records this actual review;
expired heavy-rain/lightning validity is not extended by the general forecast.
The 09:30 SLST river report was visually reviewed: 09:00 current and 08:00
previous columns, all 21 selected gauges in metres, four Minor Flood and seven
Alert. Moragaswewa, Galgamuwa and Thanthirimale were added. Blank source trends
remain null; Normal station readings never cancel land warnings. The 24-hour
rainfall column ends 08:30 and is not mixed into water levels.

The 08:00 Red marine bulletin 07 expires 20:00 SLST and is kept in a separate
sea-only news collection. It never enters inland location assessments or DS
warning polygons. Original restricted sea areas/instructions remain linked.

The actual official CSV now includes 56 Oct 27 records, eight Oct 26, five older
and five invalid/unknown dates. Batalagoda is dated Oct 27, 230 cusecs. Tabbowa
reports 1,320 cusecs, six gates at 1 ft; Inginimitiya 3,000 cusecs, two 2 ft and two 1 ft.
No operation time is reported. A newer official report date now keeps that
record prominent and collapses the older Oct 26 media report separately. Raw
remarks, source hashes and all unknown dates are retained.

ECMWF 18 UTC Oct 26 was the latest actually available run in the public listing;
Oct 27 00 UTC index returned 404. All 54 fields and 17 native 3-hour intervals were
validated. Independent original GRIB endpoint/wind checks cover three full
24-hour windows at 198 grid centres. No newer model issue was invented.
Clouds were actually acquired03:50/04:00/04:10 UTC Oct 27, expiry 07:10 UTC; all
country coverage and public test pixels passed. The existing Colombo tide
snapshot remains valid until 28 Oct 18:30 UTC and was not cosmetically re-dated.

RSMC 09 issued 04 UTC based 00 UTC and national 16 issued 09:30 IST agree on all ten
track-table rows. Only reported/discrete forecast centres are drawn.07UTC is
Ark's three-hour review deadline, not an invented official next issue. Prior
source identity/hashes remain in the new snapshot and Git history.

Google Puttalam remained unsupported at the independent 05:14 UTC review
(10:44 SLST); this source-check time is not a model issue/expiry or cancellation.
Both existing GitHub workflows are active, but the API history at 05:09 UTC had
no run after 00:21. The missed cadence is confirmed; its cause is not. No
schedule, permission or automated publishing path was changed.

## Fresh review versus expired local advisory, 27 October

A freshly reviewed, resolved location with no active matching bulletin says
“No active warning in reviewed reports” and “Not an all-clear.” It does not call
the whole app outdated because an earlier advisory expired before that review.
An expiry after the last review instead says “Previous warning expired”; stale,
future-clock, offline and failed-review states remain uncertain. Active official
Red/Amber warnings retain priority independently of source age. The separately
published banner fix is commit fce69a8; real-clock Colombo and Puttalam checks
passed in all three languages at 05:47 UTC, with matching public asset hashes.

## Verified publisher and two-choice location flow, 27 October

Real GitHub run 40459050913 completed successfully. Its data-only commit
`d6afe08534b83e7d8a5beda2431d577f3973e8a9` changed exactly the ten approved files.
Pages built at 06:08:33 UTC; all ten public hashes matched in a real browser
at 06:10 UTC. The initial trial safely retained cloud/tide data after clean-runner
setup errors; missing temporary-directory creation and the pinned NetCDF
dependency were corrected, with no change to source validation or permissions.

The primary location chooser now offers only Use my location and Choose on map.
District/place text search and its centroid shortcuts were removed at the user's
request. The manual map retains explicit centre-pin confirmation, unknown manual
accuracy, large pan/zoom controls, keyboard use and the GPS-denied fallback. No
address geocoder or new third-party location request was added. Focus moves to
the manual heading before asynchronous loading, so it cannot steal subsequent
keyboard focus from the map. Zoom control accessible labels change with language.

## 27 October 11:30 SLST lightning review

Bulletin 04, LLA/26/10/27/01, is Amber for Ampara and Batticaloa districts
only (LK52/LK51), issued 11:30 and valid until 23:30 SLST on 27 October. Both
original pages were visually checked. The map's red shading is not reinterpreted
as the bulletin severity. The prior expired bulletin and its four-district scope
remain in provenance; they are replaced in the current assessment snapshot.
Sinhala/English originals support the unchanged shelter/trees action. Tamil
remains an explicitly non-official summary with the existing reviewed wording
and catalog-confirmed district names; no official Tamil translation is claimed.

All 300 official list rows and selected original hashes were checked. No newer
river/basin/landslide bulletin or Kalu/Mahaweli extension was found. Other warning
and observation records, automated weather/reservoir publishing and its exact
ten-file boundary are unchanged. Expiry remains explicit and never an all-clear.

A completed manual no-change review can also be published through this same
reviewed release procedure: record the actual completed review time and the
checked source hashes/listing coverage in provenance, run the safety tests, and
verify the public snapshot. Never change source issue/expiry/observation times.
Do not advance the review time after an incomplete check or unresolved new
warning. Read-only scheduled checks and reviews in another task do not change
the public snapshot by themselves; a reviewed commit and verified deployment
are required. The automated ten-file publisher still excludes these warning files.

## One-shot recovery when GitHub misses its schedule

The existing 30-minute review turn may invoke `publisher_watchdog.py`; this is
not a new scheduler or daemon. The local invocation needs the Mac online and its
existing authorized `gh` session. After dispatch, the existing GitHub job runs
independently of the Mac. No new credential, permission, service or paid runner
is added. The exact ten-file publication allowlist remains unchanged.

Pass the **original monitoring end time**; do not restart a 48-hour window on
each invocation. First inspect with the default read-only mode, then allow one
due recovery using the same deadline:

```sh
python3 scripts/floodlens/publisher_watchdog.py --until ORIGINAL_MONITOR_END_UTC
python3 scripts/floodlens/publisher_watchdog.py --until ORIGINAL_MONITOR_END_UTC --dispatch-if-due
```

The deadline must be in the future and at most 48 hours away. A local file lock,
recent run/job inspection, a second pre-dispatch check, and a unique :07/:37 slot
identity prevent duplicate dispatches. Any active publisher blocks dispatch.
A completed run is fresh only if its reservoir, weather validation and publishing
steps actually succeeded in the current :07/:37 slot, or within the 15-minute
race cooldown. This avoids a rolling 30-minute completion timer skipping alternate
review turns. A skipped/no-op guard is not a data refresh. Dispatch intent is saved before the API request; an uncertain or accepted
request with no visible run blocks retries until its exact identity is resolved.
The script does not retry denied or uncertain dispatches through another route.

The unchanged workflow concurrency group serializes cron and recovery runs.
After acquiring that slot, a public read-only API guard skips a redundant run if
a real combined refresh finished in the preceding 15 minutes. This covers a cron
arriving between the local preflight and manual dispatch. The guard uses anonymous
public GETs, not additional token permissions. Failed/rate-limited inspection
fails closed, visibly. Existing explicit `force_refresh` remains a deliberate
manual re-fetch; the watchdog never sets it.

After an accepted request, inspect its run ID and completion. Verify the data-only
commit against the exact path allowlist, the exact Pages build, original source
run/capture/observation times, and public bytes in the browser if Cloudflare blocks
the runner probe. A successful manual recovery is **not** proof GitHub cron works.
Do not dispatch again to make the schedule look healthy. Record both event type
and actual publication time. Warnings, news and review timestamps remain outside
this publisher and require the separate completed-review release procedure.

## 27 October 07:42 UTC completed review and Tamil original

The coordinating review completed at 07:42:22 UTC (13:12:22 SLST), covering
100 rows each in DMC types 6, 5 and 2. Eleven existing relevant originals were
reported byte-identical, with no cancellation, supersession or extension.
The review record advances; issue, expiry and observation times do not.
The unchanged 09:00 SLST river observations remain visibly old.

A separately listed official Tamil PDF for Bulletin 04 was fetched and both
pages visually checked locally. It has the same Amber severity, Ampara and
Batticaloa scope, 11:30 issue and 23:30 expiry; its 12:45 listing is not a new
warning. Optional `officialTranslations` metadata requires the same bulletin
identity and validity, a reviewed hash and an allowlisted DMC PDF URL. Tamil
original-source links now select that document in the location result, details
and situation map. The app's summaries remain non-official translations.
Older clients retain the original primary source URL safely.

The 07:42 Google public-page observation is recorded only in review provenance:
Puttalam remains unsupported/no data, not an all-clear; Kala Wewa remains a
HYBAS discharge forecast node, not reservoir telemetry. No provider issue or
expiry time is invented.

## 27 October 13:30 SLST Kalu extension

No. 02 Amber explicitly extends the same No. 01 low-lying Kalu floodplain
warning across 13 named DS divisions. All three original PDF pages were visually
checked. The explicit header issues No. 02 at 13:30 SLST October 27 and expires
it at 13:30 October 28. Its prose references No. 01 as October 27, while the
attached No. 01 visibly says October 26. This inconsistency is retained in the
snapshot and provenance; neither original date is silently rewritten.

No. 01 is retained as a complete previous bulletin in provenance, with its
original hash and validity. Existing translated limited-scope summaries remain
unchanged and non-official. Mahaweli is still expired. Station measurements and
all unrelated warnings remain unchanged. Historical tests use the actual No. 01
fixture; new tests separately cover No. 02 issue/expiry, exact scope, original
source and priority despite stale gauge observations. The completed source-list
review time is 08:43:59 UTC, not the new bulletin's issue time or a gauge reading.

## 27 October 15:30 SLST river review

The original one-page table was visually verified: current readings at 15:00,
previous readings at 14:00, issued at 15:30. The 21 existing selected metre gauges
are retained and Ellagawa is added, giving 22 selected stations: five Minor Flood,
five Alert and twelve Normal. Baddegama is now Minor Flood; Thawalama and
Badalgama are Normal. A station classification never cancels a basin warning.
Dunamale's Minor Flood and Thalgahagoda's Alert have blank printed trends, retained
as null rather than inferred as steady/rising. Client 9 adds the missing Minor
Flood/no-trend label using existing non-official translated terms. Older clients
request a reload; versioned assets and data compatibility guards prevent a raw
unknown label. The six-hour rainfall column ending 15:00 is not ingested, and
Nagalagam Street's feet measurement is excluded from these metre records.
Superseded readings and original PDF hashes remain in provenance.

## Exact-commit Pages race verification, 27 October

Run 40486792246 pushed b165218, then observed an errored Pages build. GitHub
also recorded a successful build for that exact commit at 10:14:43 UTC, and
its published bytes were independently verified. The historical workflow
remains failed; a later unrelated commit does not prove that run succeeded.

The publisher now examines the bounded recent Pages build list, rather than
only `/latest`, within the existing eight-minute deadline. One errored build
does not terminate verification while another build of the exact full commit
can finish. Only a successful exact-commit build with the expected repository
build identity is accepted. All-failed, missing, pending or unrelated-commit
outcomes remain failures at the deadline. API denial stops immediately; it is
not retried or routed around. Public hash verification is still separate.

A failed publication step after successful source-processing steps may have
pushed already. The watchdog now reports `publication-unconfirmed` instead of
blindly treating that interval as due. Read-only and dispatch modes both report
`already-requested` for an existing current-slot request, preserving the failed
run conclusion rather than calling it fresh. A current-slot journal entry
missing from returned history remains uncertain. The runner also skips an
unconfirmed recent publication. A fully successful source/publication job is
still required for automatic `fresh`; partial source failures are not promoted
to success. Inspect exact commit, build history and public hashes to reconcile
a failed run. No same-slot redispatch is used to turn a failed run green.

The :07/:37 schedule, original monitoring deadline, job permissions, normal-push
checks and exact ten-file allowlist are unchanged. The new Pages race tests run
with the existing publisher safeguards. No new credential or service is used.

## 27 October 16:00 SLST landslide renewal

All four original pages of LEWM-27-10-2026-1600-34 were visually checked.
Update 34 renews the same 71 named divisions and surrounding susceptible areas:
28 Yellow, 33 Amber and ten Red. It is valid from 16:00 SLST October 27 through
16:00 October 28. Reordered names and removed old change markers do not change
severity or coverage. Exact district-scoped codes and the existing non-official
translated summaries are retained. The complete prior 18:00 bulletin and its
original hash/validity remain in provenance and in a test-only historical fixture.

The completed listing review is 11:13:41 UTC (16:43:41 SLST), separate from the
new source issue time. Kelani and Attanagalu still expire at 18:00 SLST October 27;
this renewal does not extend them. River readings remain at 15:00, issued 15:30.
Regression cases cover the renewed Red result in all three languages after the
previous bulletin's expiry, exact 71-division map scope, future/expiry boundaries,
and unchanged station observations. No app version or publisher path changes.

## 27 October 18:30 SLST river review

The original table is issued at 18:30 SLST although the DMC listing says 18:00.
Its readings are at 18:00, with a separate 17:00 comparison. All 22 selected
metre gauges are retained: five Minor Flood, four Alert and thirteen Normal.
Moragaswewa becomes Normal with a blank printed trend. Dunamale explicitly
shows Falling; Thalgahagoda shows Rising. These station classes do not cancel
area warnings or establish household conditions. Nagalagam Street uses feet
and remains excluded. The nine-hour rainfall column is not ingested as water
level or a 24-hour rainfall value. The full preceding station snapshot and
original hashes remain in provenance; historical no-trend tests use that record.
Kelani and Attanagalu expiry remains unchanged, without a verified replacement.

## Marine timed expiry and continuing wording

The 08:00 October 27 marine bulletin's stated validity ends at 20:00 SLST.
No cancellation or replacement was found in the completed 14:42 UTC review.
The expired bulletin is excluded from active news/warnings. A separate compact
notice under Latest near you keeps its original source and issue/expiry times
accessible and explains that expiry does not cancel instructions worded
“until further notice”. This is interface explanation, not a new official
translation or an assertion that the timed Red warning has been extended.
A newer active marine bulletin suppresses the older expiry notice. Invalid,
future or non-marine sources fail closed. Inland assessments are unchanged.
Changed app/flow/news modules use version 20261027-30; unchanged modules retain
their existing cache identities. No snapshot schema or publisher path change.

## 27 October 21:30 SLST river update and missing readings

The original 21:30 report was downloaded and visually checked locally against
an independent review. Its 21:00 observations and 20:00 comparison replace the
selected 18:00 snapshot: six Minor Flood, three Alert, eleven Normal and two
unavailable stations. Thalgahagoda becomes Minor Flood with a blank trend;
Putupaula is Alert with a blank trend. No trend is inferred from equal numbers.
Galgamuwa and Thanthirimale have dashes and no classification. Both values,
observation times, source remarks and trend remain null. Their report's target
21:00 time is a separate `reportObservationAt`, not an actual observation.
Old values remain in provenance only. Weraganthota is also missing in the source
but outside the selected station directory. The twelve-hour rainfall column is
not ingested as level data. All selected numeric gauges use metres.

Client 10 validates this explicit unavailable contract and renders an em dash,
non-official trilingual missing-reading labels and the original PDF link. The
snapshot requires client 10; older open clients request a reload before using
this data. Null never becomes zero, Normal or an all-clear. Warning validity,
marine until-further-notice instructions and review-age safeguards are unchanged.
The completed DMC review is 16:13:47 UTC; the separate Google public observation
is 16:13–16:14 UTC, unchanged Warning at the Kala Wewa HYBAS forecast node, with
provider issuance/validity unknown. These checks do not renew source times.

## 27 October Marine Bulletin 08: conflicting original times

All six original pages were visually checked locally. Bulletin 08,
MSW/26/10/27/02, is Red for sea areas only. Its header says 21:00 SLST on
27 October, valid for 24 hours. The map says issued 20:00 on 27 October and
valid until 20:00 on 28 October. `issuedAt` and `expiresAt` are therefore null;
both original windows are kept in `sourceTimeWindows` with `timeConflict: true`.
No single expiry is chosen or presented as authoritative. The separate marine
notice displays both dated windows and the until-further-notice distinction.
It records whether the time is within both windows, between their ends, or
past both ends; these states never cancel indefinite instructions or imply safety.

Client 11 validates this representation; older clients request a reload. Client
10's missing-station contract is retained. Bulletin 07 remains in the data and
provenance, but its old expiry card is not presented as the latest marine source
once Bulletin 08 is reviewed. No explicit cancellation or supersedes wording was
found. New numeric sea and storm context is retained with exact scope in source
provenance, not added as an inland forecast, arrival estimate or unverified track.
Existing trilingual sea-only summary and non-official translation labels remain;
new plain interface labels explain the timing conflict and link the original.
Gin's 22:30 SLST validity has elapsed without a verified extension or cancellation.

## 28 October recovery: noon river readings and renewed advisories

The interrupted 27 October 21:42 review was saved locally but never published.
Its original check stays in history; the recovery review does not claim a past
publication. All concurrent approved data-only commits are fast-forwarded before
releasing reviewed warnings. The original monitoring deadline remains unchanged.

Fresh 100-row checks of each DMC category and original visual review confirm:
- River report issued 12:30 SLST on 28 October, observations noon and comparison
  11:00: three Minor Flood, six Alert and thirteen Normal among the same 22 metre
  gauges. Blank trends stay null. Galgamuwa and Thanthirimale now have reported
  numeric readings; their earlier missing readings remain in provenance.
- Rainfall is a three-hour total ending noon. Thawalama's 68.6 mm is retained
  separately in review provenance; its station classification is Normal. Neither
  that classification nor rainfall determines household safety or cancels Gin.
- Lightning Bulletin 05 is Amber for Monaragala, Ampara and Batticaloa only,
  11:30–23:30 SLST on 28 October. Its English/Sinhala original is linked. It does
  not inherit Bulletin 04's official Tamil PDF. App summaries remain non-official.
- Gin No. 02 explicitly extends No. 01 with validity 12:30 SLST on 28 October
  through 12:30 on 29 October, only the four named low-lying valley divisions.
  Prior expiry and the gap before this new issue are preserved, not filled in.
- Kalu expiry, NBRO Update 34 and marine Bulletin 08's conflicting windows remain
  unchanged. The 05:30 general forecast is a separate original, not a cancellation.

Historical regression cases use their actual dated source snapshots. Current
recovery tests cover all 22 rows, returned missing gauges, exact lightning scope,
Gin validity gap, preserved warning priority and trilingual current browser flow.
The independent tide checker and retained validated tide snapshot are unchanged.
