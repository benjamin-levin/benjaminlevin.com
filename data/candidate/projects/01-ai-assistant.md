---
id: ai-assistant
title: Openclaw + Discord Voice — Personal AI Assistant Platform
role: Sole Developer
url: null
start: Apr 2026
end: Present
priority: 1
tags: [ai, ml, llm, voice-agent, mlx, multi-agent, agent-architecture, hmm, speculative-decoding, tts, stt, kokoro, whisper, ollama, mcp, plugin-sdk, typescript, python, discord, full-stack, agent-tooling, research-automation, job-automation, latex, monorepo]
---

# Openclaw + Discord Voice — Personal AI Assistant Platform

## Bullets

- **Developer** of an end-to-end personal AI-assistant platform across **two coordinated codebases** in one umbrella monorepo: **Openclaw** — a TypeScript/JavaScript multi-channel AI gateway with plugin / extension SDK and MCP integration — and **Discord Voice** — a Python real-time conversational voice agent with native Apple-Silicon model inference. **TypeScript / JavaScript + Python**.
- **HMM-based turn-end predictor** (`services/turn_end_predictor.py`): 3-state hidden-Markov model (`mid_turn` / `approaching_end` / `at_end`) with **supervised MLE training** (no Baum-Welch) on **VoxConverse + AMI** conversational corpora, fusing prosody (per-user z-scored f0 / energy / speaking-rate, terminal slopes), lexical (tail-phrase known-end / filler markers), and silence features (`training/hmm_trainer.py`). **Shadow-mode rollout pattern**: HMM and silence-rule predictor run in parallel and log agreement / disagreement in production before the HMM takes over the cut decision.
- **Tool-coordinator + intent sentinel** (`services/tool_intent.py`, `services/intent_sentinel.py`): structured-JSON intent classifier gates tool dispatch behind a confidence check, then routes to the right backend (job-scout query, digest fetch, Obsidian semantic search via FTS5 + LLM rerank, web search via Codex bridge, MCP-bridged third-party tools).
- **Local multi-agent LLM stack on Apple-Silicon MLX**: lazy-loaded **`mlx-lm`** for LLM inference (Qwen / Llama / Mistral via Ollama as the warm-process server), **`mlx_audio`** for TTS (Kokoro primary, plus F5-TTS / Qwen3-TTS / FishSpeech / Piper as alternates — each lazy-imported to keep cold start cheap), **`whisper.cpp`** for streaming STT with partial revisions every ~400ms. Subprocess-based **`MLXWorkerClient`** keeps a warm worker pool with JSON-over-stdio IPC and per-session conversation history.
- **AI-research digest pipeline — built specifically to stay current in a fast-moving field without burning hours per day on manual feed-following**: persistent background services (macOS background services) curate a tracked corpus across **multiple lab blogs (DeepMind / Hugging Face / OpenAI / Microsoft Research) via RSS, three arXiv categories (cs.LG / cs.CL / cs.AI) via the arXiv API, the HuggingFace daily-papers human-upvoted list, and ~50 hand-picked X / Twitter handles** (frontier labs, foundation researchers like Karpathy / LeCun / Hinton / Sutskever, systems people like Tri Dao / Hazy Research, alignment / agents practitioners like Goodside / Swyx / Simon Willison) — polled every 30 min for research, hourly for Twitter, deduped into a SQLite store, pruned at 30 days. A **MiniMax-M2.7-driven `digest_writer.py`** synthesizes a daily / 12-hour-windowed **prose article** (markdown-formatted, not a flat link list) that respects source-publish-time vs scraper-discovery-time so the article doesn't fake-stamp older items as breaking news. Renders to the user's Obsidian vault as `AI/Digests/ai-research-YYYY-MM-DD.md` and posts to Discord. Voice-controlled **digest reader** (`services/digest_reader.py`) plays it back sentence-by-sentence with markdown stripping, paragraph-level prosody chunking (50–320 char), and full voice commands (pause / continue / skip / go-back / stop, interruption-aware).
- **Autonomous job-application subsystem** (`apps/discord-voice/jobs/`): daily launchd cron scrapes opportunities from **HN Who's Hiring + Greenhouse + Workday + Ashby**, scores each via a MiniMax-M2.7 LLM judge against a candidate profile (threshold 0.55), composes a structured dossier, and posts surfaced opportunities to Discord with one record per opportunity. **Resume tailor** ingests a master LaTeX resume + the opportunity description, asks MiniMax to produce a tailored variant, runs `latexmk` for PDF output, and emits per-opportunity `resume.pdf` + `cover_letter.pdf` to a per-company output directory. Multi-attempt LaTeX repair loop (5 retries) handles common compilation failures from LLM-generated source.
- **Openclaw text core (TypeScript)**: pnpm-workspace monorepo with **Plugin SDK** (`openclaw/plugin-sdk` exported types), **MCP integration via `mcporter`** (runtime-swappable without restart), and **Skills system** (workspace packages in `skills/` and `extensions/` for MS Teams, Matrix, Zalo, voice-call, llm-task, MiniMax portal auth). Multi-channel routing across Discord-text / Telegram / Slack / Signal / iMessage / web with shared session storage at `~/.openclaw/sessions/`. Strict TypeBox tool schemas (`@sinclair/typebox`, no `anyOf` / `oneOf`) enforced by `oxlint` type-aware rules.

