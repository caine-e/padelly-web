# Search and AI visibility

Setup checked on 20 October 2026 for https://getpadelly.com/.

## Connected services

- Google Search Console: the `getpadelly.com` Domain property is verified through a public DNS TXT record in Cloudflare. Keep that record in place. The sitemap was submitted successfully and Google discovered all 18 included URLs.
- Google Search generative AI setting: inclusion is selected. The English homepage passed the live availability test. URL Inspection showed the English, German and Spanish homepages already indexed.
- Bing Webmaster Tools: Padelly is added and accessible, including its AI Performance report. The sitemap submission was accepted and is processing. Keep the public Bing verification CNAME and homepage `msvalidate.01` tags in place.

Google reports are still being initialized. Bing says new reports can take up to 48 hours. Sitemap discovery, indexing eligibility and AI inclusion do not guarantee rankings or citations.

## Website changes and safeguards

Each language URL now stays in its requested language, regardless of browser language or stored preferences. The visible language links still switch between equivalent pages. This avoids automatic redirects interfering with visitors or crawlers.

The three homepages explicitly describe Padelly as a padel scoring app for iPhone and Apple Watch. Their WebPage structured data connects the localized page to the app, website and publisher. Existing product details, visible support answers, breadcrumbs, canonical URLs and reciprocal language annotations remain in place.

The website serves complete HTML without depending on JavaScript for product content. Its optional Markdown representation contains the same public information. `llms.txt` is a maintained navigation aid, not a Google ranking mechanism. Public search crawlers are allowed; the existing GPTBot training opt-out remains separate.

Do not add invented ratings, reviews, prices, download destinations or product capabilities to structured data. Add an App Store link only once its public destination and availability are verified. Keep the legal notices out of the sitemap and retain their noindex policy.

## Validation

The build, all 25 tests and the 21-page site audit pass. All 21 production pages and 14 assets or discovery files match the built release. HTTP and www redirects point to the canonical HTTPS host. The live Markdown response and its content-negotiation headers were checked.

Private screenshots and live-check outputs are kept under ignored `qa-artifacts/seo/`, outside the published build.

## References

- [Google multilingual site guidance](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google generative AI optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google domain verification](https://support.google.com/webmasters/answer/34592)
- [Bing AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/)
