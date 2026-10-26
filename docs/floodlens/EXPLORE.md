# Ark situation map

`https://openatg.com/ark/explore/` is an optional regional view. The main
language → location → concise result flow remains at `/ark/`. No additional
credential, API grant, paid service or automatic publishing path is enabled.

## Six separate evidence layers

- **Warnings:** active reviewed DMC/Irrigation/NBRI bulletins joined to exact
  district-scoped DS codes, using the existing display boundaries. Hatched
  administrative areas are named warning coverage, not mapped floodwater.
  Source-specific valley/slope qualifications remain visible on selection.
  Unmapped names remain listed; expired warnings disappear without an all-clear.
- **Rain:** actual ECMWF IFS 0.25° values in eight complete, consecutive future
  three-hour intervals, identical to the main forecast window. Null is missing,
  not zero. Rain amounts are interval accumulation differences from one run.
- **Wind:** the same forecast intervals and native grid, 10 m wind components
  converted from m/s to km/h. Arrows show vector direction. Numeric colour
  scales are weather values, not a flood-risk score.
- **Clouds:** existing first-party JMA Himawari/NASA GIBS frames, with actual
  acquisition times and age. Infrared imagery is not radar or flood extent.
  After three hours the overlay is hidden. Failed images do not block warnings.
- **Reports:** two named reservoirs in the reviewed Daily Mirror article of
  26 October 21:44 SLST. Exact tank-code/name joins identify reservoir structures,
  not affected neighbourhoods. Values remain attributed news, with unknown
  operation time and a discrepancy with the older untimed official daily record.
  Records are hidden after 48 hours. This is not a comprehensive incident feed.
- **Cyclone:** manually reviewed IMD/RSMC reported and forecast centres. A filled
  point is the dated reported centre; open points remain forecasts, even after
  their valid time passes. Dashed joins connect source points only. No interpolated
  current centre, cone, household danger or Sri Lanka impact is inferred.

Every layer keeps its own timestamp and meaning. No cross-layer risk percentage
or safe-route calculation is performed. Unavailable sources stay unavailable;
still-valid official warnings are not suppressed by old or missing measurements.

## Cyclone source review

`data/explore/cyclone.json` contains ten factual positions/wind ranges transcribed
from the rendered table in the [RSMC advisory](https://mausam.imd.gov.in/backend/assets/cyclone_pdf/Tropical_cyclone_advisory_No__6_based_on_1500_UTC_of_26_10_2026.pdf),
issued 26 October 18:00 UTC and based on the 15:00 UTC analysis. SHA-256:
`e1e1e20189bf9806672c3747525140e80d5f568c80468b2d5c5021e8576aa790`.
The heading says advisory 06 while a prose line says 05; identity uses the URL,
hash and actual times, not the repeated/inconsistent number.

The table was cross-checked against the [national bulletin](https://mausam.imd.gov.in/Forecast/marquee_data/13.%20National%20Bulletin%20No%2013-26Oct2026_2030IST.pdf),
with IST correctly converted to UTC. SHA-256:
`0ce2ba8b86ac033ce5d76ab1c05c15d9c751dc8baf3f5c8d555982e8772ea93b`.
Embedded forecast graphics use the older 12:00 analysis and are not copied into
the map. No category from a different cyclone classification system is invented.

The national bulletin's next expected issue, 27 October 02:30 IST / 26 October
21:00 UTC, is a **review deadline**, not the forecast expiry. After that time the
map prominently says it is the last reviewed forecast and needs a newer review.
The stated 120-hour validity ends 31 October 18:00 UTC; expired points are hidden.
New official bulletins require original-document visual review, schema checks,
tests and an ordinary reviewed deployment. No restricted track API is used.

The regional coastline is a clipped Natural Earth 1:110m public-domain land
layer. Its source URL, hash, capture time and public-domain terms accompany
`region-land.json`. It is only geographic context, not navigation or a political
boundary claim. Sri Lanka display boundaries retain Survey Department/OCHA
CC BY 3.0 IGO attribution and their 2022 coverage limitations.

## Loading, privacy and failure behaviour

All geometry, imagery and snapshots are same-origin static files. Explore does
not request GPS, save coordinates or use an external tile service. The host/CDN
receives ordinary asset requests and network metadata. Original source links
open only when tapped. Source text is inserted with textContent, never HTML.

Sources load independently with bounded timeouts. A failed refresh retains a
previously loaded snapshot with its original date and a visible failure notice.
Visibility-aware refresh requests published snapshots every five minutes; age
and expiry update every minute. This does not mean sources are automatically
reviewed or new bulletins are continuously published. The existing reservoir
publisher remains restricted to its one approved file. Expanded automatic
forecast/cloud/tide publication is pending explicit approval.

## Validation

`node --test tests/floodlens/*.test.mjs`

`node tests/floodlens/explore-browser.mjs`

The browser suite starts an isolated local server and headless Chrome, or uses
`BASE_URL` for a published release. It exercises all six layers in English,
Sinhala and Tamil, three-hour playback, actual two-finger pinch, bidirectional
pan, 320 px layout, source/image failures, expiry, overdue cyclone review,
warning priority, storage/network privacy and exact published source hashes.
Synthetic conditions exist only in test routing/clock controls. Production
contains only the reviewed source snapshots. Native-speaker translation review
remains pending; the interface labels translations as non-official.
