---
id: trading-algo
title: Sovlscan — Solana Trading Terminal
role: Co-Lead
url: null
start: Nov 2024
end: Present
priority: 2
tags: [quant, finance, crypto, solana, blockchain, ml, bayesian-methods, change-point-detection, etl, clickhouse, timescaledb, rust, fastapi, react, websockets, distributed-systems, full-stack, llm-integration]
---

# Sovlscan — Solana Trading Terminal

## Bullets

- **Co-lead one of three engineers** on Sovlscan, a **Solana-focused on-chain trading terminal** built end-to-end — full-blockchain ingestion → regime-detection ML → swap execution → customer-facing trading terminal — over **16 months across Python + Rust + JSX **. My ownership: **designed the initial proof-of-concept of the regime-detection algorithm + region definitions + the label-generation methodology that produces reliable, accurate ground-truth labels** (the foundational signal-generation work the rest of the strategy stack is built on); trading terminal frontend + backend; execution-simulation layer; BubbleMaps wallet-clustering UI; ML / data / UI integration glue; infra contributions to the ingestion pipeline (41× write-throughput rewrite, Yellowstone gRPC + Arrow Flight integration, TimescaleDB RPC schema).
- **Data infrastructure (team-shared)**: stood up a **Solana mainnet-beta archival node** on a dedicated bare-metal box (**AMD EPYC 9554P / 64C-128T, 1.5 TiB DDR5 ECC, 4× 7 TB Samsung PM9A3 enterprise NVMe**) running the **Agave validator** (`--no-voting --full-rpc-api --private-rpc`) with a **custom Rust Jetstreamer plugin** hooked into Geyser, decoding **100+ DeFi protocols** at instruction level and sustaining **500+ slots / sec**. **400B+ rows backfilled across epochs 0–919** into a two-tier storage layout: **ClickHouse 24.8 `ReplacingMergeTree` landing zone** (monthly partitioning, ORDER BY `(slot, signature, instruction_index)`, **`LowCardinality` columns** dictionary-encoding 100+ protocol enums, ZSTD compression on disk, async-insert coalescing at 10 MB / 200 ms, bloom-filter indices on hot filter columns) → **checkpointed Python + Rust ETL** → **TimescaleDB PG16 hypertables** with continuous aggregates rolling 1m → 5m / 15m / 1h / 4h / 1d. Authored a **41× write-throughput improvement** by rewriting Postgres inserts to batch UNNEST (commit `79bf1e33fd`).
- **Resumable distributed backfill**: epoch-level checkpoints in ClickHouse (`backfill_checkpoints`) plus **RoaringBitmap-based slot-level progress** (`backfill_slot_progress`) so a 400B-row backfill resumes precisely from the last completed slot after any interruption. Optimized hot-path checkpoint reads by replacing `FINAL` aggregation with `argMax(... , updated_at) GROUP BY epoch`, and pipelined bitmap-clone-then-encode to release read locks before the expensive base64 serialization step. Coordinated parallel backfill across **4 machines** by streaming `SELECT ... FORMAT Native | ssh remote clickhouse-client INSERT FORMAT Native` per epoch slice across 11 raw tables.
- **ML / strategy (obfuscated)**: ensemble of three categories of well-known techniques — **Bayesian regime / change-point detection** via Numba-accelerated dynamic programming with empirical-Bayes priors, a **tree-based supervised signal stream** (random forest / gradient-boosted features), and an **LLM-as-research-analyst signal source** running templated frontier-model qualitative analysis per token with structured numeric outputs ingested into the same scoring layer. Validated on a randomized simulation campaign across tens of thousands of tokens with risk-adjusted returns the team considered worth deploying behind a manual gate. **Specific algorithm design, regime taxonomy, hyperparameters, entry / exit rules, position-sizing logic, validated-performance numbers, and additional proprietary techniques layered on top will not be shared** under any circumstances; engineering tradeoffs (data scale, performance, validation methodology) and the well-known categories above can be discussed in interview.
- **Trading terminal (my primary scope)**: React 18 + JSX frontend with **BubbleMaps wallet-clustering visualization** (D3 + Three.js), `lightweight-charts` candlestick rendering, dockable panel system, order management; FastAPI backend (Python 3.12 + SQLAlchemy 2.0 + Alembic + structlog); **multi-auth** (Sign-In With Solana, Google OAuth, Apple Sign-In, email/password, JWT, optional mTLS via Caddy); Jupiter / Raydium / Meteora swap-execution adapters with stop-loss / take-profit / DCA / trailing-stop order types. Live execution gated behind `sim_only=True` by default, with circuit-breaker, pre-trade validation, and position-limit enforcement specs in active development; trading-state persisted in Redis.
- **AI-assisted development infrastructure**: built a custom **MCP orchestration server** with `spawn_child` / `spawn_children_parallel` / `consult_expert` tools and a **6-agent expert profile system** (rust-systems, react-frontend, python-backend, data-pipeline, code-reviewer, trading-engine) running on Claude Opus 4.6 + GPT-5.2-codex; structured prompt-tag protocol (`<plan:ambitious>`, `<plan:surgical>`, `<refactor>`, `<review>`, `<build>`, `<update>`) for repeatable agent workflows; "personality hot-swapper" letting developers swap working-context (data-eng / ML-eng / etc.) per session. Heavy use of agent-coordination via `.comms/` for distributed multi-machine work.

