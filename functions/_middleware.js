const MARKDOWN_DOCUMENT_PATHS = new Set([
  "/",
  "/about/",
  "/apple-watch-padel-scoring/",
  "/padel-scoring-formats/",
  "/privacy/",
  "/support/",
  "/imprint/",
  "/de/",
  "/de/ueber-padelly/",
  "/de/padel-zaehlen-mit-apple-watch/",
  "/de/padel-zaehlweisen/",
  "/de/privacy/",
  "/de/support/",
  "/de/impressum/",
  "/es/",
  "/es/sobre-padelly/",
  "/es/marcador-de-padel-en-apple-watch/",
  "/es/formatos-de-puntuacion-de-padel/",
  "/es/privacy/",
  "/es/support/",
  "/es/aviso-legal/",
]);

function splitHeader(value, delimiter) {
  const parts = [];
  let start = 0;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
    } else if (character === "\"" || character === "'") {
      quote = character;
    } else if (character === delimiter) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(value.slice(start));
  return parts;
}

function parseAcceptHeader(value) {
  if (!value) return [];

  return splitHeader(value, ",").flatMap((part, index) => {
    const [mediaRange, ...parameterParts] = splitHeader(part, ";");
    const [type = "", subtype = ""] = mediaRange.trim().toLowerCase().split("/");
    if (!type || !subtype) return [];

    let quality = 1;
    for (const parameterPart of parameterParts) {
      const [name, rawValue = ""] = parameterPart.trim().split("=", 2);
      if (name.toLowerCase() !== "q") continue;
      const parsed = Number(rawValue.trim().replace(/^"|"$/g, ""));
      quality = Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
    }

    return [{ type, subtype, quality, index }];
  });
}

function qualityFor(entries, type, subtype) {
  let best;

  for (const entry of entries) {
    if (entry.type !== "*" && entry.type !== type) continue;
    if (entry.subtype !== "*" && entry.subtype !== subtype) continue;

    const specificity = entry.type === "*" ? 0 : entry.subtype === "*" ? 1 : 2;
    if (!best || specificity > best.specificity || (specificity === best.specificity && entry.index < best.index)) {
      best = { ...entry, specificity };
    }
  }

  return best || { quality: 0, specificity: -1, index: Number.MAX_SAFE_INTEGER };
}

function preferredRepresentation(acceptHeader) {
  if (!acceptHeader) return "html";
  const entries = parseAcceptHeader(acceptHeader);
  const markdown = qualityFor(entries, "text", "markdown");
  const html = qualityFor(entries, "text", "html");

  // A wildcard alone is not a request for Markdown. Browsers commonly send one.
  if (markdown.specificity === 2 && markdown.quality > 0) {
    if (markdown.quality > html.quality) return "markdown";
    if (markdown.quality === html.quality && (markdown.specificity > html.specificity || markdown.index < html.index)) {
      return "markdown";
    }
  }
  return html.quality > 0 ? "html" : null;
}

export function prefersMarkdown(acceptHeader) {
  return preferredRepresentation(acceptHeader) === "markdown";
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
  };

  return value
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
      const lower = entity.toLowerCase();
      if (named[lower]) return named[lower];
      const base = lower.startsWith("#x") ? 16 : 10;
      const numeric = Number.parseInt(lower.slice(base === 16 ? 2 : 1), base);
      if (!Number.isInteger(numeric) || numeric < 0 || numeric > 0x10ffff) return match;
      try {
        return String.fromCodePoint(numeric);
      } catch (_error) {
        return match;
      }
    })
    .replace(/\u00a0/g, " ");
}

function attributeValue(attributes, name) {
  const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? match[1] || match[2] || match[3] || "" : "";
}

function inlineMarkdown(value, pageUrl) {
  const withLinks = value.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_match, attributes, label) => {
    const href = attributeValue(attributes, "href");
    const text = inlineMarkdown(label, pageUrl);
    if (!href || !text) return text;
    try {
      return `[${text.replace(/([\[\]])/g, "\\$1")}](${new URL(decodeEntities(href), pageUrl).href})`;
    } catch (_error) {
      return text;
    }
  });

  return decodeEntities(withLinks)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

