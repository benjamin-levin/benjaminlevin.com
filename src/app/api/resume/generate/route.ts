import { NextResponse } from "next/server";

// Resume tailor proxy. Forwards the user-supplied JD to the ai-assistant's
// resume-tailor sidecar service (a small aiohttp wrapper around the Python
// pipeline) and **streams the NDJSON progress events back unchanged** so
// the browser can show live phase + pct.
//
// Why a sidecar:
//   - The ai-assistant's tailor stack (MiniMax SDK, async asyncio, latexmk
//     + xelatex from MacTeX) won't run inside the website's Node-only
//     Docker image. A small Python service on the host is the cleanest
//     boundary.
//
// Env:
//   RESUME_TAILOR_URL — full URL to the sidecar's /tailor endpoint.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TAILOR_URL =
  process.env.NODE_ENV === "production"
    ? "http://host.docker.internal:8765/tailor"
    : "http://localhost:8765/tailor";

const TAILOR_URL = process.env.RESUME_TAILOR_URL || DEFAULT_TAILOR_URL;
const TAILOR_TIMEOUT_MS = 8 * 60 * 1000; // 8 min — JD-aware tailoring + xelatex compile is slow

const MAX_JD_LEN = 60_000;

export async function POST(req: Request) {
  let body: { jd?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("invalid JSON body", { status: 400 });
  }

  const jd = (body.jd || "").trim();
  if (!jd) return new NextResponse("missing jd", { status: 400 });
  if (jd.length > MAX_JD_LEN)
    return new NextResponse(`jd too long (${jd.length} > ${MAX_JD_LEN})`, { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TAILOR_TIMEOUT_MS);

  try {
    const upstream = await fetch(TAILOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jd }),
      signal: controller.signal,
      // @ts-expect-error — Node fetch supports `duplex: "half"` for streaming
      duplex: "half",
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return new NextResponse(
        `tailor sidecar returned ${upstream.status}: ${detail || "(no body)"}`,
        { status: 502 },
      );
    }

    if (!upstream.body) {
      return new NextResponse("tailor sidecar returned empty body", { status: 502 });
    }

    // Pass-through stream — keep upstream Content-Type so the client can
    // distinguish NDJSON vs. anything else.
    const ct = upstream.headers.get("content-type") || "application/x-ndjson";
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "AbortError";

    // Node fetch wraps the underlying network error in `cause` — drill
    // down so we can recognize ECONNREFUSED / ENOTFOUND.
    const collectCauses = (e: unknown, depth = 0): string => {
      if (depth > 4 || !e) return "";
      if (e instanceof Error) {
        const next = (e as Error & { cause?: unknown }).cause;
        const inner = next ? ` :: ${collectCauses(next, depth + 1)}` : "";
        const codeAttr = (e as { code?: string }).code ? ` [${(e as { code?: string }).code}]` : "";
        return `${e.message}${codeAttr}${inner}`;
      }
      return String(e);
    };
    const message = isAbort
      ? `tailor sidecar timed out after ${TAILOR_TIMEOUT_MS / 1000}s`
      : collectCauses(err);

    const refused = /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH/.test(message);
    return new NextResponse(
      refused
        ? "Resume tailor service is not running. Ben needs to start the sidecar locally for this feature to work."
        : `tailor request failed: ${message}`,
      { status: refused ? 503 : 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