## Detail

Sovlscan is a Solana on-chain trading terminal: full-chain ingestion, analytics, automated trading via Bayesian regime detection, customer-facing terminal UI. Live execution is simulation-only by default. Repo `bperritt/Sovlscan`. (Sovlscan is a separate company from PRSM AI — distinct projects, distinct teams.)


| Area | My contribution | Shared system boundary |
| --- | --- | --- |
| Signal foundations | Initial regime-detection proof of concept, region definitions and label methodology | Team extended the production strategy |
| Trading terminal | Frontend, backend, wallet-clustering interface and integration | Execution adapters and shared platform services |
| Data path | Batch-insert rewrite, serving integration and checkpoint improvements | Team-owned ingestion and archival infrastructure |
| Evaluation | Execution-simulation layer and integration | Strategy results stay private; simulation is the default |

![Illustrative data-path schematic; architecture and ownership context, not a throughput measurement](/media/case-studies/legacy/sovlscan-data-path.svg)

### Data infrastructure

Solana firehose → custom Rust **Jetstreamer** Geyser plugin → **ClickHouse 24.8** landing zone → **Python + Rust ETL** → **TimescaleDB PG16** serving layer → DAL (Arrow Flight) + RPC (WebSocket) → trading terminal. A single bare-metal box (AMD EPYC 9554P, 1.5 TiB DDR5 ECC, 4× 7 TB PM9A3 NVMe) runs an Agave mainnet-beta archival node alongside ClickHouse, with Jetstreamer tapping the live firehose.

![Sovlscan data pipeline — Solana firehose → Jetstreamer → ClickHouse → ETL → TimescaleDB → trading terminal](/media/projects/trading-algo/sovlscan-dataflow.mp4)

#### Storage layout that survives 400B rows

ClickHouse is the landing zone, not the serving layer. The schema is tuned for **append-only ingest** at firehose rates and **selective backfill reads**:

- `ReplacingMergeTree` engine — late-arriving duplicates collapse on merge, no upstream dedup needed.
- `ORDER BY (slot, signature, instruction_index)` — most filters are slot-range or per-tx; this is the natural primary index.
- **Monthly partitioning** — drop / re-import an entire month's parts when re-deriving a decoder.
- **`LowCardinality(String)`** columns dictionary-encode the 100+ protocol enum values; cuts disk and memory by ~10× on those columns.
- **ZSTD on disk + bloom-filter indices** on the hot filter columns (token mint, signer).
- **Async-insert coalescing** at 10 MB / 200 ms — swap the per-row insert cost for a sub-second batching delay; throughput goes up an order of magnitude.

TimescaleDB on top is the **serving layer** — hypertables for tick / 1m / 5m / 15m / 1h / 4h / 1d, with continuous aggregates rolling up the lower tiers. The trading terminal never queries ClickHouse directly; it talks Arrow Flight (DAL) and WebSocket (RPC) to the warm Postgres tier.

#### 41× write-throughput rewrite

The naïve TimescaleDB insert path was per-row — `INSERT INTO ... VALUES` per record, latency-bounded on the network round trip. Rewriting to batch UNNEST (commit `79bf1e33fd`) — one statement per batch with each column passed as an array, expanded via `unnest()` — replaced 1000 round-trips with 1, and replaced N parsing passes with 1. **41× sustained write throughput** end-to-end.

#### Resumable backfill across 4 machines

400B rows of historical Solana data needs to survive interruptions. Two checkpointing layers run together:

- **Epoch-level checkpoints** (`backfill_checkpoints` in ClickHouse) — coarse progress per epoch (each Solana epoch is ~432K slots).
- **Slot-level RoaringBitmap progress** (`backfill_slot_progress`) — a packed bitmap of every individual completed slot inside the current epoch. Resume is byte-exact: the next run picks up from the lowest unset bit.

