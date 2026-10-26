# First-party street map

Ark now displays roads by default without a modal or external map provider.
OpenStreetMap road/place data is downloaded **at build time for the fixed whole
country**, from the Geofabrik public extract intended for redistribution. No
OSMF raster tiles are bulk downloaded, scraped, cached offline or proxied.

The original 144,539,569-byte PBF's MD5 matches its published sidecar; the PBF
header confirms data through 2026-10-25T21:21:21Z. Build scripts extract 339,529
road ways and 6,058 place labels. No missing way geometry was found. Public data
omits contributor identities, addresses, household data and unrelated OSM tags.
The derivative is ODbL, with visible map attribution and the complete derived
JSON database plus source/transform/hashes publicly available. Boundaries and
warnings remain separate layers. Roads are not a routing/passability service.

`build_roads.py` creates ignored intermediate district-bbox partitions;
`tile_roads.py` deduplicates by actual OSM identity into 636 fixed 0.1-degree
cells. Final cells are under 1 MB uncompressed; the Colombo test cell is 799 KB.
The source extract stays ignored/local. Only the ~48 MB derived display data is
published. The client loads visible cells at local zoom and an overview at wide
zoom, caches at most 18 cell promises in memory, culls off-screen lines, and
merges strokes by road class. No full-country dataset loads at startup.

## Exact network and privacy behavior

GPS coordinates, accuracy and pin positions remain in page memory. No external
tile/geocoder request occurs. Browser requests go to OpenATG's existing hosting:
the fixed manifest and cell filenames selected locally from the viewport. As
with ordinary boundary files, those filenames can reveal a **coarse map area**
to OpenATG's host/CDN, which also receives normal IP/network metadata. They do
not contain exact GPS coordinates. No location analytics, storage, error
telemetry or new endpoint has been added. The source-data servers see
only the developer's whole-country build-time request, never visitors.

This data flow removes the external disclosure/consent prompt without silently
transmitting a visitor's area to a new service. The existing CSP was not weakened
or otherwise changed. The unused external tile permission is not exercised.
A Simple map toggle and the local boundary fallback remain. Road failures never
hide warnings or prevent location matching; fully offline first visits still
need cached site assets, so no guaranteed offline coverage is claimed.
