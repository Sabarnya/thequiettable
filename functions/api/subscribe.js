// Cloudflare Pages Function — POST /api/subscribe
// Securely subscribes an email to Buttondown using the real API.
// The API key is stored as a Cloudflare secret (BUTTONDOWN_API_KEY),
// never exposed in the browser. Returns a truthful success/failure.

export async function onRequestPost(context) {
  const { request, env } = context;

  const json = (obj, status) =>
    new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { "Content-Type": "application/json" }
    });

  // Read the email from the submitted form or JSON body.
  let email = "";
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await request.json();
      email = (body.email || "").trim();
    } else {
      const form = await request.formData();
      email = (form.get("email") || "").trim();
    }
  } catch (e) {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // Basic email sanity check.
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: "invalid_email" }, 400);
  }

  if (!env.BUTTONDOWN_API_KEY) {
    return json({ ok: false, error: "not_configured" }, 500);
  }

  // Call Buttondown's real API. Because this runs on the server, the firewall
  // sees a legitimate authenticated request and won't silently drop it.
  try {
    const res = await fetch("https://api.buttondown.com/v1/subscribers", {
      method: "POST",
      headers: {
        "Authorization": "Token " + env.BUTTONDOWN_API_KEY,
        "Content-Type": "application/json",
        "X-API-Version": "2026-01-01"
      },
      body: JSON.stringify({ email_address: email })
    });

    if (res.status === 201 || res.status === 200) {
      return json({ ok: true });
    }

    // Already subscribed — treat as success so the visitor isn't confused.
    let detail = "";
    try { detail = JSON.stringify(await res.json()); } catch (e) {}
    if (res.status === 400 && /already|exists|subscribed/i.test(detail)) {
      return json({ ok: true, already: true });
    }

    return json({ ok: false, error: "provider_error", status: res.status, detail }, 502);
  } catch (e) {
    return json({ ok: false, error: "network" }, 502);
  }
}

// Reject non-POST methods cleanly.
export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  return onRequestPost(context);
}