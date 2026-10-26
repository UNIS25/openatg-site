# Colombo tide context

The on-page panel is a **station astronomical prediction**, not observed sea
level, a navigation tide table, storm surge or a flood-drainage forecast. It is
shown only when local administrative matching includes Colombo district LK11;
this selects a relevant station reference, not a parcel-level coastal model.
No Colombo prediction is substituted for Puttalam or another district.

The manually reviewed snapshot covers 26 October 2026 18:30 UTC through
28 October 2026 18:30 UTC. The panel selects the next high and low with the
visitor's clock, uses Sri Lanka time, rounds time to five minutes and height
to 0.1 m, and fails closed when the period or complete event pair is unavailable.
It does not silently extrapolate beyond that range. Client retrieval is fixed
same-origin and sends no visitor coordinate. New prediction publication remains
manual; no scheduler permission or path allowlist has changed.

## Sources and reproduction

`floodlens/data/tides/colombo-source.json` preserves the 50 constituent Colombo
record from Open Waters Slackwater database commit
`4f50567f638388c75c3f3b31e4cbcc10738d9734`, source record
`ticon/colombo-115c-lka-uhslc_rq.json`. The record declares CC BY 4.0 and commercial
use; the database's primary attribution identifies Hart-Davis, M., Dettmering,
D. and Seitz, F. (2025), TICON-4, https://doi.org/10.17882/109129.
Underlying measurements span 2006–2016; datum epoch is July 2013–June 2016.
The record has a gauge reference frame, MSL 1.392 m and LAT 0.931 m.
The implemented offset is MSL minus LAT = 0.461 m. The UI says **dataset LAT**,
not a newly surveyed or independently verified official navigation datum.

`node scripts/floodlens/build_tides.mjs` reproduces the bounded snapshot using
vendored `@slackwater/engine` 1.0.0-beta.0 (MIT, full copyright/license retained
in `scripts/floodlens/vendor/`). All 50 constituents must be recognized before
calculation; silently omitted constituents are rejected by the build guard.
The package's raw SHA and station SHA are recorded in the public output.
Generated times/levels are derived data and explicitly attributed as modified.

A separate LGPL uptide 1.2 calculation was used locally for numerical validation,
not shipped or linked into the web application. The 36 shared constituents were
compared over 577 five-minute samples for the full 48-hour published period.
Maximum level difference was 0.013522 m, RMS 0.007006 m. Eight extrema differed by
at most 2.653 minutes against the independent five-minute extrema samples.
The published calculation uses all 50 constituents. This is an independent
algorithm check of the shared subset, **not validation against observed current
Colombo sea levels**; weather effects and sea-level trend are absent.
The compact report is `floodlens/data/tides/validation.json`; raw local comparison
samples and scripts remain in ignored `artifacts/floodlens/tide-proof/`.

A seven-day numerical trial showed extrema differences up to 24 minutes near
flat neap turning points, despite small level differences. It was not published.
The public range remains the checked 48 hours. Do not extend it by changing an
expiry alone: recalculate and independently check the full proposed range.

The Open Waters comparison API returned HTTP 403. It was not retried using
identity disguise/proxy or used as an availability claim. Independent local
computation continues without that API. No paid service, account or credential
was added. Current operational tide gauges, Puttalam harmonics and observed
storm-surge data remain unavailable in this integration.
