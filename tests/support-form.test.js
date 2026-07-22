import assert from "node:assert/strict";
import test from "node:test";

import { handleSupportRequest } from "../functions/api/support.js";

const ENV = Object.freeze({
  TURNSTILE_SECRET: "test-turnstile-secret",
  CLOUDFLARE_EMAIL_API_TOKEN: "test-email-token",
  CLOUDFLARE_ACCOUNT_ID: "test-account",
  SUPPORT_RECIPIENT: "owner@example.com",
});

function formBody(overrides = {}) {
  return new URLSearchParams({
    name: "Alex Player",
    email: "alex@example.com",
    topic: "app_issue",
    message: "The score did not update after undo.",
    locale: "en",
    company: "",
    "cf-turnstile-response": "valid-token",
    ...overrides,
  }).toString();
}

function requestFor(body = formBody(), overrides = {}) {
  return new Request("https://getpadelly.com/api/support", {
    method: overrides.method || "POST",
    headers: {
      Accept: overrides.accept || "application/json",
      "Content-Type": overrides.contentType || "application/x-www-form-urlencoded;charset=UTF-8",
      Origin: overrides.origin || "https://getpadelly.com",
      "CF-Connecting-IP": "192.0.2.1",
      ...(overrides.headers || {}),
    },
    body: (overrides.method || "POST") === "GET" ? undefined : body,
  });
}

function successfulFetch(capture = {}) {
  return async (url, init) => {
    if (url.includes("challenges.cloudflare.com")) {
      capture.turnstile = { url, init };
      return Response.json({
        success: true,
        action: "turnstile-spin-v2",
        hostname: "getpadelly.com",
      });
    }
    capture.email = { url, init };
    return Response.json({ success: true, result: { delivered: [ENV.SUPPORT_RECIPIENT] } });
  };
}

test("valid submissions are verified and sent with fixed delivery fields", async () => {
  const capture = {};
  const body = formBody({
    name: "<Alex>",
    message: "Undo showed <script>alert(1)</script> instead.\nSecond line.",
  });
  const response = await handleSupportRequest(
    { request: requestFor(body), env: ENV },
    successfulFetch(capture),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, code: "sent" });

  const turnstileBody = capture.turnstile.init.body;
  assert.equal(turnstileBody.get("secret"), ENV.TURNSTILE_SECRET);
  assert.equal(turnstileBody.get("response"), "valid-token");
  assert.equal(turnstileBody.get("remoteip"), "192.0.2.1");

  const email = JSON.parse(capture.email.init.body);
  assert.equal(email.to, ENV.SUPPORT_RECIPIENT);
  assert.equal(email.from.address, ["support", "getpadelly.com"].join("@"));
  assert.equal(email.reply_to, "alex@example.com");
  assert.match(email.html, /&lt;Alex&gt;/);
  assert.match(email.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(email.html, /instead\.<br>Second line\./);
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.text, /Undo showed <script>alert\(1\)<\/script> instead\./);
  assert.equal(capture.email.init.headers.Authorization, `Bearer ${ENV.CLOUDFLARE_EMAIL_API_TOKEN}`);
});

test("invalid and duplicate fields are rejected before external requests", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return Response.json({ success: true });
  };
  const invalidBodies = [
    formBody({ email: "not-an-email" }),
    formBody({ topic: "billing" }),
    formBody({ message: "short" }),
    `${formBody()}&email=second%40example.com`,
    `${formBody()}&unexpected=value`,
  ];

  for (const body of invalidBodies) {
    const response = await handleSupportRequest({ request: requestFor(body), env: ENV }, fetchImpl);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, code: "invalid_request" });
  }
  assert.equal(calls, 0);
});

test("wrong origins, methods, media types, and oversized bodies are rejected", async () => {
  const noFetch = async () => assert.fail("external request must not run");

  const wrongOrigin = await handleSupportRequest({
    request: requestFor(formBody(), { origin: "https://attacker.example" }),
    env: ENV,
  }, noFetch);
  assert.equal(wrongOrigin.status, 403);

  const allowedButNotSameOrigin = await handleSupportRequest({
    request: requestFor(formBody(), { origin: "https://preview.padelly-web.pages.dev" }),
    env: ENV,
  }, noFetch);
  assert.equal(allowedButNotSameOrigin.status, 403);

  const wrongMethod = await handleSupportRequest({
    request: requestFor("", { method: "GET" }),
    env: ENV,
  }, noFetch);
  assert.equal(wrongMethod.status, 405);

  const wrongType = await handleSupportRequest({
    request: requestFor(formBody(), { contentType: "application/json" }),
    env: ENV,
  }, noFetch);
  assert.equal(wrongType.status, 415);

  const oversized = await handleSupportRequest({
    request: requestFor(`message=${"x".repeat(17_000)}`),
    env: ENV,
  }, noFetch);
  assert.equal(oversized.status, 413);
});

test("honeypot submissions receive success without validation, verification, or email", async () => {
  const response = await handleSupportRequest({
    request: requestFor("locale=es&company=Spam+Incorporated&unexpected=value"),
    env: ENV,
  }, async () => assert.fail("external request must not run"));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, code: "sent" });
});

test("failed Turnstile checks, wrong actions, and wrong hostnames never send email", async () => {
  const results = [
    { success: false, action: "turnstile-spin-v2", hostname: "getpadelly.com" },
    { success: true, action: "different-action", hostname: "getpadelly.com" },
    { success: true, action: "turnstile-spin-v2", hostname: "attacker.example" },
  ];

  for (const result of results) {
    let calls = 0;
    const response = await handleSupportRequest(
      { request: requestFor(), env: ENV },
      async () => {
        calls += 1;
        return Response.json(result);
      },
    );
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { ok: false, code: "verification_failed" });
    assert.equal(calls, 1);
  }
});

test("email service failures return a generic secret-free response", async () => {
  let calls = 0;
  const response = await handleSupportRequest(
    { request: requestFor(), env: ENV },
    async () => {
      calls += 1;
      if (calls === 1) {
        return Response.json({ success: true, action: "turnstile-spin-v2", hostname: "getpadelly.com" });
      }
      return Response.json({ success: false, errors: [{ message: "provider detail" }] }, { status: 500 });
    },
  );

  assert.equal(response.status, 503);
  const body = await response.text();
  assert.equal(body, JSON.stringify({ ok: false, code: "unavailable" }));
  assert.doesNotMatch(body, /provider detail|test-email-token|test-turnstile-secret/);
});

test("native form submissions receive localized safe redirects", async () => {
  const response = await handleSupportRequest(
    {
      request: requestFor(formBody({ locale: "de" }), { accept: "text/html" }),
      env: ENV,
    },
    successfulFetch(),
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("Location"), "/de/support/#support-sent");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("missing runtime secrets fail closed", async () => {
  const response = await handleSupportRequest(
    { request: requestFor(), env: { ...ENV, TURNSTILE_SECRET: "" } },
    async () => assert.fail("external request must not run"),
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, code: "unavailable" });
});
