# Matchday implementation review

20 October 2026. Branch: `codex/padelly-court-redesign`.

## Implemented

- Immersive court opening based on the selected Swift and Plnta direction.
- Original generated court imagery, optimized and saved locally.
- Self-hosted Barlow Condensed display typography with its open font license.
- Actual Padelly iPhone and Watch screenshots, large device composition, restrained idle and scroll movement.
- Clear Plan / Play / Review chapters and native jump links.
- Interactive website scoring demo, with standard advantage rules, game wins, Undo and Reset.
- Responsive disclosure navigation on all pages with existing primary navigation.
- English, German and Spanish; appearance preferences; shared supporting-page identity.
- Preserved legal content, support behavior, structured data, screenshot contract and dedication.

## Validation

- Production build passed.
- All 23 automated tests passed, including standard-scoring rules and production HTML cleanup.
- Structural audit passed for all 21 pages.
- Diff whitespace check passed.
- Browser reviewed at 1440 × 900, 390 × 844, and 320 × 800.
- English desktop and mobile, Spanish 320px mobile, German 320px mobile, both appearance modes.
- No horizontal document overflow at checked mobile widths.
- Confirmed mobile menu open, destination navigation to Support, Escape dismissal.
- Confirmed exploration/jump links reach the product chapters.
- Confirmed 0 → 15 → 30 → 40 → game in the actual browser demo; Undo restored 40 and removed the won game; Reset returned to zero and disabled its controls.
- Product images, font and court image checked visually.

A scrolling issue found during QA was repaired by using normal chapter flow, keeping the demo controls reachable.

Reduced motion is supported in CSS and JavaScript. An OS-level reduced-motion simulation was not performed. All core text and navigation remain available without JavaScript; the optional demo is hidden unless initialization succeeds.

## Delivery boundary

Production release approved by Caine on 20 October 2026. Release through the existing Cloudflare Pages integration on the main branch. No support form was submitted.

A verified public App Store URL is still needed before adding a download action. Existing real exploration links remain in use.

Design: [DESIGN-SPEC.md](../DESIGN-SPEC.md). Image prompt and font license: [asset notes](PADELLY-ASSETS.md).

## Pre-release mobile and build regression checks

- Fixed homepage header remains at viewport top while scrolling; supporting-page header is sticky.
- Mobile navigation opens above the content after scrolling well into the page.
- Appearance controls and subsequent menu opening work at that scroll position.
- A menu destination reaches Support; its menu also opens after scrolling.
- Landscape 844 × 390 layout keeps the full menu visible. The dropdown is height-limited and internally scrollable for shorter screens.
- Fixed malformed header closing markup on 12 German and Spanish supporting pages; the audit now detects this pattern.
- Build removes actual HTML comments without changing JSON-LD, JavaScript, CSS, attribute values, title text or form input text. Current page sources already contain no HTML comments.
- Cache versions refreshed for the final navigation behavior.
