"use client";

import { useEffect, useRef, useState } from "react";

// Resume Generator button + modal.
//
// Posts the user's job description (text or URL) to /api/resume/generate,
// which streams NDJSON progress events from the Python tailor sidecar.
// The modal parses each event live and shows the current pipeline stage,
// a smooth progress bar, and a recent-events tail so the user knows the
// page hasn't frozen during the ~60s tailor + xelatex compile.

type Stage =
  | "idle"
  | "submitting"
  | "received"
  | "resolving_jd"
  | "tailoring_start"
  | "planning"
  | "drafting"
  | "summary"
  | "rendering"
  | "compiling"
  | "encoding"
  | "result"
  | "success"
  | "error";

type ProgressEvent =
  | { type: "progress"; stage: string; label: string; pct: number }
  | { type: "result"; filename: string; pdf_base64: string; pct: number }
  | { type: "error"; stage: string; message: string }
  | { type: "heartbeat" };

const PHASES = [
  { key: "received",        label: "Received",          pct: 1 },
  { key: "resolving_jd",    label: "Resolving JD",      pct: 5 },
  { key: "tailoring_start", label: "Loading corpus",    pct: 8 },
  { key: "planning",        label: "Planning (LLM 1)",  pct: 15 },
  { key: "drafting",        label: "Drafting bullets",  pct: 35 },
  { key: "summary",         label: "Writing summary",   pct: 75 },
  { key: "rendering",       label: "Rendering LaTeX",   pct: 82 },
  { key: "compiling",       label: "Compiling PDF",     pct: 90 },
  { key: "encoding",        label: "Streaming",         pct: 98 },
  { key: "result",          label: "Done",              pct: 100 },
];