## Detail

:::callout
This page covers the earlier Openclaw and Discord Voice platform. See [Unify](/project/unify) for my newer local voice-agent and inference research.
:::

End-to-end personal AI-assistant platform built solo. Two coordinated runtimes share a monorepo and a tool-dispatch protocol but stay deliberately separate processes / languages because their constraints differ — **text channels** want plugin breadth and cloud deployment; **real-time voice** wants tight Apple-Silicon model integration, sub-second latency, and a turn-taking state machine that doesn't fit a stateless request/response model.



### Voice runtime

:::callout
**Dual-agent train-of-thought + speaker:** a fast small model refines a hypothesis of what the user means *while they're still speaking*; a slower capable model streams the spoken reply the moment the turn-end predictor commits.
:::

![Voice runtime — Whisper, Thought-LLM, HMM, Tool-intent, Speaker-LLM, Kokoro](/media/projects/ai-assistant/ai-assistant-dual-agent-v3.mp4)

**Dual agents** (`services/dual_agent.py`). `TrainOfThoughtAgent` consumes a partial-STT revision every ~400 ms and calls `ThoughtLLM.refine(...)` on Qwen3 1.7B to update a running `Hypothesis` incrementally — never rebuilt from scratch. `SpeakingAgent` waits for the turn-end commit, reads the finalized hypothesis, and streams sentences from a heavier model (Mistral Nemo 12B) into the TTS queue. Both LLMs are exposed as `Protocol` types so adapters can wire any backend.

**HMM turn-end predictor** (`services/turn_end_predictor.py`). A 3-state HMM — `mid_turn` → `approaching_end` → `at_end` — replaces the naïve "550 ms-of-silence = turn-over" rule that mishandles thinking-pauses, narration, and end-of-question prosody.

![HMM turn-end predictor — features streaming, state posterior advancing, cut firing](/media/projects/ai-assistant/ai-assistant-hmm-v2.mp4)

#### Features fused at every step

- **Prosody** — per-user z-scored f0 / energy / speaking-rate, plus terminal-slope features (the falling pitch contour at the end of an English declarative). Per-user z-scoring matters: a soft-spoken user's "energy drop" lives in a different absolute band than a loud one's.
- **Lexical tail** — known-end markers ("...so yeah", "...right?", "...does that make sense") and filler markers ("um", "uh"). Filler in the middle of a turn argues against `at_end`; filler at the tail is itself an end signal.
- **Silence** — graduated bins (180 ms / 320 ms / 540 ms / >800 ms) rather than a single threshold; the HMM can learn that a 180 ms pause inside a long question carries different evidence than a 540 ms pause after a falling pitch contour.

#### Training

**Supervised MLE on VoxConverse + AMI** (`training/hmm_trainer.py`). Both corpora label conversational boundaries explicitly, so we have ground-truth state sequences. That removes the need for Baum-Welch (which would solve unsupervised state inference); MLE just counts emission and transition statistics directly. Faster, more stable, and matches the labeled-data setting.

#### Shadow-mode rollout

