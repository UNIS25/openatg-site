# Final HD gateway and connected experience

## Outcome

The previous gateway motion treatment has been replaced by genuine stabilized 4K aerial footage of Lake Oeschinen in Switzerland. The production web derivative is a silent 1600 × 900 H.264 film with a static desktop poster and a separate 720 × 1280 mobile poster. The former artificial poster pan/zoom has been removed.

The existing application journey remains connected and unchanged:

- `/` defaults to German and offers the General Store and Cigar Club destinations.
- `/de/store`, `/fr/store` and `/en/store` retain the approved plantation, tea-pouring, five-tea collection, spice, curry and restaurant chapters.
- `/de/club`, `/fr/club` and `/en/club` retain the existing club entrance and account journey.
- Mobile, reduced-motion and Save-Data visitors receive a deliberate static poster instead of downloading autoplay media.

## Media provenance

The gateway master is [Pexels video 29003539](https://www.pexels.com/video/aerial-view-of-lake-oeschinen-in-switzerland-29003539/) by Flex Journey. It is documented as free-to-use stock footage. The footage is not presented as the Varathans25 venue, property, sourcing or production.

The complete asset register and use limits are in [GATEWAY_MEDIA_RIGHTS.md](GATEWAY_MEDIA_RIGHTS.md). Existing plantation, tea-pouring and spice films are unchanged.

## Verification

- Production build: passed.
- TypeScript and lint: passed.
- Unit tests: 40 passed.
- Dependency audit: 0 vulnerabilities.
- Tracked-source and client-bundle secret scan: passed; six configured secret values checked without printing them.
- Server-rendered gateway, German store, German club, English store and French club: HTTP 200.
- Gateway, plantation, tea-pouring and spice MP4 assets: HTTP 200 with `video/mp4`.
- Gateway links resolve to the locale-preserving Store and Club routes.
- Browser automation was attempted but the managed Linux runner contains no browser executable, and the browser CDN returned an empty archive. This is an environment limitation, not a passed browser result. Run the existing Playwright suite on the owner workstation before deployment.

## Local owner review

From the platform directory on the owner workstation:

```sh
npx supabase start
npm run build
npm start
```

Keep the `npm start` terminal open, then review:

- Gateway: `http://127.0.0.1:4190/`
- Store: `http://127.0.0.1:4190/de/store`
- Club: `http://127.0.0.1:4190/de/club`
- English: replace `/de/` with `/en/`
- French: replace `/de/` with `/fr/`

Before publication, run `npm run test:e2e` with the existing local Supabase stack and Playwright Chromium available.
