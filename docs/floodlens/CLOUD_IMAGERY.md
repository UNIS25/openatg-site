# Recent cloud imagery

The optional **Satellite cloud view** displays a reviewed, fixed Sri Lanka crop
of JMA Himawari-9 AHI Band 13 clean infrared imagery supplied by NASA GIBS.
It is a delayed infrared brightness-temperature image, not rain radar,
rainfall quantity, floodwater extent, a warning or a forecast. Colours are
temperature colours and are not hazard classifications. It never changes the
official assessment. The normal road map remains the default.

## Source and rights

- [NASA GIBS access documentation](https://nasa-gibs.github.io/gibs-api-docs/)
- [NASA Worldview layer metadata](https://github.com/nasa-gibs/worldview/blob/main/config/default/common/config/metadata/layers/himawari/Himawari_AHI_Band13_Clean_Infrared.md)
- [JMA terms](https://www.jma.go.jp/jma/en/copyright.html): Public Data License 1.0,
  compatible with CC BY 4.0; attribution and modification notice retained.

The public manifest and compact credits attribute JMA and NASA GIBS/ESDIS,
acknowledge the supplied imagery, describe OpenATG's Sri Lanka crop/outline,
and do not imply endorsement. The source is about 2 km resolution with nominal
ten-minute sampling and roughly forty-minute latency. Neither nominal value
guarantees that an advertised frame is available.

## Actual capture and validation

`scripts/floodlens/capture_clouds.py` is a manual build tool, with a fixed public
country extent and no user coordinates. It reads actual WMTS capabilities and
derives the CRS84 grid from the 2km/5 matrix: origin -180,90; 512-pixel tiles;
9/512 degrees per pixel. Four source tiles cover the crop. It performs a
pixel-aligned lossless crop, with no recolouring or resampling. The resulting
189 × 274 images cover [79.189453125, 5.484375, 82.51171875, 10.30078125].

The reviewed capture contains 26 October 2026 **18:30, 18:40 and 19:00 UTC**.
An advertised 18:50 frame returned 404 for a required tile and is recorded as
unavailable, not interpolated. A 401/403 stops capture rather than trying an
alternative identity. The bounded search examines at most six advertised time
slots and requires three complete, distinct frames.

Each PNG's actual alpha coverage was checked against the licensed Sri Lanka
display outline: all land pixels were nontransparent. Fixed public Colombo,
Puttalam, Jaffna and Ratnapura test pixels also contain actual source data.
This verifies image coverage, not meteorological interpretation. Actual capture
times, retrieval times, source tile URLs/hashes, output hashes, pixel bounds,
and missing frames are preserved in `data/clouds/provenance.json` and the manifest.

## Runtime and privacy

No cloud metadata or image is requested until the visitor opens the section.
All files come from OpenATG; there is no NASA/JMA browser request and no precise
coordinate in a URL or storage. The pin is drawn locally over the same country
image for every visitor. Local outlines provide geographic context. Three
actual frames can be played, with capture time and age for each. There is no
autoplay, and closing the section stops playback.

Images older than three hours, future capture times relative to the device
clock, incompatible metadata, source failure and image failure fail closed.
When the latest capture is stale, images are replaced with an unavailable/age message. Independent official
warnings remain visible. Source attribution stays in accessible compact details.

## Publication boundary

This is a **manually reviewed snapshot**, not a live feed. No workflow,
credential, permission or automatic publisher path has been added. The existing
reservoir publisher remains restricted to its one approved file. Continuously
fresh cloud images would need a separately approved bounded publisher for the
cloud manifest, provenance and frame files, with source, time, coverage, hash,
size, deletion and concurrency guards. Until then the UI expires this snapshot
honestly rather than presenting it as current indefinitely.

Verification: `node --test tests/floodlens/clouds.test.mjs` and
`node tests/floodlens/clouds-browser.mjs`. The browser test supports
`BASE_URL=https://openatg.com`, validates public byte hashes, and records mobile
screenshots. Synthetic failure/clock conditions exist only in tests.

The separate display outline is a union of the existing 339 exact OCHA/Survey
Department polygons, simplified by 0.003 degrees for display only. It is not
a hazard boundary. `build_cloud_outline.py` reproduces it; CC BY 3.0 IGO credit
and the source are retained in the compact image credits and outline metadata.