Production rollout uses a `ShadowPredictor` pattern: the HMM runs **in parallel** with the legacy silence-rule predictor for an extended window. Every cut decision logs both predictors' outputs plus their agreement / disagreement. Only after the disagreement pattern looked principled (HMM wins on prosody-clear ends, silence-rule wins on hard pauses) did the HMM take over the cut decision. The shadow log is still around as a regression test if either predictor gets touched again.

#### MLX stack

`mlx_lm` for inference, `mlx_audio` for TTS (Kokoro primary, with F5-TTS / Qwen3-TTS / FishSpeech / Piper as alternates), `whisper.cpp` for streaming STT — all lazy-imported so cold start stays cheap. `MLXWorkerClient` keeps a warm worker pool with JSON-over-stdio IPC and per-`session_id` history.

#### Two speculative-execution efforts at orthogonal layers

**(1) Classical speculative decoding** at the inference layer. The small thought-model proposes a sequence of tokens; the larger speaker model validates them **in parallel** in a single forward pass and accepts the matching prefix. On divergence, fall back to sequential generation from the divergence point. Aimed at wall-clock-per-token on Apple-Silicon hardware. Measurable speedup but not large enough to ship as the default; sits behind a feature flag.

**(2) Speculative reasoning** at the UX layer (`services/speculative_reasoner.py`). On each partial-STT revision (every ~400 ms), pre-generate a likely opener + first-sentence draft against the *current* hypothesis. When the turn-end predictor commits, the speaker either uses the pre-generated opener (zero-latency to first audio) or, if the hypothesis changed enough, falls back to fresh generation. **(2) is the production path today** — it was the bigger win on perceived latency.

The two are orthogonal: (1) reduces wall-clock per token, (2) reduces wall-clock from "predictor commits" to "first audio frame goes out the door."

### AI-research digest pipeline

Built because manually following lab blogs, arXiv, and paper Twitter burns hours per day on mostly noise. The pipeline is high-recall in (every relevant feed gets polled) and high-precision out (one prose article per window, not a 200-link dump).

![AI research digest — sources fan in, dedupe, MiniMax synthesis, Obsidian + Discord output](/media/projects/ai-assistant/ai-assistant-digest.mp4)

#### Source coverage

Persistent background services (macOS background services) pull from four parallel source classes:

- **Lab RSS** — DeepMind, Hugging Face, OpenAI, Microsoft Research. Polled every 30 min.
- **arXiv** — three categories (`cs.LG`, `cs.CL`, `cs.AI`) over a rolling 168-hour lookback via the arXiv API.
- **HuggingFace daily papers** — the human-upvoted list as a quality prior.
- **~50 hand-picked X / Twitter handles** — frontier labs, foundation researchers (Karpathy, LeCun, Hinton, Sutskever), systems people (Tri Dao, Hazy Research), alignment / agents practitioners (Goodside, Swyx, Simon Willison). Polled hourly.

**Per-source resilience.** A single failing feed is caught and logged but doesn't break the run — the digest emits with whatever sources were healthy. One arXiv outage shouldn't kill a daily digest.

#### Dedupe + 30-day prune

All ingestion writes into a single SQLite store keyed by canonical URL. Same paper hitting via arXiv + HuggingFace + Twitter is one record with multiple source attributions, not three records. The store auto-prunes at 30 days — long-term memory belongs in Obsidian, not in the ingestion layer.

#### Prose synthesis, not a link list

The on-disk shortlist is an **intermediate representation**; the user-facing digest is regenerated separately by **MiniMax-M2.7** as a markdown prose article — because the digest is meant to be read or listened to, not skimmed as a link dump. `bg_ai_research/digest_writer.py` constructs the prompt, streams the article, and renders it to disk.

#### Time-aware scheduling

The scheduled-post variant preserves the distinction between **source publish time** (when the lab actually published) and **scraper discovery time** (when our poller saw it). Without this distinction, a paper published three days ago that the scraper just found would be fake-stamped as "breaking news" in today's digest. The article uses the *publish time* in narrative phrasing while marking discovery time as metadata.

#### Output destinations

- **Obsidian vault** — `AI/Digests/ai-research-YYYY-MM-DD.md`. Long-term external memory; searchable via FTS5 + LLM-rerank as a tool the voice agent can call.
- **Discord post** — chunked for chat readability and indexed by the voice agent for live playback.