Hot-path optimization: the original checkpoint-read path used `FINAL` (which forces a per-query merge of the `ReplacingMergeTree`) and ran for seconds. Replaced with `argMax(..., updated_at) GROUP BY epoch`, which uses standard aggregation and runs in milliseconds. Then pipelined the bitmap-clone step before the (slow) base64 serialization so the read lock releases earlier.

Coordinating four physical machines: each node owns an epoch slice and pulls its slot range from the shared backfill state. Bulk transfer between machines uses `SELECT ... FORMAT Native | ssh remote clickhouse-client INSERT FORMAT Native` per epoch slice across 11 raw tables — Native format is the fastest path because it skips the parser entirely on both sides.

:::stats
- 400B+ rows · backfilled across epochs 0–919
- 500+ slots/sec · sustained Jetstreamer throughput
- 100+ DeFi protocols · decoded at instruction level
- 41× write-throughput · UNNEST batch rewrite (Ben's commit)
:::

My direct contributions to the data path: the **41× UNNEST rewrite** (`79bf1e33fd`); **Yellowstone gRPC + Arrow Flight integration** (`c7b4605185`) as an alternate live-ingest path; the **TimescaleDB RPC schema** (`5253753051`); and the bitmap-pipeline + `argMax` checkpoint-read optimizations.

### Strategy & ML

| Signal family | Input / method | Role in the system |
| --- | --- | --- |
| Regime / change-point | Streaming price and liquidity history; Bayesian segmentation | Describe the current market regime |
| Supervised trees | Engineered on-chain and market features | Produce a separately trained signal |
| LLM research analyst | Templated token context and structured output | Add qualitative context to the scoring layer |
| Execution gate | Combined signal and operator approval | Keep live-money execution separate from default simulation |

The signal stack ensembles three well-established, deliberately orthogonal categories. Each channel is a different kind of evidence; the ensemble layer scores their combined output before anything reaches the execution gate.

#### Channel 1 — Bayesian regime / change-point detection

A streaming detector that segments per-token price/liquidity history into a small set of regime labels. **Numba-accelerated dynamic programming** scans the candidate change-point set in O(n²) time but fast enough for live use; **empirical-Bayes priors** carry information across tokens (a heavy-vol token's prior on regime persistence differs from a slow-moving major). The output is a posterior over the current regime plus a confidence band on the most recent change-point.

I built the **initial POC of the regime-detection algorithm**, the **region taxonomy**, and the **labeling methodology** that produces ground truth. Labeling was the hard part — regimes aren't directly observable, so the workflow is heuristic-bootstrap → human review → relabel → retrain → measure inter-rater agreement → tighten the heuristic. Iterated until labels were reliable enough that downstream evaluation wasn't dominated by label noise. The team has since extended and refined the production implementation.

#### Channel 2 — Tree-based supervised stream

A separate orthogonal stream: engineered features (liquidity z-scores, transaction counts, address diversity, skewness, agg-flow scores, etc.) feed a tree ensemble (random forest / gradient-boosted) that emits a per-window probability for the labeled signal. Tree-based models are deliberate here — they handle the heterogeneous, scale-varying feature set without per-feature normalization tuning, and the per-tree votes are auditable when something looks weird in production.

#### Channel 3 — LLM-as-research-analyst

Frontier-model qualitative analysis run per token over a templated protocol — same prompt structure, same output schema, varying token. The LLM receives compact context (recent on-chain stats, narrative tags, holder distribution) and emits **structured numeric outputs** — sentiment, narrative alignment, wallet-health score — that flow into the same scoring layer as the quantitative channels. The "research analyst" framing isn't aspirational; the LLM is doing roughly what a junior analyst would do over a list of tokens, just at machine throughput.

#### Ensemble + execution gate

A weighted-sum scoring layer combines the three channels into a single signal. **Live execution is gated behind `sim_only=True` by default**; real trades require explicit per-session approval, and Shaan's safety layer enforces circuit breakers, pre-trade validation, and position limits.

:::callout
**Specific algorithm design, regime taxonomy, hyperparameters, entry/exit rules, position sizing, and validated performance numbers are intentionally withheld.** That's the team's alpha; engineering tradeoffs (data scale, validation methodology) are fair game in interview.
:::

### Trading terminal — my primary scope

The customer-facing trading terminal: where signal output, on-chain context, and the swap layer meet a live operator. A React frontend, FastAPI backend, and on-chain swap adapters share one authentication surface.

#### BubbleMaps — wallet-clustering as a visual fingerprint

The most visually distinctive panel. A force-directed graph of wallets (D3 layout, Three.js renderer) where edges are transfer flows and nodes are sized by balance. Organic flow looks scattered: many shallow clusters, irregular timing, no shared origin. **Coordinated flow** — sniper bots, insider distribution, farming networks — shows up as **tight, time-synchronized clusters** drawing from a common source. The structured tag flowing back into the strategy layer is one of the inputs to Channel 3 above.

#### Frontend stack

`modules/dal_ui/frontend/` — **React 18 + plain JSX** (no TypeScript on the UI deliberately — fast iteration speed mattered more here than type guarantees). Key building blocks:

- **`lightweight-charts` v5** — candle rendering at 60fps, gapless restore on WebSocket reconnect.
- **Dockable panel system** — `OrderForm`, `SwapPanel`, `CandleChart`, `TradingPanel`, `BubbleMapPanel` are independent panels the operator drags / docks / hides per layout. Each panel owns its own data subscription and tears down cleanly when undocked.
- **D3 + Three.js BubbleMaps** — D3 for force-directed layout, Three.js for GPU-accelerated rendering when the wallet graph hits a few thousand nodes.

#### Backend stack

`modules/dal_ui/backend/` — **FastAPI on Python 3.12** with SQLAlchemy 2.0 + Alembic for schema migrations, Pydantic for input validation, `structlog` for structured logging. Two separate data-access tiers under it: `modules/dal/` exposes **Arrow Flight** for batch / historical reads; `modules/rpc/` exposes **WebSocket** for live streams (candles, fills, order updates).

#### Auth surface

Five entry paths: **Sign-In With Solana**, **Google OAuth**, **Apple Sign-In**, **email / password**, and **JWT** for service-to-service. Optional **mTLS via Caddy** on `:8443` for hardened inter-service calls, plus a per-route `X-DAL-SECRET` header for the data-access tier so a stolen JWT alone can't read raw warehouse data.

#### Execution

Three on-chain swap adapters: **Jupiter** (aggregator routing), **Raydium**, **Meteora**. Five order types: limit, stop-loss, take-profit, DCA, trailing-stop. **`TradingTerminalExecutor` runs in simulation mode with live exchange quotes by default** (`sim_only=True`); flipping to real-money execution requires explicit per-session user approval, documented in `AGENTS.md`. Circuit breakers, pre-trade validation, and position-limit enforcement are primarily Shaan's safety layer. Trading state persists in **Redis** (per-user open orders, positions, recent fills).

### AI-assisted development infrastructure

The team builds a lot of code per developer-week because we use AI agents heavily and built the supporting infrastructure ourselves rather than depending on a vendor.

#### Custom MCP orchestration server

`modules/orchestration/` — a custom Model Context Protocol server exposing three primary tools to the developer's editor agent:

- **`spawn_child`** — fork a single sub-agent with a scoped task and return its output.
- **`spawn_children_parallel`** — fork N sub-agents concurrently with isolated working contexts; merge results.
- **`consult_expert`** — dispatch to a specific expert profile (below) without taking over the parent session.

The orchestration layer manages process lifecycle, working-directory isolation, and result fan-in.

#### Specialist agent profiles

Specialist profiles each carry a focused system prompt, tool surface, and model assignment:

| Profile | Scope |
| --- | --- |
| `rust-systems` | Jetstreamer / Geyser plugin / decoders |
| `react-frontend` | trading terminal UI |
| `python-backend` | FastAPI / DAL / RPC |
| `data-pipeline` | ClickHouse / TimescaleDB / ETL |
| `code-reviewer` | cross-cutting review pass |
| `trading-engine` | execution / risk / sim layer |

Backed by **Claude Opus 4.6** for the heavy reasoning paths and **GPT-5.2-codex** as a paired alternative for divergent reviews.

#### Structured prompt-tag protocol

Repeatable agent workflows live behind a small set of tag-based commands:

- `<plan:ambitious>` — reach-target plans that intentionally over-scope.
- `<plan:surgical>` — minimal-diff plans for a tight scope.
- `<refactor>` — refactor-only mode (no behavior change).
- `<review>` — invokes the `code-reviewer` profile.
- `<build>` — build/feature delivery.
- `<update>` — small follow-up edits.

Operators learn five tags instead of writing five different prompts; agents land in known modes with consistent expectations.

#### `bipolar/` personality hot-swapper

A working-context switcher: per session, an operator swaps the assistant's lens — data-eng, ML-eng, frontend-eng, etc. The system-prompt + tool subset + repo-scope all change in one command.

#### `.comms/` instead of an orchestrator

Multi-machine work coordinates via a shared `.comms/` directory (file-based mailboxes, locks, and acks) rather than Airflow / Prefect / Dagster. Deliberate: the agent-coordination model wants persistent, inspectable artifacts more than a DAG runtime — every coordinated agent leaves a paper trail another agent (or human) can read back later.
