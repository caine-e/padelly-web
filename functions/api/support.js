const MAX_BODY_BYTES = 16_384;
const TURNSTILE_ACTION = "turnstile-spin-v2";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TOPICS = Object.freeze({
  app_issue: "App issue",
  privacy: "Privacy question",
  feedback: "Feedback",
  other: "Other",
});
const LOCALE_ROUTES = Object.freeze({
  en: "/support/",
  de: "/de/support/",
  es: "/es/support/",
});
const REQUIRED_ENV = [
  "TURNSTILE_SECRET",
  "CLOUDFLARE_EMAIL_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "SUPPORT_RECIPIENT",
];

function responseHeaders(contentType) {
  return {
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

function jsonResponse(status, code, ok = false) {
  return new Response(JSON.stringify({ ok, code }), {
    status,
    headers: responseHeaders("application/json; charset=utf-8"),
  });
}

function redirectResponse(locale, fragment) {
  const route = LOCALE_ROUTES[locale] || LOCALE_ROUTES.en;
  return new Response(null, {
    status: 303,
    headers: {
      ...responseHeaders("text/plain; charset=utf-8"),
      Location: `${route}#${fragment}`,
    },
  });
}

function clientResponse(request, locale, status, code, fragment, ok = false) {
  const acceptsHtml = (request.headers.get("Accept") || "").includes("text/html");
  return acceptsHtml
    ? redirectResponse(locale, fragment)
    : jsonResponse(status, code, ok);
}

function isAllowedHostname(hostname) {
  return hostname === "getpadelly.com"
    || hostname === "www.getpadelly.com"
    || hostname === "padelly-web.pages.dev"
    || hostname.endsWith(".padelly-web.pages.dev")
    || hostname === "localhost"
    || hostname === "127.0.0.1";
}

function isAllowedOrigin(value) {
  try {
    const origin = new URL(value);
    if (!isAllowedHostname(origin.hostname)) return false;
    if (origin.hostname === "localhost" || origin.hostname === "127.0.0.1") {
      return origin.protocol === "http:" || origin.protocol === "https:";
    }
    return origin.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function hasControlCharacters(value) {
  return /[\u0000-\u001F\u007F]/.test(value);
}

function hasUnsafeMessageCharacters(value) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
}

function validEmail(value) {
  return value.length <= 254
    && !hasControlCharacters(value)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readSingle(params, name) {
  const values = params.getAll(name);
  return values.length === 1 ? values[0] : null;
}

function parseSubmission(body) {
  const params = new URLSearchParams(body);
  const allowedFields = new Set([
    "name",
    "email",
    "topic",
    "message",
    "locale",
    "company",
    "cf-turnstile-response",
  ]);

  for (const key of params.keys()) {
    if (!allowedFields.has(key)) return null;
  }

  const nameValue = readSingle(params, "name");
  const emailValue = readSingle(params, "email");
  const topic = readSingle(params, "topic");
  const messageValue = readSingle(params, "message");
  const locale = readSingle(params, "locale");
  const companyValue = readSingle(params, "company");
  const token = readSingle(params, "cf-turnstile-response");

  if ([nameValue, emailValue, topic, messageValue, locale, companyValue, token].includes(null)) {
    return null;
  }

  const name = nameValue.trim();
  const email = emailValue.trim();
  const message = messageValue.trim();
  const company = companyValue.trim();

  if (name.length > 80 || hasControlCharacters(name)) return null;
  if (!validEmail(email)) return null;
  if (!Object.hasOwn(TOPICS, topic)) return null;
  if (message.length < 10 || message.length > 5_000 || hasUnsafeMessageCharacters(message)) return null;
  if (!Object.hasOwn(LOCALE_ROUTES, locale)) return null;
  if (company.length > 200 || hasControlCharacters(company)) return null;
  if (!token || token.length > 4_096 || hasControlCharacters(token)) return null;

  return { name, email, topic, message, locale, company, token };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

async function verifyTurnstile(submission, request, env, fetchImpl) {
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET,
    response: submission.token,
  });
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (clientIp) body.set("remoteip", clientIp);

  try {
    const response = await fetchImpl(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true
      && result.action === TURNSTILE_ACTION
      && typeof result.hostname === "string"
      && isAllowedHostname(result.hostname);
  } catch (_error) {
    return false;
  }
}

function emailPayload(submission, recipient) {
  const topic = TOPICS[submission.topic];
  const sender = ["support", "getpadelly.com"].join("@");
  const displayName = submission.name || "Not provided";
  const text = [
    `Topic: ${topic}`,
    `Language: ${submission.locale}`,
    `Name: ${displayName}`,
    `Reply email: ${submission.email}`,
    "",
    submission.message,
  ].join("\n");
  const html = [
    `<p><strong>Topic:</strong> ${escapeHtml(topic)}</p>`,
    `<p><strong>Language:</strong> ${escapeHtml(submission.locale)}</p>`,
    `<p><strong>Name:</strong> ${escapeHtml(displayName)}</p>`,
    `<p><strong>Reply email:</strong> ${escapeHtml(submission.email)}</p>`,
    `<p><strong>Message:</strong></p><p>${escapeHtml(submission.message).replace(/\r\n?|\n/g, "<br>")}</p>`,
  ].join("");

  return {
    to: recipient,
    from: { address: sender, name: "Padelly Support Form" },
    reply_to: submission.email,
    subject: `[Padelly Support] ${topic}`,
    text,
    html,
  };
}

async function sendSupportEmail(submission, env, fetchImpl) {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/email/sending/send`;
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_EMAIL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload(submission, env.SUPPORT_RECIPIENT)),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true;
  } catch (_error) {
    return false;
  }
}

export async function handleSupportRequest(context, fetchImpl = fetch) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse(405, "method_not_allowed");
  }

  const origin = request.headers.get("Origin");
  if (!origin || !isAllowedOrigin(origin) || origin !== new URL(request.url).origin) {
    return jsonResponse(403, "forbidden");
  }

  const contentType = (request.headers.get("Content-Type") || "").toLowerCase();
  if (!contentType.startsWith("application/x-www-form-urlencoded")) {
    return jsonResponse(415, "unsupported_media_type");
  }

  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    return jsonResponse(413, "request_too_large");
  }

  let body;
  try {
    body = await request.text();
  } catch (_error) {
    return jsonResponse(400, "invalid_request");
  }
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return jsonResponse(413, "request_too_large");
  }

  const rawParams = new URLSearchParams(body);
  const localeHint = rawParams.get("locale") || "en";
  if (rawParams.getAll("company").some((value) => value.trim())) {
    return clientResponse(request, localeHint, 200, "sent", "support-sent", true);
  }

  const submission = parseSubmission(body);
  if (!submission) {
    return clientResponse(request, localeHint, 400, "invalid_request", "support-error");
  }

  if (REQUIRED_ENV.some((key) => typeof env[key] !== "string" || !env[key])) {
    return clientResponse(request, submission.locale, 503, "unavailable", "support-error");
  }

  const verified = await verifyTurnstile(submission, request, env, fetchImpl);
  if (!verified) {
    return clientResponse(request, submission.locale, 403, "verification_failed", "support-error");
  }

  const sent = await sendSupportEmail(submission, env, fetchImpl);
  if (!sent) {
    return clientResponse(request, submission.locale, 503, "unavailable", "support-error");
  }

  return clientResponse(request, submission.locale, 200, "sent", "support-sent", true);
}

export function onRequest(context) {
  return handleSupportRequest(context);
}
