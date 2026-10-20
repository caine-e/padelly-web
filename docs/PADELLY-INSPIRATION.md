# Padelly website inspiration

Research date: 20 October 2026.

## Decision

Caine chose: **Sporty and premium: bold type, court colours, real app screens.**

Confirmed direction for the Matchday build: **Swift's app presentation + Plnta's padel context**. Doble remains a secondary reference for editorial character. This is an original implementation in the existing website. Framer is useful for references, but moving Padelly into Framer is unnecessary for this rebuild.

## Ranked shortlist

These are ranked by usefulness to Padelly, not by design awards. Templates are identified as templates. App websites are references, not reusable code.

| Rank | Reference | Useful idea for Padelly | Limits | Review |
| --- | --- | --- | --- | --- |
| 1 | [Swift App](https://www.framer.com/marketplace/templates/swift-app/) · [live](https://swift-template.framer.website/) | Strong phone-led app story, focused feature sections, prominent product images. Best functional template reference. | Its all-black treatment is less distinctive for Padelly. Replace fitness content and omit unsupported proof, pricing and download promises. | Live hero visually reviewed. |
| 2 | [Plnta](https://www.framer.com/marketplace/templates/plnta-padel-club/) · [live](https://expanded-priority-588823.framer.app/) | Padel atmosphere, editorial hierarchy, confident green and lime visual identity. Best sport-direction reference. | This is a club site. Courts, sponsors, memberships and venue statistics do not transfer to Padelly. | Live hero visually reviewed. |
| 3 | [Doble](https://www.framer.com/marketplace/templates/doble/) · [live](https://doblepadel.framer.website/) | Memorable short headline, warm cream tones, strong composition and human character. | Its facility photography and booking journey serve a different business. Use the personality, not the club structure. | Live hero visually reviewed. |
| 4 | [Slopes](https://getslopes.com/) | iPhone and Apple Watch shown together as one sports experience. Explain what happens before, during and after play. | Reference website, not a template. No copying its claims, assets, features or reviews. | Live hero visually reviewed; official page read. |
| 5 | [Pillo](https://www.framer.com/marketplace/templates/pillo/) · [live](https://pillo-app.framer.website/) | One persuasive consumer-app narrative, device-led hero, three-step structure, light and dark support. | Its sleep-product mood is too calm to be Padelly's main visual reference. | Official template listing reviewed, not live animation QA. |
| 6 | [SMASHCLUB / Padel Tennis Club](https://www.framer.com/marketplace/templates/padel-tennis-club/) · [live](https://smashclub.framer.website/) | Large athletic headlines and electric court accents. Useful for a more aggressive alternative. | Dark and neon can overpower the product. The shader logo is unnecessary for Padelly. | Official template listing reviewed, not live animation QA. |
| 7 | [Grind](https://www.framer.com/marketplace/templates/grind/) · [live](https://grindtemplate.framer.website/) | Physical energy and a clear statement above the first action. | The live hero is athlete-photo-led. The listing describes app mockups, but that was not the leading visual observed. Padelly should lead with its actual screens. | Live hero visually reviewed. |
| 8 | [Gentler Streak](https://gentlerstories.com/gentlerstreak) | A consumer app with personality and an approachable explanation of Watch benefits. | Its softer health-and-wellbeing voice is a secondary influence. Its awards belong to the app and do not establish website design quality. | Official page reviewed, not live visual QA. |
| 9 | [Calories](https://www.framer.com/marketplace/templates/calories/) · [live](https://calories.framer.website/) | Interactive feature demonstrations can communicate more than a long list. | Avoid its AI positioning, SaaS integrations and large section inventory. Padelly's actual scoring is the story. | Official template listing reviewed, not live animation QA. |
| 10 | [SwingVision](https://swing.vision/) | Useful competitor/category reference for racket-sport software. | Its camera analysis and AI features are not Padelly features. Not recommended as the main design base. The page required JavaScript and was not visually verified in this research. | Official URL checked; limited verification. |

### Rejected as a main reference

[Padelix](https://www.framer.com/marketplace/templates/padelix/) was opened visually. Its hero showed tennis rackets, a club-booking message and an intrusive customization promotion. It is a weaker fit for an independent padel scoring app, despite its name.

## What the first implementation takes from the research

- Cream paper, deep court green and a restrained ball-lime accent.
- Large, tightly composed headlines and generous space.
- Real localized Padelly screenshots in custom CSS device surrounds.
- A court stage that places iPhone and Watch together.
- A three-chapter Plan / Play / Review story, with scroll-linked product movement and desktop chapter stacking.
- Clear scoring-format and privacy sections. Royalty Mode stays a small extra.
- EN, DE and ES pages, light and dark preferences, readable content without JavaScript.

Implementation code is original. No template code, photographs or commercial assets were copied. The Matchday iteration adds an original generated court image, documented in [asset notes](PADELLY-ASSETS.md). Marketplace license and pricing terms would need checking if a template were actually purchased or remixed.

## Content and assets

The existing site is the content source. Real app screenshots already exist in `assets/screenshots` for English, German and Spanish, in light and dark variants. These are more useful than fabricated app mockups.

No verified public App Store URL was present in the website. The implementation keeps real exploration links rather than inventing a download link, price, release date, review count or award.

## Implemented photography

The Matchday version uses a generated court atmosphere image with genuine app screenshots layered over it. See [the final image prompt and asset provenance](PADELLY-ASSETS.md).
