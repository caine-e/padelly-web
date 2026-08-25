import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { onRequest, prefersMarkdown } from "../functions/_middleware.js";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "text/html; charset=utf-8",
      "Vary": "Accept-Encoding",
    },
  });
}

async function middlewareResponse({
  accept = "text/html",
  body = "<main><h1>Padelly</h1><p>Score every point from Apple Watch.</p></main>",
  method = "GET",
  path = "/",
  status = 200,
  contentType = "text/html; charset=utf-8",
}) {
  const request = new Request(`https://getpadelly.com${path}`, {
    method,
    headers: { Accept: accept },
  });
  return onRequest({
    request,
    next: async () => new Response(body, {
      status,
      headers: { "Content-Type": contentType, "ETag": "\"static-html\"", "Vary": "Accept-Encoding" },
    }),
  });
}

test("Markdown is selected only when text/markdown is explicitly preferred", () => {
  assert.equal(prefersMarkdown("text/markdown"), true);
  assert.equal(prefersMarkdown("text/markdown, text/html;q=0.8"), true);
  assert.equal(prefersMarkdown("text/markdown, text/html"), true);
  assert.equal(prefersMarkdown("text/html, text/markdown"), false);
  assert.equal(prefersMarkdown("text/markdown;q=0.5, text/html;q=0.9"), false);
  assert.equal(prefersMarkdown("text/markdown;q=0, text/html"), false);
  assert.equal(prefersMarkdown("text/html, */*;q=0.8"), false);
  assert.equal(prefersMarkdown("application/json"), false);
});

test("a Markdown request receives Markdown, Vary: Accept, and an alternate link", async () => {
  const response = await middlewareResponse({
    accept: "text/markdown, text/html;q=0.8",
    body: "<main><h1>Padelly</h1><p>See <a href=\"/support/\">support</a>.</p></main>",
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  assert.match(response.headers.get("Vary"), /(^|,)\s*Accept(,|$)/);
  assert.match(response.headers.get("Vary"), /(^|,)\s*Accept-Encoding(,|$)/);
  assert.match(response.headers.get("Link"), /type="text\/html"/);
  assert.match(response.headers.get("Link"), /llms\.txt/);
  assert.equal(response.headers.get("ETag"), null);
  assert.equal(await response.text(), "# Padelly\n\nSee [support](https://getpadelly.com/support/).");
});

test("an HTML request remains HTML and still varies on Accept", async () => {
  const body = "<main><h1>Padelly</h1><p>Browser page.</p></main>";
  const response = await middlewareResponse({ body });

  assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.match(response.headers.get("Vary"), /(^|,)\s*Accept(,|$)/);
  assert.equal(await response.text(), body);
});

test("a missing path remains a real 404 and gives Markdown agents a useful body", async () => {
  const response = await middlewareResponse({
    accept: "text/markdown",
    path: "/missing-agent-check/",
    status: 404,
    body: "<main><h1>Page not found</h1></main>",
  });

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  assert.match(response.headers.get("Vary"), /(^|,)\s*Accept(,|$)/);
  const body = await response.text();
  assert.match(body, /^# 404 Not Found/m);
  assert.match(body, /llms\.txt/);
  assert.match(body, /sitemap\.xml/);
});

test("an unsupported explicit Accept header receives 406 instead of an HTML fallback", async () => {
  const response = await middlewareResponse({ accept: "application/json" });

  assert.equal(response.status, 406);
  assert.equal(response.headers.get("Content-Type"), "text/plain; charset=utf-8");
  assert.match(response.headers.get("Vary"), /(^|,)\s*Accept(,|$)/);
  assert.match(await response.text(), /Request text\/html or text\/markdown/);
});

test("non-HTML and non-GET responses are left to their existing handlers", async () => {
  const asset = await middlewareResponse({
    accept: "text/markdown",
    path: "/assets/site.js",
    body: "console.log('Padelly')",
    contentType: "text/javascript; charset=utf-8",
  });
  assert.equal(asset.headers.get("Content-Type"), "text/javascript; charset=utf-8");
  assert.equal(await asset.text(), "console.log('Padelly')");

  const post = await middlewareResponse({
    accept: "text/markdown",
    method: "POST",
    path: "/api/support",
    body: '{"ok":true}',
    contentType: "application/json; charset=utf-8",
  });
  assert.equal(post.headers.get("Content-Type"), "application/json; charset=utf-8");
  assert.equal(await post.text(), '{"ok":true}');
});

test("agent-facing files, trust pages, sitemap, build output, and Organization schema stay complete", async () => {
  const [llms, notFound, routesSource, build, sitemap, home, ...aboutPages] = await Promise.all([
    source("llms.txt"),
    source("404.html"),
    source("_routes.json"),
    source("build.sh"),
    source("sitemap.xml"),
    source("index.html"),
    source("about/index.html"),
    source("de/ueber-padelly/index.html"),
    source("es/sobre-padelly/index.html"),
  ]);

  assert.match(llms, /^# Padelly\n\n> /);
  assert.match(llms, /## When to use Padelly\n\n- \[Padelly overview\]/);
  assert.match(llms, /https:\/\/getpadelly\.com\/about\//);
  assert.match(notFound, /Page not found/);
  assert.match(notFound, /href="\/llms\.txt"/);
  assert.match(notFound, /href="\/sitemap\.xml"/);

  const routes = JSON.parse(routesSource);
  assert.deepEqual(routes.include, ["/*"]);
  for (const excludedPath of ["/assets/*", "/llms.txt", "/robots.txt", "/sitemap.xml"]) {
    assert.ok(routes.exclude.includes(excludedPath));
  }
  for (const item of ["404.html", "_routes.json", "about", "llms.txt"]) {
    assert.match(build, new RegExp(`\\b${item.replace(".", "\\.")}\\b`));
  }
  for (const url of [
    "https://getpadelly.com/about/",
    "https://getpadelly.com/de/ueber-padelly/",
    "https://getpadelly.com/es/sobre-padelly/",
  ]) {
    assert.match(sitemap, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const page of aboutPages) {
    const visible = page.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    assert.ok(visible.length >= 500);
    assert.match(page, /"AboutPage"/);
  }

  const jsonLd = home.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)?.[1];
  assert.ok(jsonLd, "homepage JSON-LD must exist");
  const organization = JSON.parse(jsonLd)["@graph"].find((item) => item["@type"] === "Organization");
  assert.equal(organization.url, "https://getpadelly.com/");
  assert.equal(organization.logo.url, "https://getpadelly.com/assets/icons/classic-white-512.webp");
  assert.equal(organization.address["@type"], "PostalAddress");
  assert.equal(organization.address.addressLocality, "Leipzig");
  assert.equal(organization.contactPoint[0].contactType, "customer support");
  assert.equal(organization.contactPoint[0].email, ["support", "getpadelly.com"].join("@"));
});