export function htmlToMarkdown(html, pageUrl) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  let content = main
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(input|textarea|select|button)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(input|img|source|meta|link)\b[^>]*\/?\s*>/gi, "");

  for (let level = 1; level <= 6; level += 1) {
    const expression = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi");
    content = content.replace(expression, (_match, text) => `\n${"#".repeat(level)} ${inlineMarkdown(text, pageUrl)}\n`);
  }

  content = content
    .replace(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi, (_match, text) => `\n## ${inlineMarkdown(text, pageUrl)}\n`)
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_match, text) => `\n- ${inlineMarkdown(text, pageUrl)}`)
    .replace(/<(p|figcaption|dt|dd)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_match, _tag, text) => `\n${inlineMarkdown(text, pageUrl)}\n`)
    .replace(/<\/(section|article|header|details|div|ul|ol|figure)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  const markdown = inlineMarkdown(content, pageUrl)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "");

  const firstHeading = markdown.match(/^([\s\S]*?)\n\n(# [^\n]+(?:\n[^\n#][^\n]*)?)([\s\S]*)$/);
  if (firstHeading && firstHeading[1].trim()) {
    return `${firstHeading[2]}\n\n${firstHeading[1].trim()}${firstHeading[3]}`.replace(/\n{3,}/g, "\n\n").trim();
  }

  return markdown || `# Padelly\n\n[Open the canonical page](${pageUrl})`;
}

function mergeVary(currentValue) {
  const values = (currentValue || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const names = new Map(values.map((value) => [value.toLowerCase(), value]));
  names.set("accept", "Accept");
  names.set("accept-encoding", "Accept-Encoding");
  return [...names.values()].join(", ");
}

function negotiationHeaders(response, pageUrl, alternateType) {
  const headers = new Headers(response.headers);
  const origin = new URL(pageUrl).origin;
  const links = [headers.get("Link"), `<${pageUrl}>; rel="alternate"; type="${alternateType}"`, `<${origin}/llms.txt>; rel="describedby"; type="text/markdown"`]
    .filter(Boolean)
    .join(", ");

  headers.set("Vary", mergeVary(headers.get("Vary")));
  headers.set("Link", links);
  return headers;
}

function responseWithHeaders(response, headers) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function markdownNotFound(request) {
  const origin = new URL(request.url).origin;
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
    "Link": `<${origin}/llms.txt>; rel="describedby"; type="text/markdown"`,
    "Vary": "Accept, Accept-Encoding",
  });
  const body = [
    "# 404 Not Found",
    "",
    "This URL is not a public Padelly resource.",
    "",
    `- [Agent guidance](${origin}/llms.txt)`,
    `- [Sitemap](${origin}/sitemap.xml)`,
    `- [Padelly](${origin}/)`,
  ].join("\n");

  return new Response(request.method === "HEAD" ? null : body, { status: 404, headers });
}

function notAcceptable(request) {
  const origin = new URL(request.url).origin;
  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "Link": `<${origin}/llms.txt>; rel="describedby"; type="text/markdown"`,
    "Vary": "Accept, Accept-Encoding",
  });
  const body = "Not Acceptable. Request text/html or text/markdown for this Padelly page.\n";
  return new Response(request.method === "HEAD" ? null : body, { status: 406, headers });
}

function markdownResponse(request, response, pageUrl) {
  const headers = negotiationHeaders(response, pageUrl, "text/html");
  headers.set("Content-Type", "text/markdown; charset=utf-8");
  headers.delete("Content-Length");
  headers.delete("ETag");
  headers.delete("Last-Modified");

  if (request.method === "HEAD") {
    return new Response(null, { status: response.status, statusText: response.statusText, headers });
  }

  return response.text().then((html) => new Response(htmlToMarkdown(html, pageUrl), {
    status: response.status,
    statusText: response.statusText,
    headers,
  }));
}

export async function onRequest(context) {
  const response = await context.next();
  const { request } = context;
  if (request.method !== "GET" && request.method !== "HEAD") return response;

  const pageUrl = new URL(request.url);
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("text/html")) return response;

  const isDocument = MARKDOWN_DOCUMENT_PATHS.has(normalizePathname(pageUrl.pathname));
  if (response.status === 404 && prefersMarkdown(request.headers.get("Accept"))) {
    return markdownNotFound(request);
  }
  const representation = isDocument && response.ok ? preferredRepresentation(request.headers.get("Accept")) : "html";
  if (representation === null) return notAcceptable(request);

  if (representation === "markdown") {
    if (response.ok && isDocument) {
      return markdownResponse(request, response, pageUrl.href);
    }
  }

  return responseWithHeaders(response, negotiationHeaders(response, pageUrl.href, "text/markdown"));
}

function normalizePathname(pathname) {
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}
