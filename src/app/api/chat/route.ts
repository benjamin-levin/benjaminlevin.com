import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { recordChatMessage } from "@/lib/db";
import { getChatHealth, markChatUnhealthy } from "@/lib/chat-health";

const rateLimit = new Map<string, { count: number; expires: number }>();
const MAX_REQUESTS_PER_MINUTE = 10;
const WINDOW_MS = 60 * 1000;

type ChatEventContentPart = string | { text?: string };
type ChatEventItem = {
  type?: string;
  text?: string;
  content?: string | ChatEventContentPart[];
  message?: string;
  delta?: { text?: string };
};
type ChatEvent = {
  type?: string;
  delta?: string | { text?: string };
  item?: ChatEventItem;
  text?: string;
  message?: string;
  error?: { message?: string };
};

// A model attempt: either a named profile, or a bare `-c` config override
// chain (no profile, since codex's --profile overrides any -c flags).
type Attempt = {
  label: string;
  profile?: string;
  overrides?: string[];
};

// Primary: GPT-5.6 Luna with low reasoning — fast enough for portfolio chat.
// Fallback: Codex Spark, tried only when the primary fails with a transient
// quota/rate-limit error before any text has streamed (see isRetriable).
const ATTEMPTS: Attempt[] = [
  {
    label: "gpt-5.6-luna",
    overrides: ['model="gpt-5.6-luna"', 'model_reasoning_effort="low"'],
  },
  {
    label: "gpt-5.3-codex-spark",
    overrides: ['model="gpt-5.3-codex-spark"', 'model_reasoning_effort="low"'],
  },
];

// A rate-limit / quota error from codex that we should fall back on. Anything
// else (auth, missing profile, network) means the secondary won't recover —
// surface and stop.
function isRetriable(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("usage limit") ||
    m.includes("rate limit") ||
    m.includes("quota") ||
    m.includes("try again at")
  );
}

