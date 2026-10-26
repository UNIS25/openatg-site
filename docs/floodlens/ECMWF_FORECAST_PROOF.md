# ECMWF Sri Lanka forecast proof — 26 October 2026

A real, bounded ECMWF IFS control-forecast subset has been captured and decoded:
26 October 06:00 UTC run, 0.25° published regular latitude/longitude grid, 198
fixed grid centres covering 79.5–82°E and 5.75–10°N. This is roughly 28 km grid
spacing at Sri Lanka, not household resolution. The underlying IFS model mesh
and the published interpolated grid are different; no downscaling is performed.

Ten forecast steps (9 through 36 hours in three-hour increments), each with
total precipitation and 10 m u/v wind, were fetched anonymously as bounded
HTTP byte ranges from the official indexes. All 30 GRIB2 fields validated; no
source errors. Raw messages/indexes, SHA-256 and actual retrieval timestamps are
in ignored local artifacts. The derived JSON is about 96 KB, with a separately
published provenance manifest. Retrieval time is not the model run or valid time.
Rebuilding cached files does not advance the actual source retrieval timestamp.

## Verified metadata and derivations

- `tp` paramId 228, units `m`, surface, `stepType=accum`, startStep 0, endStep
  equal to the indexed lead hour. Rainfall for one interval is the difference
  of two consecutive accumulations from the same run/grid, multiplied by 1000
  for mm. It is a three-hour amount, not mm/hour and not a probability.
- `10u`/`10v`, paramIds 165/166, units `m s**-1`, heightAboveGround level 10,
  instantaneous at valid time, `uvRelativeToGrid=0`. Speed is hypot(u,v), with
  km/h conversion ×3.6; direction is meteorological FROM, clockwise from north.
  Speeds under 0.5 m/s have no displayed direction. Gusts are not inferred.
- GRIB2 centre ecmf, regular_ll 1440×721, 0.25° increments; first coordinate
  180°E/90°N, eastward rows scanning north to south. Regional decoded coordinate
  arrays are checked exactly; shifted/reordered grids fail closed.
- Data run, validity date/time, parameter identity, units, height, step type,
  scan directions, field size and Earth-relative vector orientation are checked.
- Missing is never zero. Gaps, reset accumulations, different runs/grids or
  negative differences beyond the sum of the actual GRIB packing errors are
  rejected. Small negative rounding differences are zero only with an explicit
  `within_packing_tolerance` quality flag. The current regional capture has no
  missing intervals. A 24-hour total needs exactly eight consecutive complete
  three-hour intervals, with its explicit start/end timestamps. It is not a
  rolling now-to-now+24h interpolation.
- Visitor locations are matched locally to the nearest published grid centre;
  the centre and distance are exposed under Sources. No user coordinates go to
  ECMWF, an API, storage or analytics. The entire fixed regional JSON is served
  identically to visitors. No sample value substitutes for an outside point.
- Forecast valid times in the future are expected; model runs in the future
  are rejected. Model age over 18 hours is flagged as older; all elapsed valid
  times produce an archived/expired state and no upcoming 24-hour total.

## Actual independently reproducible examples

For 26 October 15:00–18:00 UTC (20:30–23:30 SLST), with wind at 18:00 UTC:

| Public sample | Selected grid lon/lat | 3-hour rain | Wind km/h, FROM |
|---|---|---:|---:|
| Puttalam 79.828, 8.036 | 79.75, 8.00 | 3.1738 mm | 8.54, 7.3° |
| Ratnapura 80.4037, 6.6828 | 80.50, 6.75 | 7.4463 mm | 4.37, 350.6° |
| Jaffna 80.021, 9.6615 | 80.00, 9.75 | 0.6104 mm | 9.17, 242.5° |

The complete 26 October 18:00–27 October 18:00 UTC window forecasts 2.5635 mm
at the selected Puttalam grid centre, 24.0478 mm at Ratnapura's and 0.3662 mm at
Jaffna's. These are model-grid forecasts, not measurements or warning thresholds.
The grid centres lie about 9.5, 13.0 and 10.1 km from those public sample pins.
No local flood severity, rain probability, cyclone formation or drainage time
is derived from these values. Official warnings remain independent.

## Reproduce locally

Use the existing isolated venv with eccodes 2.50.0 and numpy 2.5.4:

