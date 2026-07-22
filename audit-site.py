#!/usr/bin/env python3
"""Read-only structural audit for the static Padelly website."""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse


ROOT = Path(__file__).resolve().parent
ORIGIN = "https://getpadelly.com"
ROBOTS_VALUE = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
LEGAL_ROBOTS_VALUE = "noindex, follow"
DEDICATION = "♥ Built with love by AI and dedicated to Katja, who is way out of my league, on and off the court."

GROUPS = [
    ("/", "/de/", "/es/"),
    ("/privacy/", "/de/privacy/", "/es/privacy/"),
    ("/support/", "/de/support/", "/es/support/"),
    ("/apple-watch-padel-scoring/", "/de/padel-zaehlen-mit-apple-watch/", "/es/marcador-de-padel-en-apple-watch/"),
    ("/padel-scoring-formats/", "/de/padel-zaehlweisen/", "/es/formatos-de-puntuacion-de-padel/"),
    ("/imprint/", "/de/impressum/", "/es/aviso-legal/"),
]

LEGAL_ROUTES = {"/imprint/", "/de/impressum/", "/es/aviso-legal/"}
PRIVACY_ROUTES = {"/privacy/", "/de/privacy/", "/es/privacy/"}

EXPECTED_HREFLANGS: dict[str, dict[str, str]] = {}
for en, de, es in GROUPS:
    mapping = {
        "en": ORIGIN + en,
        "de": ORIGIN + de,
        "es": ORIGIN + es,
        "x-default": ORIGIN + en,
    }
    for route in (en, de, es):
        EXPECTED_HREFLANGS[route] = mapping


def route_file(route: str) -> Path:
    return ROOT / route.lstrip("/") / "index.html" if route != "/" else ROOT / "index.html"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title_count = 0
        self.title_parts: list[str] = []
        self.in_title = False
        self.h1_count = 0
        self.metas: list[dict[str, str]] = []
        self.links: list[dict[str, str]] = []
        self.anchors: list[dict[str, str]] = []
        self.images: list[dict[str, str]] = []
        self.scripts: list[dict[str, str]] = []
        self.json_blocks: list[str] = []
        self._json_parts: list[str] | None = None
        self._hidden_depth = 0
        self.visible_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        if tag == "title":
            self.title_count += 1
            self.in_title = True
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "meta":
            self.metas.append(values)
        elif tag == "link":
            self.links.append(values)
        elif tag == "a":
            self.anchors.append(values)
        elif tag == "img":
            self.images.append(values)
        elif tag == "script":
            self.scripts.append(values)
            if values.get("type") == "application/ld+json":
                self._json_parts = []

        if tag in {"script", "style", "template"}:
            self._hidden_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False
        if tag == "script" and self._json_parts is not None:
            self.json_blocks.append("".join(self._json_parts))
            self._json_parts = None
        if tag in {"script", "style", "template"} and self._hidden_depth:
            self._hidden_depth -= 1

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)
        if self._json_parts is not None:
            self._json_parts.append(data)
        if not self._hidden_depth:
            self.visible_parts.append(data)