export async function POST(req: Request) {
  if (process.env.NEXT_PUBLIC_ENABLE_CHATBOT !== "true") {
    return NextResponse.json({ error: "Disabled" }, { status: 403 });
  }

  const { healthy } = getChatHealth();
  if (!healthy) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  const { prompt, sessionId } = await req.json();
  if (!prompt || !sessionId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const fingerprint = `${ip}_${sessionId}`;
  const now = Date.now();
  const limitRecord = rateLimit.get(fingerprint) || { count: 0, expires: now + WINDOW_MS };

  if (now > limitRecord.expires) {
    limitRecord.count = 1;
    limitRecord.expires = now + WINDOW_MS;
  } else {
    limitRecord.count++;
  }
  rateLimit.set(fingerprint, limitRecord);

  if (limitRecord.count > MAX_REQUESTS_PER_MINUTE) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  try { recordChatMessage(sessionId, ip); } catch { /* non-critical */ }

  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_]/g, "");
  const sessionDir = path.join("/tmp/blevin_chat_sessions", safeSessionId);
  const contextSource = path.join(process.cwd(), "BEN_CONTEXT.md");
  const contextDest = path.join(sessionDir, "BEN_CONTEXT.md");

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        await fs.mkdir(sessionDir, { recursive: true });
        let contextText = "";
        try {
          contextText = await fs.readFile(contextSource, "utf8");
        } catch {
          markChatUnhealthy("context_file_missing");
          controller.enqueue(encoder.encode(`\n[Error: context file is missing]\n`));
          controller.close();
          return;
        }
        await fs.writeFile(contextDest, contextText, "utf8");

        const wrappedPrompt = buildPrompt(contextText, prompt);

        // Run attempts in order. If the first emits real text before failing,
        // we keep that output and don't fall back. If the first fails before
        // any text was streamed AND the failure looks transient (rate limit
        // / quota), retry with the next attempt.
        let everSentText = false;
        let lastErrorMsg: string | null = null;

        for (let i = 0; i < ATTEMPTS.length; i++) {
          const attempt = ATTEMPTS[i];
          const result = await runAttempt({
            attempt,
            sessionDir,
            wrappedPrompt,
            onText: (chunk) => {
              if (!chunk) return;
              everSentText = true;
              controller.enqueue(encoder.encode(chunk));
            },
          });

          if (result.kind === "ok") {
            break;
          }

          // result.kind === "error"
          lastErrorMsg = result.message;
          if (everSentText) {
            // Already streamed partial output to user; don't fall back, just stop.
            break;
          }
          if (i < ATTEMPTS.length - 1 && isRetriable(result.message)) {
            // Try next attempt silently (no error text emitted yet).
            continue;
          }
          // Out of attempts or non-retriable error.
          markChatUnhealthy("codex_runtime_error");
          controller.enqueue(encoder.encode(`\n[Error] ${truncateError(result.message)}\n`));
          break;
        }

        if (!everSentText && !lastErrorMsg) {
          // Codex closed cleanly with no output and no error — treat as failure.
          markChatUnhealthy("codex_runtime_error");
          controller.enqueue(encoder.encode(`\n[Error] Empty response from assistant.\n`));
        }
      } catch {
        markChatUnhealthy("connection_failed");
        controller.enqueue(encoder.encode(`\n[Error: Connection failed]`));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

function buildPrompt(contextText: string, userMessage: string): string {
  return `You are Ben Levin's personal portfolio assistant on benjaminlevin.com. Visitors are recruiters, hiring managers, founders, and engineers evaluating Ben for senior or founding-level roles in AI/ML, robotics, or quant.

Use the BEN_CONTEXT below as your sole source of truth. Answer naturally, in third-person about Ben ("Ben built X", "Ben led Y") — you are the assistant, not Ben.

RULES:
- Be specific. Cite real projects (PRSM, Sovlscan, Formulatrix carousel, Tesla Optimus, En Passant, etc.) with concrete details from the context.
- Be concise. 2–4 short paragraphs unless the visitor asks for depth.
- Never mention "context files", "documentation", or "my rules". Just speak as if you know Ben.
- Never invent projects, employers, dates, numbers, or technologies that aren't in the context. If asked about something not in your knowledge, say "I don't have detail on that — best to ask Ben directly via the contact links."
- For contact: surface email and LinkedIn freely. Ben's phone is intentionally not in your knowledge — don't speculate; redirect to email/LinkedIn.
- For Sovlscan strategy specifics (alpha, hyperparameters, regime taxonomy): the context explicitly withholds these. Say so plainly — "Ben withholds the specifics; engineering tradeoffs are fair game in interview."
- Stay on Ben's professional background. Politely deflect off-topic requests.

BEN_CONTEXT:
<BEN_CONTEXT>
${contextText}
</BEN_CONTEXT>

Visitor message:
${userMessage}`;
}

type AttemptResult = { kind: "ok" } | { kind: "error"; message: string };

function runAttempt(opts: {
  attempt: Attempt;
  sessionDir: string;
  wrappedPrompt: string;
  onText: (chunk: string) => void;
}): Promise<AttemptResult> {
  const { attempt, sessionDir, wrappedPrompt, onText } = opts;

  return new Promise<AttemptResult>((resolve) => {
    // -c overrides come BEFORE the exec subcommand. --profile is omitted
    // when overrides are supplied, because codex's --profile resolution
    // wins over any -c flags (verified empirically — passing both leaves
    // the profile model in effect).
    const args: string[] = [];
    for (const override of attempt.overrides ?? []) {
      args.push("-c", override);
    }
    args.push("exec", "--skip-git-repo-check", "--json");
    if (attempt.profile) {
      args.push("--profile", attempt.profile);
    }
    args.push("-");

    let proc: ChildProcessWithoutNullStreams;
    try {
      proc = spawn("codex", args, { cwd: sessionDir, shell: false });
    } catch (err) {
      resolve({ kind: "error", message: `spawn failed: ${(err as Error).message}` });
      return;
    }

    proc.stdin.write(wrappedPrompt);
    proc.stdin.end();

    let buffer = "";
    let fullTextSent = "";
    let errorMessage: string | null = null;
    let resolved = false;

    const finish = (result: AttemptResult) => {
      if (resolved) return;
      resolved = true;
      try { proc.kill(); } catch { /* noop */ }
      resolve(result);
    };

    const overlapAtTail = (sent: string, incoming: string): number => {
      const max = Math.min(sent.length, incoming.length);
      for (let i = max; i > 0; i--) {
        if (sent.endsWith(incoming.slice(0, i))) return i;
      }
      return 0;
    };

    const enqueueDeduped = (incoming: unknown, mode: "delta" | "final") => {
      if (typeof incoming !== "string" || !incoming) return;
      let nextChunk = incoming;
      if (nextChunk.startsWith(fullTextSent)) {
        nextChunk = nextChunk.slice(fullTextSent.length);
      } else if (fullTextSent) {
        const overlap = overlapAtTail(fullTextSent, nextChunk);
        const overlapRatio = overlap / nextChunk.length;
        const shouldTrim = overlap > 0 && (mode === "final" ? overlapRatio >= 0.35 : overlapRatio >= 0.75);
        if (shouldTrim) nextChunk = nextChunk.slice(overlap);
      }
      if (!nextChunk) return;
      onText(nextChunk);
      fullTextSent += nextChunk;
    };

    const extractItemText = (item?: ChatEventItem): string => {
      if (!item) return "";
      if (typeof item.text === "string") return item.text;
      if (typeof item.content === "string") return item.content;
      if (typeof item.message === "string") return item.message;
      if (Array.isArray(item.content)) {
        return item.content.map((part) => {
          if (!part) return "";
          if (typeof part === "string") return part;
          if (typeof part.text === "string") return part.text;
          return "";
        }).join("");
      }
      return "";
    };

    proc.stdout.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const json = JSON.parse(trimmed) as ChatEvent;
          const type = json.type || "";

          if (type.endsWith(".delta")) {
            let delta = "";
            if (typeof json.delta === "string") delta = json.delta;
            else if (json.delta?.text) delta = json.delta.text;
            else if (json.item?.delta?.text) delta = json.item.delta.text;
            else if (typeof json.text === "string") delta = json.text;
            enqueueDeduped(delta, "delta");
          } else if (type === "item.completed" && json.item) {
            const itemType = json.item.type || "";
            if (["agent_message", "assistant_message", "output_text", "message"].includes(itemType)) {
              enqueueDeduped(extractItemText(json.item), "final");
            }
          } else if (type === "error" || type === "turn.failed") {
            errorMessage = json.message || json.error?.message || "Error";
          }
        } catch { /* skip malformed line */ }
      }
    });

    proc.stderr.on("data", () => { /* swallow */ });

    proc.on("close", () => {
      if (errorMessage && !fullTextSent) {
        finish({ kind: "error", message: errorMessage });
      } else if (errorMessage && fullTextSent) {
        // Mid-stream failure — return ok since we already sent useful output.
        finish({ kind: "ok" });
      } else {
        finish({ kind: "ok" });
      }
    });

    proc.on("error", (err) => {
      finish({ kind: "error", message: err.message });
    });
  });
}

function truncateError(s: string): string {
  // Codex stuffs a JSON blob inside its error.message — pull out just the
  // human-readable bit if we can.
  try {
    const parsed = JSON.parse(s);
    return parsed?.error?.message ?? parsed?.message ?? s.slice(0, 200);
  } catch {
    return s.length > 200 ? s.slice(0, 200) + "…" : s;
  }
}