export function ResumeGeneratorButton({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const [jd, setJd] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [pct, setPct] = useState(0);
  const [stageLabel, setStageLabel] = useState<string>("");
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const submitting = stage !== "idle" && stage !== "success" && stage !== "error";

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const reset = () => {
    setStage("idle");
    setPct(0);
    setStageLabel("");
    setEventLog([]);
    setErrorMessage(null);
  };

  const close = () => {
    if (submitting) {
      abortRef.current?.abort();
    }
    setOpen(false);
    reset();
  };

  const downloadPdf = (b64: string, filename: string) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = jd.trim();
    if (!trimmed) {
      setErrorMessage("Paste a job description or a job URL first.");
      return;
    }
    setStage("submitting");
    setStageLabel("Submitting…");
    setPct(0);
    setEventLog([]);
    setErrorMessage(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: trimmed }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `request failed (${res.status})`);
      }

      // The sidecar streams NDJSON progress events; final event is the
      // base64 PDF. Anything else (a non-stream response) is a fallback
      // error path.
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("ndjson") && !ct.includes("application/json")) {
        throw new Error(`unexpected response type from sidecar: ${ct}`);
      }
      if (!res.body) throw new Error("empty response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let result: { filename: string; pdf_base64: string } | null = null;
      let lastError: string | null = null;

      // Stream loop
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev: ProgressEvent;
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "progress") {
            setStage(ev.stage as Stage);
            setStageLabel(ev.label);
            setPct(ev.pct);
            setEventLog((prev) => [...prev.slice(-9), `${ev.pct.toString().padStart(3)}% · ${ev.label}`]);
          } else if (ev.type === "result") {
            result = { filename: ev.filename, pdf_base64: ev.pdf_base64 };
            setStage("result");
            setPct(100);
            setStageLabel("Streaming PDF…");
          } else if (ev.type === "error") {
            lastError = ev.message;
            break;
          }
          // heartbeat events are ignored; their job is just to keep the
          // proxy from declaring the response idle.
        }
        if (lastError) break;
      }

      if (lastError) throw new Error(lastError);
      if (!result) throw new Error("sidecar finished without a result event");

      downloadPdf(result.pdf_base64, result.filename);
      setStage("success");
      setStageLabel("Tailored resume downloaded.");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setStage("idle");
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : "unknown error");
      setStage("error");
    }
  };

  const progressBar = (
    <div className="w-full h-2 rounded-full bg-white/[.06] overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-3)] transition-all duration-500 ease-out"
        style={{ width: `${Math.max(2, pct)}%` }}
      />
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium border border-white/10 hover:border-white/30 hover:bg-white/[.05] transition-all duration-300"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
          onClick={close}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-white/[.10] bg-[color:var(--bg-card)]/70 backdrop-blur-xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--fg)]">
                  Resume Generator
                </h2>
                <p className="mt-1 text-sm text-[color:var(--fg-muted)]">
                  Paste the job description or a link to it. The tailor
                  pipeline runs through plan → draft → summary → render →
                  compile (~60s).
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={close}
                className="text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition text-2xl leading-none -mr-1"
              >
                ×
              </button>
            </div>

            {!submitting && stage !== "success" && (
              <form onSubmit={submit} className="space-y-4">
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder={
                    "Paste the full job description here, or paste a single URL on its own line.\n\nExample URLs:\n  https://jobs.example.com/role-id\n  https://boards.greenhouse.io/.../jobs/...\n  https://www.linkedin.com/jobs/view/..."
                  }
                  rows={10}
                  className="w-full rounded-lg border border-white/[.08] bg-black/30 p-3 font-mono text-sm text-[color:var(--fg)] placeholder:text-[color:var(--fg-dim)] focus:outline-none focus:border-[color:var(--accent)]/60"
                />

                {errorMessage && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    {errorMessage}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className="px-4 py-2 rounded-full text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--accent)] hover:bg-[color:var(--accent)]/20 transition-all"
                  >
                    Generate resume
                  </button>
                </div>
              </form>
            )}

            {submitting && (
              <div className="space-y-5">
                {/* Phase chips */}
                <div className="flex flex-wrap gap-1.5">
                  {PHASES.map((p) => {
                    const isCurrent = p.key === stage;
                    const isPast = pct >= p.pct;
                    return (
                      <span
                        key={p.key}
                        className={`mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm border transition-all duration-300 ${
                          isCurrent
                            ? "border-[color:var(--accent)] bg-[color:var(--accent)]/15 text-[color:var(--accent)] shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                            : isPast
                              ? "border-white/[.12] bg-white/[.04] text-[color:var(--fg-muted)]"
                              : "border-white/[.06] text-[color:var(--fg-dim)]"
                        }`}
                      >
                        {p.label}
                      </span>
                    );
                  })}
                </div>

                {/* Big stage label + spinner */}
                <div className="flex items-center gap-3">
                  <SpinnerDots />
                  <div className="text-sm text-[color:var(--fg)] truncate flex-1">
                    {stageLabel || "Working…"}
                  </div>
                  <div className="mono text-xs text-[color:var(--fg-muted)] tabular-nums">{pct}%</div>
                </div>

                {progressBar}

                {/* Recent events tail */}
                <div className="rounded-lg border border-white/[.06] bg-black/20 p-3 max-h-44 overflow-y-auto">
                  <div className="mono text-[10px] uppercase tracking-widest text-[color:var(--fg-dim)] mb-2">
                    Pipeline log
                  </div>
                  <div className="space-y-1">
                    {eventLog.length === 0 ? (
                      <div className="mono text-xs text-[color:var(--fg-dim)]">waiting for first event…</div>
                    ) : (
                      eventLog.map((line, i) => (
                        <div key={i} className="mono text-xs text-[color:var(--fg-muted)]">
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={close}
                  className="w-full px-4 py-2 rounded-full text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] border border-white/[.08] hover:border-white/[.20] transition"
                >
                  Cancel
                </button>
              </div>
            )}

            {stage === "success" && (
              <div className="space-y-4">
                <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  Tailored resume downloaded.
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={reset}
                    className="px-4 py-2 rounded-full text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition"
                  >
                    Generate another
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold border border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--accent)] hover:bg-[color:var(--accent)]/20 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            <p className="mt-4 text-[11px] text-[color:var(--fg-dim)] leading-relaxed">
              Two MiniMax-M2.7 passes (plan + write) tailor bullets against
              your JD; xelatex compiles the LaTeX into a one-page PDF. No
              JD content is stored.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// --- Animated dot spinner -----------------------------------------------
function SpinnerDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-2 rounded-full bg-[color:var(--accent)] animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-2 h-2 rounded-full bg-[color:var(--accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-2 h-2 rounded-full bg-[color:var(--accent)] animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );
}