#### Interruption-aware voice reader

`services/digest_reader.py` plays the digest aloud sentence by sentence:

- **Markdown stripping** before TTS so headings and bullets don't get spoken as syntax.
- **Paragraph-level prosody chunking** (50–320 char windows) so the speaker breathes at sensible boundaries.
- **Interruption-aware** — mid-sentence interruption auto-pauses on the current *paragraph*, not the current sentence. Resuming picks up exactly where it left off, not three paragraphs ahead because the TTS queue had been pre-loaded.

### Autonomous job scout

`apps/discord-voice/jobs/` — daily launchd cron that scrapes opportunities, scores them against a candidate profile, surfaces the survivors to Discord, and emits per-opportunity tailored documents. The pipeline runs unattended: I see Discord notifications, click through if interesting, and per-opportunity `resume.pdf` + `cover_letter.pdf` are already on disk.

#### Source ingestion

`scout/runner.py` pulls from four very different posting sources and normalizes to one structure:

- **HN Who's Hiring** — monthly threads, comment-extracted role posts.
- **Greenhouse** — JSON board listings per company (lots of mid-size startups).
- **Workday** — paginated career-site listings (large enterprises).
- **Ashby** — JSON board listings (newer-startup default).

Each source has its own scraper with format-specific quirks; the unified `Opportunity` schema downstream doesn't know or care.

#### LLM judge

A **MiniMax-M2.7 LLM judge** scores each opportunity against a candidate profile — a structured prompt with role description, my background summary, and current preferences. Score threshold is 0.55. Below threshold, drop. Above threshold, compose a **structured dossier** (role, company, fit reasoning, salient facts, links) and post to Discord. **Idempotent dedup** against `jobs_opportunities.url` so a re-run doesn't re-surface yesterday's listings.

#### Resume + cover-letter tailor

For each surfaced opportunity, the **resume tailor**:

1. Reads the master LaTeX resume + the opportunity description.
2. Asks MiniMax to produce a **tailored LaTeX variant** — re-ordered bullets, opportunity-specific emphasis, generated cover letter targeted to this role.
3. Runs `latexmk` to produce `resume.pdf` + `cover_letter.pdf`.
4. Drops both into a per-company output directory.

#### LaTeX repair loop

LLM-generated LaTeX often has compilation errors — mismatched braces, undefined commands, inconsistent macro definitions. A **5-retry LLM-driven repair loop** catches the `latexmk` error log, feeds it back into the model with the failing source, and asks for a corrected variant. Most failures resolve on retry 1; the long tail of weird ones almost always resolves by retry 3. Retry 5 is the hard fail and logs to Discord for manual review (rare).

### Openclaw text core

TypeScript / Node 22+ pnpm-workspace monorepo. The **Plugin SDK** (`openclaw/plugin-sdk` with full `.d.ts` types) gives third-party plugins a stable, versioned surface. **MCP integration** via `mcporter` is runtime-swappable without process restart. Tool schemas use `@sinclair/typebox` with strict guardrails enforced by `oxlint` type-aware rules — no `anyOf` / `oneOf` — so plugin authors can't accidentally produce schemas the frontier providers reject. Multi-channel routing spans Discord-text / Telegram / Slack / Signal / iMessage / web / MS Teams / Matrix / Zalo, each as its own extension; per-agent sessions live at `~/.openclaw/sessions/` as JSONL.

### Persistence + deployment

The primary store is a **SQLite** at `data/db/voicebot.sqlite3` covering sessions, turns, segments, transcripts, transcript-revisions, llm-requests (prompt-cache + dedup), jobs-opportunities, and supporting operational tables. **Obsidian vault integration** (`services/obsidian_bridge.py`) writes one Markdown per session and exposes FTS5 + LLM-rerank semantic search as a tool the voice agent calls — the vault is external long-term memory. **Fly.io** runs the cloud text channels; **macOS launchd** with background services runs voice, watchdog, jobs scout, Twitter collector, digest poster, email reviewer, research scraper, and proactive scheduler. Sandbox Dockerfile variants plus `docker-compose.hardened.yml` host untrusted-code execution. **Hermes** (Nous Research's self-improving agent framework) is wired in loosely as a sibling agent the platform can invoke for autonomous-skill / RL-environment tasks.
