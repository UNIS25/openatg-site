# OpenATG FloodLens

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

The user explicitly approved a separate reservoir observation publisher with
job-level `contents: write` and `pages: write` on 26 October 2026.
`.github/workflows/floodlens-observation-update.yml` runs at minutes 7 and 37 each hour
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
