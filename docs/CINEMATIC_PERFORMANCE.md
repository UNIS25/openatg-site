# Cinematic performance report

Measured against the local production build at 127.0.0.1:4190, Chromium, three fresh browser contexts per condition, unthrottled loopback. These are local review observations, not internet/Core Web Vitals guarantees. Same-origin database/API and browser startup/cache variability are included. The poster-only desktop condition isolates the cost of motion on the same layout.

## Encoded assets

| Asset | Bytes | Dimensions | Format | Duration | Audio |
|---|---:|---|---|---|---|
| daylight-study-1280.mp4 | 1,399,191 | 1280 × 720 | h264 | 11.000000s | None |
| daylight-study-960.mp4 | 795,627 | 960 × 540 | h264 | 11.000000s | None |
| daylight-study-1280.webm | 1,103,718 | 1280 × 720 | vp9 | 11.000000s | None |
| daylight-poster-1280.webp | 167,668 | Responsive still | WebP | — | None |
| daylight-poster-mobile.webp | 93,004 | Responsive still | WebP | — | None |

## Measured page impact

Median of three samples; source and request counts are the observed values from the final sample.

| Condition | TTFB ms | DOM ready ms | LCP ms | CLS | Resource transfer bytes | Media requests | Selected media |
|---|---:|---:|---:|---:|---:|---:|---|
| desktop-motion | 11 | 30 | 60 | 0 | 2,330,414 | 1 | daylight-study-1280.webm |
| desktop-poster | 8 | 31 | 60 | 0 | 1,226,396 | 0 | poster |
| tablet | 8 | 28 | 52 | 0 | 2,076,527 | 1 | daylight-study-960.mp4 |
| mobile | 8 | 31 | 44 | 0 | 860,762 | 0 | poster |
| save-data | 7 | 29 | 56 | 0 | 1,226,396 | 0 | poster |

## Loading behaviour and limits

Posters and navigation render before film eligibility is evaluated. There is no preload of video; source elements are added only after motion/data/device checks and viewport intersection. Mobile/coarse pointer, reduced motion and Save-Data send no film request. Below-fold chapters use lazy stills; no other video competes for playback. One same-origin film plays muted/inline. Off-screen, hidden-page and modal states pause it. A visible play/pause control is keyboard accessible. Every film is encoded without an audio track. Media boxes reserve dimensions; the gateway/poster layout does not depend on video readiness.

Browsers may reject an unsupported source and try the next codec; the player now waits for the complete source chain to fail before showing a poster-only notice. Deliberate decode-failure browser tests confirm this fallback without an application exception. No third-party player, iframe, analytics or media origin was added. Actual public-network performance and browser/device certification remain part of a later approved deployment review.
