// Short, dissimilar labels per experience / project — surfaced on home cards
// and at the top of detail pages. Each one names a distinct *thing Ben built*
// and (when present) maps to a sub-section anchor on the detail page.

export type Highlight = {
  label: string;       // short noun phrase, ~2–5 words
  description: string; // one short sentence describing the topic
  anchor?: string;     // slug into the detail page (matches splitSubsections slugs)
};

export const EXPERIENCE_HIGHLIGHTS: Record<string, Highlight[]> = {
  "behuman": [
    { label: "Chart analysis", description: "Representation, groundedness, evaluation and the delivery decisions supported by experiments.", anchor: "chart-analysis-approach-and-results" },
    { label: "Reviewable comparison", description: "Baseline visibility, evidence review and independent validation before promotion.", anchor: "make-the-comparison-reviewable" },
    { label: "AI quality assurance", description: "Reusable adversarial evaluation and a development dashboard, with rollout limits explicit.", anchor: "reusable-ai-quality-assurance" },
    { label: "Patient experience", description: "Product requirements and delivery for an approachable patient interface.", anchor: "patient-experience-and-delivery" },
  ],
  "prsm-ai": [
    { label: "Delivery workflow", description: "Ownership, scoped implementation, review, and integration.", anchor: "from-parallel-work-to-reviewed-delivery" },
    { label: "Architecture direction", description: "A modular coordination runtime with durable state and extensible integrations.", anchor: "current-architectural-direction" },
    { label: "Governance", description: "Explicit permissions and review responsibilities across providers.", anchor: "governance-and-provider-flexibility" },
    { label: "Development focus", description: "Runtime and integration validation with clear operator visibility.", anchor: "development-focus" },
  ],
  "formulatrix": [
    {
      label: "Storage carousel",
      description: "Designed and shipped a high-density sample-storage carousel for an automated lab platform.",
      anchor: "storage-carousel",
    },
    {
      label: "Lab-monitoring system",
      description: "Built a telemetry and alerting stack for dozens of in-flight lab experiments.",
      anchor: "lab-monitoring-system",
    },
    {
      label: "Bayesian optimizer",
      description: "Closed-loop control-tuning framework using Bayesian optimization over actuator parameters.",
      anchor: "bayesian-optimization-control-tuning-framework",
    },
    {
      label: "Droplet measurement",
      description: "Automated gravimetric droplet-volume measurement system replacing manual calibration.",
      anchor: "droplet-measurement-system-automated-gravimetric-measurement",
    },
    {
      label: "AI code-gen leadership",
      description: "Led adoption of AI-assisted code generation across the engineering org.",
      anchor: "ai-code-generation-leadership",
    },
  ],
  "mantis-dental": [
    {
      label: "Resilient 42K-arch scraper",
      description: "Distributed scraper pulling 42K dental arches with retry, backoff, and deduplication.",
      anchor: "1-dental-arch-scraper-42k-arches",
    },
    {
      label: "Blender Cycles synth (>1M pairs)",
      description: "Synthetic stereoscopic render pipeline producing over a million training pairs in Blender Cycles.",
      anchor: "2-blender-cycles-stereoscopic-render-pipeline-1m-training-pa",
    },
    {
      label: "RAFT-Stereo training",
      description: "Fine-tuned RAFT-Stereo on synthetic plus real data for dental-arch depth estimation.",
    },
    {
      label: "ICP CT-alignment overlay",
      description: "Designed point-cloud reconstruction and ICP-based CT alignment overlay (designed, not shipped).",
      anchor: "3-point-cloud-reconstruction-icp-ct-alignment-designed-not-s",
    },
  ],
  "tesla": [
    {
      label: "400% production throughput",
      description: "Process redesign that quadrupled production rate of the Optimus humanoid finger spring.",
      anchor: "production-throughput",
    },
    {
      label: "Dual-coil finger spring",
      description: "Dual-coil spring architecture plus a vectorized 30M-design optimizer that picked the production geometry.",
      anchor: "dual-coil-spring-architecture",
    },
  ],
  "neu-rover": [
    {
      label: "6-DOF arm",
      description: "Designed and built the team's 6-degree-of-freedom rover arm end-to-end.",
      anchor: "6-dof-arm",
    },
    {
      label: "Mechanical co-lead",
      description: "Co-led the mechanical sub-team across the competition season.",
      anchor: "mechanical-co-lead",
    },
  ],
  "draper": [
    {
      label: "IMU fixture rebuild",
      description: "Rebuilt the legacy IMU calibration fixture from scratch with a modernized DAQ path.",
      anchor: "imu-fixture-rebuild",
    },
    {
      label: "Multi-file viz suite",
      description: "Built a multi-file visualization suite for cross-run IMU and sensor analysis.",
      anchor: "multi-file-viz-suite",
    },
    {
      label: "Sensor architecture demonstrator",
      description: "Delivered a working sensor-architecture demonstrator for stakeholder review and onboarding.",
      anchor: "sensor-architecture-demonstrator",
    },
  ],
  "mantis": [
    {
      label: "Killed Delta 6-axis prototype",
      description: "Recommended killing an over-scoped Delta 6-axis prototype before more time was burned.",
      anchor: "killed-delta-6-axis-prototype",
    },
    {
      label: "Serial arm deployment",
      description: "Designed, built, and field-deployed the 3-axis serial-arm replacement — mech, FEA, C++ control, Linux drivers, install scripts.",
      anchor: "serial-arm-deployment",
    },
  ],
  "infinite-cooling": [
    {
      label: "DAQ rebuild",
      description: "Rebuilt the customer-facing DAQ codebase from a fragile prototype into a production system.",
      anchor: "1-customer-daq-codebase-rebuild",
    },
    {
      label: "Aeolian-vibration test rig",
      description: "Designed and instrumented an HV-wire aeolian-vibration fatigue-life test rig.",
      anchor: "2-hv-wire-fatigue-life-test-rig",
    },
  ],
};

