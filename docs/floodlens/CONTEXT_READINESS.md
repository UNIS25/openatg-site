# Context release boundary — 26 October 2026

Ready for a bounded static release: dated, masked Copernicus GFM observations;
dated NASA IMERG rate estimates; nearest mapped reservoir with exact supported
gate configuration; and verified user-initiated emergency contacts. Official
warnings remain independent and retain priority. This is not full national
satellite/rainfall coverage or a household forecasting model.

## Evidence and freshness

- GFM six-asset native-cell checks, actual positive and excluded pixels,
  latest-valid acquisition selection, geometry/projection, missing auxiliary
  raster failure, future dates and source failure have regression coverage.
  The observation date is 23 October, not the date the site was deployed.
- NASA's locked V07 raster/time/raw value contract was checked. The new bounded
  request covers 27 half-hour slots through 13:00 UTC, at 26 fixed public grid
  centres. Only 00:00 and 00:30 produced valid estimates. The UI states the age
  and unavailable newer readings. No complete-day totals are inferred.
- Reservoir dates, raw remarks and exact gate counts/opening units are retained.
  Operation time is unknown. The CSV does not establish water travel time,
  household exposure or a downstream route from the closest reservoir.
- Automatic publication remains restricted to reservoir data. Warning source
  checks are read-only; reviewed warning summaries use the existing manual
  release process. Schedules are best effort every 30 minutes, not guarantees
  of new source measurements every 30 minutes.

## Next production gates

1. **Automatic NASA/GFM context:** needs specific approval to add exactly
   `floodlens/data/context/rainfall.json`, `satellite.json` and `provenance.json`
   to a separately guarded publisher. The existing repository-wide ephemeral
   contents/pages token is technically sufficient; no persistent credential,
   default permission expansion or new service is inherently needed. Do not
   expand the present reservoir publisher silently.
2. **Before that automation:** implement bounded source windows, incremental
   scene/cell updates, input/output size limits, full schema validation,
   cross-source timestamp checks, last-good retention, failure records,
   immutable provenance and concurrency/build verification. Benchmark full
   country coverage on low-memory phones. Cross-check rate-period semantics
   with primary IMERG granules before publishing accumulation or playback.
3. **Hydrologic connections:** tested official HydroRIVERS/HydroBASINS Asia
   download URLs returned HTTP 403. An independently published RiverATLAS
   subset did not cover Sri Lanka. FAO's new basin dataset is a legitimate lead,
   but export access, terms and downstream topology are unresolved. No bypass
   was attempted. A common basin or nearest reservoir is insufficient proof of
   a directed connection. Static topology cannot yield arrival times by itself.
4. **Tides:** Tide-Forecast reuse restrictions prevent the proposed scraper or
   embed. Open-Meteo free hosted API eligibility and its suitability for
   Puttalam lagoon remain unresolved. An accessible licensed source with datum,
   valid times and appropriate coastal/lagoon support is needed. No paid plan
   or credentials were authorized. A homepage link is provided, not an invented
   tide table or drainage countdown.
5. **NDRSC:** download hashes, validation and safe schemas were inspected. They
   contain historical/pending reports and static centre inventories, with
   missing/outlying points, invalid date ranges and no opening status. Public
   source items have blank reuse terms. No records or household points are
   included in this release. Local area-mapping work was deferred for the
   tonight release; no public redistribution is approved here.
6. **Wind/rain playback and cyclone tracks:** no validated licensed current
   forecast product/active official track is integrated in this release.
   Research and inspect actual product times, licensing and coverage before
   implementation. No forecast is synthesized from historical observations.
7. **Languages:** interface translations are labelled non-official. Original
   warnings remain available. Independent native-speaker safety review is
   still pending; visual/layout tests do not replace that review.

Source terms: [Copernicus GFM](https://global-flood.emergency.copernicus.eu/terms-of-service/),
[NASA GPM policy](https://gpm.nasa.gov/data/policy),
[FAO basin release](https://www.fao.org/agroinformatics/training-and-resources/data-sets/data-set-detail/hydrological-basins-new-release/en).
