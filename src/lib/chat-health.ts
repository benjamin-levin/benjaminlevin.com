import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Auto-recovery: a transient runtime error (rate limit, model glitch) marks
// us unhealthy for RUNTIME_RECOVERY_MS, then re-checks. Fatal config issues
// (codex CLI missing, context file missing) stay unhealthy until the
// hourly re-check picks up a fix.

const RUNTIME_RECOVERY_MS = 5 * 60 * 1000; // 5 min
type Reason = "ok" | "pending_startup_check" | "chatbot_disabled" | "codex_not_found" | "context_file_missing" | "codex_runtime_error" | "connection_failed";
const TRANSIENT_REASONS = new Set<Reason>(["codex_runtime_error", "connection_failed"]);

let healthy = false;
let reason: Reason = "pending_startup_check";
let unhealthyAt: number | null = null;

function configCheck(): { ok: true } | { ok: false; reason: Reason } {
  if (process.env.NEXT_PUBLIC_ENABLE_CHATBOT !== "true") {
    return { ok: false, reason: "chatbot_disabled" };
  }
  try {
    execFileSync("which", ["codex"], { timeout: 3000 });
  } catch {
    return { ok: false, reason: "codex_not_found" };
  }
  const contextPath = path.join(process.cwd(), "BEN_CONTEXT.md");
  try {
    fs.accessSync(contextPath, fs.constants.R_OK);
  } catch {
    return { ok: false, reason: "context_file_missing" };
  }
  return { ok: true };
}

function check() {
  const cfg = configCheck();
  if (!cfg.ok) {
    healthy = false;
    reason = cfg.reason;
    unhealthyAt = null;
    return;
  }
  // Config is fine. If we're in a transient unhealthy window, keep it
  // until RUNTIME_RECOVERY_MS elapses, then auto-restore.
  if (!healthy && TRANSIENT_REASONS.has(reason)) {
    if (unhealthyAt && Date.now() - unhealthyAt < RUNTIME_RECOVERY_MS) return;
  }
  healthy = true;
  reason = "ok";
  unhealthyAt = null;
}

check();
setInterval(check, 60 * 1000); // poll every minute so transient recovery is timely

export function getChatHealth() {
  // Lazy-recover on read too — so a request right after the recovery window
  // passes doesn't have to wait for the next interval tick.
  if (!healthy && TRANSIENT_REASONS.has(reason) && unhealthyAt && Date.now() - unhealthyAt >= RUNTIME_RECOVERY_MS) {
    check();
  }
  return { healthy, reason };
}

export function markChatUnhealthy(failReason: string) {
  healthy = false;
  reason = (failReason as Reason) ?? "codex_runtime_error";
  unhealthyAt = Date.now();
}