def normalized(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    return re.sub(r"\s+([.,;:!?])", r"\1", value)


def schema_objects(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from schema_objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from schema_objects(child)


def target_file(route: str, reference: str) -> Path | None:
    if reference.startswith(("mailto:", "tel:", "javascript:", "data:")):
        return None
    absolute = urljoin(ORIGIN + route, reference)
    parsed = urlparse(absolute)
    if parsed.netloc != "getpadelly.com":
        return None
    path = unquote(parsed.path)
    if path.endswith("/"):
        return ROOT / path.lstrip("/") / "index.html" if path != "/" else ROOT / "index.html"
    return ROOT / path.lstrip("/")


def main() -> int:
    errors: list[str] = []
    titles: dict[str, str] = {}
    descriptions: dict[str, str] = {}
    canonicals: set[str] = set()
    parsed_pages: dict[str, PageParser] = {}

    for route in EXPECTED_HREFLANGS:
        path = route_file(route)
        if not path.is_file():
            errors.append(f"{route}: missing {path.relative_to(ROOT)}")
            continue

        source = path.read_text(encoding="utf-8")
        parser = PageParser()
        parser.feed(source)
        parsed_pages[route] = parser
        title = normalized("".join(parser.title_parts))
        visible = normalized(" ".join(parser.visible_parts))

        if parser.title_count != 1:
            errors.append(f"{route}: expected one title, found {parser.title_count}")
        if parser.h1_count != 1:
            errors.append(f"{route}: expected one H1, found {parser.h1_count}")
        titles[route] = title

        desc_values = [m.get("content", "") for m in parser.metas if m.get("name") == "description"]
        if len(desc_values) != 1 or not desc_values[0]:
            errors.append(f"{route}: expected one non-empty meta description")
        else:
            descriptions[route] = desc_values[0]

        robots_values = [m.get("content", "") for m in parser.metas if m.get("name") == "robots"]
        expected_robots = LEGAL_ROBOTS_VALUE if route in LEGAL_ROUTES else ROBOTS_VALUE
        if robots_values != [expected_robots]:
            errors.append(f"{route}: incorrect robots meta")

        canonical_values = [l.get("href", "") for l in parser.links if l.get("rel") == "canonical"]
        expected_canonical = ORIGIN + route
        if canonical_values != [expected_canonical]:
            errors.append(f"{route}: canonical is not self-referencing")
        else:
            if route not in LEGAL_ROUTES:
                canonicals.add(expected_canonical)

        alternates = {
            link.get("hreflang", ""): link.get("href", "")
            for link in parser.links
            if link.get("rel") == "alternate" and link.get("hreflang")
        }
        if alternates != EXPECTED_HREFLANGS[route]:
            errors.append(f"{route}: hreflang cluster mismatch: {alternates}")

        meta_by_name = {m.get("name", ""): m.get("content", "") for m in parser.metas if m.get("name")}
        meta_by_property: dict[str, list[str]] = {}
        for meta in parser.metas:
            if meta.get("property"):
                meta_by_property.setdefault(meta["property"], []).append(meta.get("content", ""))
        for key in ["og:type", "og:site_name", "og:title", "og:description", "og:url", "og:locale", "og:image", "og:image:width", "og:image:height", "og:image:alt"]:
            if not meta_by_property.get(key):
                errors.append(f"{route}: missing {key}")
        if meta_by_property.get("og:url") != [expected_canonical]:
            errors.append(f"{route}: og:url differs from canonical")
        for key in ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]:
            if not meta_by_name.get(key):
                errors.append(f"{route}: missing {key}")
        if meta_by_name.get("twitter:card") != "summary_large_image":
            errors.append(f"{route}: incorrect Twitter card")

        if source.count(DEDICATION) != 1:
            errors.append(f"{route}: exact dedication is missing or duplicated")
        if re.search(r'href\s*=\s*["\']#["\']', source):
            errors.append(f"{route}: contains href=\"#\"")
        if re.search(r'<a[^>]+class=["\'][^"\']*store-badge', source):
            errors.append(f"{route}: store placeholder is an active link")
        if "mailto:" in source or "support@getpadelly.com" in source:
            errors.append(f"{route}: email address is not source-obfuscated")

        legal_route = "/de/impressum/" if route.startswith("/de/") else "/es/aviso-legal/" if route.startswith("/es/") else "/imprint/"
        legal_target = ORIGIN + legal_route
        footer_legal_links = [
            urljoin(ORIGIN + route, anchor.get("href", ""))
            for anchor in parser.anchors
            if anchor.get("href") and anchor.get("data-legal-link") == "true"
        ]
        if footer_legal_links != [legal_target]:
            errors.append(f"{route}: footer legal link is missing or incorrect")

        preference_scripts = [s for s in parser.scripts if s.get("src", "").endswith("assets/preferences.js")]
        site_scripts = [s for s in parser.scripts if s.get("src", "").endswith("assets/site.js")]
        if len(preference_scripts) != 1 or "defer" in preference_scripts[0]:
            errors.append(f"{route}: minimal preference script must be synchronous")
        if len(site_scripts) != 1 or "defer" not in site_scripts[0]:
            errors.append(f"{route}: interaction script must use defer")

        json_values = []
        for index, block in enumerate(parser.json_blocks, start=1):
            try:
                json_values.append(json.loads(block))
            except json.JSONDecodeError as exc:
                errors.append(f"{route}: JSON-LD block {index} is invalid: {exc}")
        if len(json_values) != 1:
            errors.append(f"{route}: expected one JSON-LD block")
        else:
            objects = list(schema_objects(json_values[0]))
            types = {
                item_type
                for obj in objects
                for item_type in (obj.get("@type") if isinstance(obj.get("@type"), list) else [obj.get("@type")])
                if item_type
            }
            forbidden = {"offers", "aggregateRating", "review", "downloadUrl"}
            for obj in objects:
                overlap = forbidden.intersection(obj)
                if overlap:
                    errors.append(f"{route}: forbidden schema keys {sorted(overlap)}")
            if route in {"/", "/de/", "/es/"}:
                if not {"Organization", "WebSite", "MobileApplication"}.issubset(types):
                    errors.append(f"{route}: landing schema graph is incomplete")
            else:
                if not {"WebPage", "BreadcrumbList"}.issubset(types):
                    errors.append(f"{route}: supporting-page schema is incomplete")
            should_have_faq = route in {"/support/", "/de/support/", "/es/support/"}
            if ("FAQPage" in types) != should_have_faq:
                errors.append(f"{route}: FAQPage presence is incorrect")
            if should_have_faq:
                faq_pages = [obj for obj in objects if obj.get("@type") == "FAQPage"]
                for faq in faq_pages:
                    for entity in faq.get("mainEntity", []):
                        question = normalized(entity.get("name", ""))
                        answer = normalized(entity.get("acceptedAnswer", {}).get("text", ""))
                        if question not in visible or answer not in visible:
                            errors.append(f"{route}: FAQ schema is not identical to visible content: {question}")

        language_targets = {
            anchor.get("data-value", ""): urljoin(ORIGIN + route, anchor.get("href", ""))
            for anchor in parser.anchors
            if anchor.get("role") == "menuitemradio" and anchor.get("data-value") in {"en", "de", "es"}
        }
        expected_languages = {key: value for key, value in EXPECTED_HREFLANGS[route].items() if key != "x-default"}
        if language_targets != expected_languages:
            errors.append(f"{route}: language picker mismatch: {language_targets}")

        references: list[tuple[str, str]] = []
        references.extend(("link", link.get("href", "")) for link in parser.links if link.get("href"))
        references.extend(("anchor", anchor.get("href", "")) for anchor in parser.anchors if anchor.get("href"))
        references.extend(("script", script.get("src", "")) for script in parser.scripts if script.get("src"))
        for image in parser.images:
            if image.get("src"):
                references.append(("image", image["src"]))
            if image.get("srcset"):
                references.extend(("image", item.strip().split()[0]) for item in image["srcset"].split(","))
        for kind, reference in references:
            local_target = target_file(route, reference)
            if local_target is not None and not local_target.exists():
                errors.append(f"{route}: broken {kind} reference {reference}")

    if len(set(titles.values())) != len(titles):
        errors.append("Page titles are not unique")
    if len(set(descriptions.values())) != len(descriptions):
        errors.append("Meta descriptions are not unique")

    sitemap_path = ROOT / "sitemap.xml"
    try:
        sitemap_root = ET.parse(sitemap_path).getroot()
        ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9", "x": "http://www.w3.org/1999/xhtml"}
        sitemap_urls: dict[str, ET.Element] = {}
        for url in sitemap_root.findall("s:url", ns):
            loc = url.findtext("s:loc", default="", namespaces=ns)
            sitemap_urls[loc] = url
        if set(sitemap_urls) != canonicals:
            errors.append("Sitemap URLs do not exactly match page canonicals")
        for canonical, element in sitemap_urls.items():
            route = urlparse(canonical).path
            expected_lastmod = "2026-07-22" if route in PRIVACY_ROUTES else "2026-07-18"
            if element.findtext("s:lastmod", default="", namespaces=ns) != expected_lastmod:
                errors.append(f"{route}: incorrect sitemap lastmod")
            alternates = {link.get("hreflang", ""): link.get("href", "") for link in element.findall("x:link", ns)}
            if alternates != EXPECTED_HREFLANGS.get(route):
                errors.append(f"{route}: sitemap hreflang mismatch")
            if element.find("s:priority", ns) is not None or element.find("s:changefreq", ns) is not None:
                errors.append(f"{route}: sitemap contains priority/changefreq")
    except (ET.ParseError, OSError) as exc:
        errors.append(f"sitemap.xml is invalid: {exc}")

    expected_robots = "User-agent: *\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: https://getpadelly.com/sitemap.xml\n"
    if (ROOT / "robots.txt").read_text(encoding="utf-8") != expected_robots:
        errors.append("robots.txt does not match the required policy")
    if (ROOT / "CNAME").exists():
        errors.append("CNAME must not exist yet")
    if not (ROOT / "assets/social/padelly-social-1200x630.jpg").is_file():
        errors.append("Social preview image is missing")

    if errors:
        print(f"FAIL: {len(errors)} issue(s)")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"PASS: {len(parsed_pages)} pages audited")
    print("- unique titles and descriptions")
    print("- self canonicals and reciprocal en/de/es/x-default hreflang")
    print("- required search/social metadata")
    print("- valid JSON-LD with visible support FAQs")
    print("- internal links, language pickers, scripts, images, sitemap, and robots")
    print("- exact dedication, legal links, source-obfuscated email, indexed sitemap, and legal noindex policy")
    print("- no href=\"#\", active store placeholder, or CNAME")
    return 0


if __name__ == "__main__":
    sys.exit(main())
