# Padelly Matchday, v2

20 October 2026. Implemented locally for review.

## Direction

Caine selected Swift's app presentation and Plnta's padel identity as the primary references. The implementation combines an immersive court scene with genuine iPhone and Apple Watch screenshots, athletic display typography and clear product storytelling. It uses original code and assets rather than copying either template.

Research: [inspiration shortlist](docs/PADELLY-INSPIRATION.md).
Asset origins and final image-generation prompt: [asset notes](docs/PADELLY-ASSETS.md).

## Visual system

- Paper: `#f4f4ed`.
- Primary ink: `#173b2b`.
- Court green: `#174b36`.
- Ball lime: `#d5ed58`.
- Hero ground: `#0d291e`.
- Dark appearance: `#111f19`, with pale text and green surfaces.
- Display font: self-hosted Barlow Condensed Bold, uppercase, compact line height.
- Body: system sans-serif. No external font requests.
- Buttons: clear solid blocks, 4px corner radius, generous tap areas.

## Page story

1. Full-width court photograph, headline, concise explanation and real exploration actions. Large actual iPhone and Watch screens are visible together on desktop.
2. Three links to Plan / Play / Review.
3. Match planning: real setup screen, before-play explanation.
4. Lime Watch chapter: actual Watch screen and a clearly labelled interactive website demo.
5. Match review: real Analytics screen and after-play explanation.
6. Large editorial Plan / Play / Repeat break.
7. Supported scoring formats.
8. Local-first privacy, optional private iCloud backup explained accurately.
9. Small Royalty Mode detail.
10. Closing exploration actions, oversized wordmark and original dedication.

## Interactions

The homepage's optional device float and damped scroll movement stop under reduced-motion preferences. Ambient device animation pauses when the hero is outside the viewport. Native scrolling is retained.

The website demo follows standard advantage scoring, including deuce, advantage and two-clear-point game wins. Undo crosses game boundaries; Reset clears the demo. It does not save data, connect to the app or claim to be the actual app interface. It appears only when its JavaScript initializes successfully.

The homepage header is fixed, becomes solid after scrolling, and stays above the page content. Supporting-page headers are sticky. Dropdowns are limited to available viewport height. The mobile navigation is a disclosure menu with native links, accessible expanded state, Escape handling, outside-click dismissal and breakpoint reset. Without JavaScript, navigation remains visible.

## Responsive behavior

Desktop uses a split hero with headline left and devices right. Mobile places devices below concise copy, with a compact navigation row. Feature chapters use normal document flow so controls remain reachable. Product movement follows scroll where supported, without hiding content behind animation.

## Preserved content and infrastructure

English, German and Spanish routes; light, dark and system appearance; locale-matched real screenshots; metadata, structured data, support forms, legal text and dedication. The shared identity extends to supporting pages.

No verified public App Store link was available in the site, so actions lead to actual app content. No fabricated download destination, testimonial, price, rating, sponsor or app capability is added.

## Files

- `assets/sport.css`: visual system, layouts and responsive rules.
- `assets/sport.js`: homepage motion and demo interaction.
- `assets/scoring-demo.js`: pure standard-scoring rules.
- `assets/site.js`: shared appearance, language, navigation and support behavior.
- `assets/photography/`: optimized generated court image.
- `assets/fonts/`: self-hosted display font and license.

Production release target: https://getpadelly.com. The existing Cloudflare Pages integration deploys from the main branch.

The production build strips HTML comments using a parser. Scripts, structured data, styles and text are preserved.