```sh
artifacts/floodlens/context-venv/bin/python experiments/forecast/build.py --run 2026102606
artifacts/floodlens/context-venv/bin/python -m unittest discover -s experiments/forecast -p 'test_*.py'
node --test experiments/forecast/test_model.mjs
node experiments/forecast/browser.mjs
```

`experiments/forecast/index.html` provides the phone preview; `data/forecast.json`
and `data/provenance.json` contain actual derived data, not fixtures. Raw global
GRIB messages are not included in public files. Source archives retain only the
latest several runs; later reproduction requires the retained raw hashes/cache.

## Rights and production boundary

Official ECMWF [open-data terms](https://www.ecmwf.int/en/forecasts/datasets/open-data)
allow CC BY 4.0 use, including commercial redistribution, with attribution.
[Additional terms](https://apps.ecmwf.int/datasets/licences/general/) require
ECMWF credit, copyright, licence link, modification notice and disclaimer; these
are included in the component. No account, credential, delivery agreement,
subscription, proxy or paid service was created. This proof uses the ordinary
published anonymous file service, not a commissioned delivery arrangement.

The user has since authorized a tested manually reviewed public forecast
snapshot. Existing publisher permission remains **reservoir data only**.
Automatic forecast refresh would require explicit approval for the exact new
paths `floodlens/data/forecast/forecast.json` and `provenance.json`, plus bounded
fetch/validation, latest-complete-run selection, failure manifests, atomic pair
publication, concurrency/build checks and retained last-good provenance. No
workflow or token scope has been expanded. Model output is only issued a few
times per day; a 30-minute check does not generate a new model run every 30 minutes.

Primary semantics:
[ECMWF technical documentation](https://confluence.ecmwf.int/spaces/DAC/pages/272310539/ECMWF+open+data+real-time+forecasts+from+IFS+and+AIFS),
[accumulated precipitation](https://charts.ecmwf.int/products/medium-rain-acc),
[wind convention](https://confluence.ecmwf.int/plugins/viewsource/viewpagesrc.action?pageId=133262398).

## Public release adapter paths

The reviewed production copy is `scripts/floodlens/ecmwf_forecast.py`, with
optional manual dependencies in `scripts/floodlens/ecmwf_requirements.txt`.
Run `python scripts/floodlens/ecmwf_forecast.py --run YYYYMMDDHH` only for an
explicitly reviewed run; default output is `floodlens/data/forecast/`.
Decoder tests are isolated in `tests/forecast/test_adapter.py` so unchanged
reservoir/source-check jobs do not gain an ecCodes dependency. Frontend tests
are `tests/floodlens/forecast.test.mjs` and `forecast-browser.mjs`.
No scheduled job calls the new adapter. Public source hashes and parsed GRIB
metadata are in `floodlens/data/forecast/provenance.json`.


## Reviewed horizon extension, 26 October 18:44 UTC

The 12 UTC official directory lists AIFS single/ensemble, but no IFS directory;
the expected IFS index returned 404. The refreshed snapshot therefore retains
the **06 UTC IFS run** and extends validated lead times through 60 hours. No
AIFS values or later run timestamp are substituted. Directory evidence/hash is
recorded in provenance. Eighteen steps / 54 GRIB fields now provide 17 complete
three-hour intervals, 198 fixed regional points, and no capture errors.

At review, the complete upcoming window is 26 October 21:00 through 27 October
21:00 UTC (27 October 02:30 through 28 October 02:30 SLST). It is an explicit
native-interval 24-hour window, not interpolation from the current minute.
Colombo public test pin 79.8612,6.9271 maps to grid 79.75,7: 6.9581 mm and sampled
10 m wind 6.94–29.82 km/h. Puttalam: 2.3193 mm; Ratnapura: 23.4375 mm.
Independent raw accumulation-endpoint checks cover every grid point. The maximum
0.1221 mm discrepancy is accounted for by flagged small negative intervals
within actual GRIB packing precision, plus four-decimal rounding; it is not
missing rainfall imputed as zero. All 24-hour totals remain sums of the same
eight displayed complete intervals.

This is a manually reviewed publication. No automatic publisher or permission
change. Newer model runs still require review; the client displays the original
run time and flags an older run after 18 hours. A longer forecast horizon does
not make the underlying model newer.