export const PROJECT_HIGHLIGHTS: Record<string, Highlight[]> = {
  "unify": [
    { label: "Shared prefill", description: "Reuse Bonsai context across roles instead of repeatedly processing the same prefix.", anchor: "bonsai-role-mode-and-shared-prefill" },
    { label: "Elastic KV", description: "Grow the cache while accounting for temporary allocations and device headroom.", anchor: "elastic-kv-and-allocation-transients" },
    { label: "Audio stitching", description: "Clause-aware first audio, sentence grouping, pauses, and listening comparisons.", anchor: "audio-stitching-is-part-of-the-model-experience" },
    { label: "Speculation and state", description: "Draft verification, batching tradeoffs, and correct recurrent rollback.", anchor: "speculation-batching-and-verification" },
    { label: "Measured replay", description: "Same-endpoint 6.66 to 3.66 s pilot, measured to first software PCM.", anchor: "measured-replay-comparison" },
  ],
  "deception-probes": [
    { label: "Transfer and inversions", description: "A successful within-task direction can reverse its ranking on another task.", anchor: "cross-task-failure-and-inverted-rankings" },
    { label: "Refusal controls", description: "Why a perfect matrix needed a same-corpus comparison.", anchor: "the-perfect-result-that-needed-a-control" },
    { label: "Behavioral labels", description: "Separate harmful prompts from the model's observed refusal behavior.", anchor: "harmful-prompts-are-not-observed-refusals" },
    { label: "Uncertainty", description: "What the nulls, bootstrap intervals, and retained artifacts actually establish.", anchor: "what-the-nulls-and-uncertainty-actually-cover" },
  ],
  "mlx-fast": [
    { label: "25 approaches", description: "Twelve useful paths, their operating regimes, and the failed assumptions behind the rest.", anchor: "the-twelve-useful-paths" },
    { label: "Quantized attention", description: "Why the unfused path lost and the compiled kernel was a different experiment.", anchor: "quantized-attention-why-fewer-bytes-initially-lost" },
    { label: "Cache traffic", description: "Physical trimming versus selecting positions while still scanning the full cache.", anchor: "snapkv-selection-has-to-remove-real-traffic" },
    { label: "Speculative state", description: "Draft acceptance is useful only after verification and exact recovery are paid for.", anchor: "speculation-draft-quality-and-recovery-cost-decide-the-win" },
    { label: "Negative results", description: "Thirteen approaches that did not earn a default and what each taught.", anchor: "the-thirteen-paths-that-did-not-earn-a-default" },
  ],
  "ai-assistant": [
    {
      label: "Voice runtime",
      description: "Always-on voice assistant runtime with wake-word, barge-in, and tool dispatch.",
      anchor: "voice-runtime",
    },
    {
      label: "AI-research digest",
      description: "Daily pipeline that pulls, dedupes, and summarizes AI research into a personal digest.",
      anchor: "ai-research-digest-pipeline",
    },
    {
      label: "Autonomous job scout",
      description: "Background agent that scouts and ranks job listings against a personal profile.",
      anchor: "autonomous-job-scout",
    },
    {
      label: "Openclaw text core",
      description: "Text-based core powering chat, command parsing, and tool dispatch across surfaces.",
      anchor: "openclaw-text-core",
    },
    {
      label: "Persistence + deployment",
      description: "Durable session storage and one-command deploy across personal machines.",
      anchor: "persistence-deployment",
    },
  ],
  "trading-algo": [
    {
      label: "Data infrastructure",
      description: "Bare-metal Solana ingestion and historical bar storage feeding the backtester.",
      anchor: "data-infrastructure",
    },
    {
      label: "Strategy & ML",
      description: "Feature engineering and ML modeling for short-horizon edge on liquid pairs.",
      anchor: "strategy-ml",
    },
    {
      label: "Trading terminal",
      description: "Operator-grade trading terminal that runs strategies live — my primary scope.",
      anchor: "trading-terminal-my-primary-scope",
    },
    {
      label: "AI-assisted dev infra",
      description: "Internal AI-assisted dev infrastructure that accelerated iteration speed across the team.",
      anchor: "ai-assisted-development-infrastructure",
    },
  ],
  "tetris-bot": [
    {
      label: "3-architecture progression",
      description: "Progression across three architectures from greedy heuristic to learned policy.",
      anchor: "architectural-progression",
    },
    {
      label: "Heuristic pruning",
      description: "Tree-search pruning using hand-tuned heuristics to bound expansion.",
      anchor: "heuristic-pruning",
    },
    {
      label: "9 features × 5 basis (45 weights)",
      description: "Nine features expanded over a degree-five polynomial basis — 45 trained weights total.",
      anchor: "9-features-5-polynomial-basis-45-trained-weights",
    },
    {
      label: "SGD + EA wrapper",
      description: "SGD with derived gradients, wrapped by an evolutionary algorithm for global search.",
      anchor: "sgd-with-derived-gradients-ea-wrapper-for-global-search",
    },
    {
      label: "Long-game robustness",
      description: "Policy stays stable across multi-hour games under sparse rewards and rare patterns.",
      anchor: "long-game-robustness",
    },
  ],
  "en-passant": [
    {
      label: "Motion system",
      description: "Three-stage roadmap from shipped CoreXY gantry to linear motors to solid-state PCB-coil array.",
      anchor: "motion-system",
    },
    {
      label: "Sensing modalities",
      description: "Capacitive array shipped today; coils as ring-down / frequency-sweep / backscatter sensors at stage 3.",
      anchor: "sensing-modalities-and-time-multiplexing",
    },
    {
      label: "ML localization",
      description: "Permutation-invariant CNN regressing 32 piece coordinates from the capacitive cross-talk grid.",
      anchor: "ml-piece-localization",
    },
    {
      label: "Path planner & demo",
      description: "A* router on an inflated board grid plus Lichess integration for full live games.",
      anchor: "path-planner-and-lichess-integration",
    },
    {
      label: "Identification & control loop",
      description: "Per-piece EM signatures plus closed-loop sense → plan → actuate → re-sense.",
      anchor: "identification-strategy-and-closed-loop-control",
    },
    {
      label: "Coil hardware & tradeoffs",
      description: "Driver, sensing front-end, signal processing, and the dynamic-range / thermal challenges.",
      anchor: "coil-hardware-signal-processing-and-tradeoffs",
    },
  ],
  "ornithopter": [
    {
      label: "Why flap",
      description: "Motivation for choosing a flapping wing over conventional propulsion.",
      anchor: "why-a-flapping-wing",
    },
    {
      label: "Shoulder linkage",
      description: "Shoulder linkage design that translates motor torque into wing flap.",
      anchor: "shoulder-linkage",
    },
    {
      label: "Particle-swarm optimizer",
      description: "Particle-swarm optimization over linkage geometry to maximize lift per watt.",
      anchor: "particle-swarm-optimization",
    },
    {
      label: "Runtime AoA toolchain",
      description: "Runtime angle-of-attack toolchain for in-flight tuning of wing pitch.",
      anchor: "runtime-aoa-toolchain",
    },
    {
      label: "Test fixture & build",
      description: "Bench test fixture and final build process for the prototype.",
      anchor: "test-fixture-and-build",
    },
  ],
};
