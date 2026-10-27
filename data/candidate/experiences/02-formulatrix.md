---
id: formulatrix
company: Formulatrix
location: Bedford, MA
role: Tech. Project Manager + Robotics engineer
team: STACK Team
url: null
start: Oct 2024
end: Jun 2026
priority: 2
tags: [robotics, control, optimization, hardware, manufacturing, ai-tooling, bayesian-optimization, computer-vision, system-identification, distributed-systems]
---

# Formulatrix — Tech. Project Manager + Robotics Engineer

## Bullets

- Built a Bayesian-optimization control-tuning framework (Python, 178 tests across 42 modules) on BoTorch + GPyTorch + PySINDy that replaces hand-tuning of PID/feedforward gains; deployed across two teams on different mechanical platforms (FLO i8 PD positive-displacement microfluidic dispenser and a cart-double-pendulum robotics testbed).
- Implemented robust worst-case-over-contexts acquisition (custom `RobustExpectedImprovement` + `RobustLogNEI`), constraint-shaped BO using PySINDy-derived feasibility regions, and a registry-backed plugin system for experiments / objective processors / simulators / hardware adapters.
- Derived characteristic equations from system-identification data using PySINDy (STLSQ / SR3 / ConstrainedSR3 / MIOSR sparse regression on PolynomialLibrary + FourierLibrary features), with active-CP selection automatically restricting BO search to dynamically relevant parameters.
- Supported both discrete static-bin scheduling (per-bin optimal CP lookup tables) and continuous scheduling (piecewise-linear param models), with quantile auto-binning and curriculum-learning transition pairs for staged equilibrium-to-equilibrium task handoff.
- Led concept-through-customer-PO development of a 144-plate cold/ambient SBS-format labware storage carousel in 8 months: rotating-mount architecture with kinematic user-removable caddies, integrated motor-driven barcode scanning with empty-nest detection, direct-drive closed-loop servo motion, TCP + internal-protocol APIs; standalone or STACK-integrated (1 plate / 10s in dual-STACK configuration). Owned both schedule and spec; did substantial CAD design personally alongside PM duties; reported to Director of Engineering and CEO.
- Drove a single-part-swap modularity decision (changing only the rotating mount plate covers the entire 6–12 caddie size range) that collapsed what would otherwise be distinct SKUs into one core platform plus a part-number variant; managed an international cross-disciplinary team (PMD, ME, 2× EE, SE, manufacturing engineer), hit every milestone, demoed at SLAS 2026 generating 20+ leads, secured first customer PO with more pending; GA targeted end of next half.
- Built a heterogeneous lab-monitoring product (8 Docker services, 150+ FastAPI/WS endpoints) integrating GigE Vision (Sentech/Omron stapipy SDK), RTSP/ONVIF, MotionEye, and a custom Raspberry Pi UDP/RTP sender fleet behind a single `FrameEnvelope` JSON-Schema wire contract; demoed at SLAS 2026 two months post-development start.
- Engineered a lock-free shared-memory ring buffer (designed to port to .NET `MemoryMappedFile` + `Interlocked`), per-camera-profile shared FFmpeg encoder workers, and auto-detected hardware acceleration (NVIDIA / AMD VAAPI / Intel QSV → x264 fallback); documented latency targets <0.8s P50 streaming, 60-minute rolling recording.
- Built event-triggered footage packaging (4s pre/post-roll, per-event clip ledger with SHA-256 in `clips` table) and a self-tagging instrument-scan endpoint that auto-groups cameras by motion correlation during an operator-marked window.
- Developed a high-speed-camera (5 kfps) + bright-field droplet measurement pipeline resolving dispensed volumes down to 50 nL with 15% accuracy (validated against a 0.5 µg gravimetric microbalance), with intrinsic px→mm calibration from algorithmically measured nozzle geometry; subsequently built and productionized an automated microbalance measurement loop that closes the BO tuning cycle on the FLO i8 PD dispenser end-to-end.
- Leading internal AI-code-generation initiatives: piloting Cursor / Claude / Codex across a 10–20-engineer SE-III cohort with structured prompt + review protocols, advising the FSE-deployed RAG support bot trained on tens of thousands of tickets, company-wide management lessons on prompt engineering, and pushed product-roadmap directives to leadership for making Formulatrix instruments first-class in customer AI-driven automation workflows.
- Embedded with **marketing & sales as recurring AI advisor** for lead-generation workflows (message tailoring, list enrichment, follow-up automation, model + prompt selection); **reduced their AI research-credit spend by 60% in the first month** of advising while preserving output volume — most of the savings from swapping premium-model calls for smaller models on filtering / classification steps and from collapsing chained calls into single schema-typed calls.

## Detail

Formulatrix builds **laboratory automation hardware for biotech, pharma, and genomics customers** — the kind of equipment that loads, moves, weighs, dispenses, and inspects plates in a fully unattended workflow. The **STACK team** owns the automated plate-handling systems that connect those instruments together. Across the role I worked simultaneously as a Technical Project Manager (owning end-to-end hardware programs through customer PO) and a Robotics Engineer (writing the control framework that runs on the instruments themselves), with an AI-integration leadership track running on top.

### Bayesian-optimization control-tuning framework

Hand-tuning PID and feedforward gains across many operating regimes is slow, brittle, and doesn't transfer cleanly between mechanical platforms. I built a **Python framework on BoTorch + GPyTorch + PySINDy** (178 tests across 42 modules) that replaces it with Bayesian optimization over a Gaussian-process surrogate, using PySINDy-derived sparse dynamics models to constrain the BO search to the parameters that actually matter. Two teams adopted it on entirely different mechanical hardware: the **FLO i8 PD positive-displacement microfluidic dispenser** and a **cart-double-pendulum balancing testbed**.

#### Robust acquisition over operating contexts

Standard Expected Improvement optimizes the *expected* outcome — fine in a stationary lab but ugly when the deployed instrument runs across a wide regime envelope (different solvent viscosities, different cart masses, different temperatures). Built **`RobustExpectedImprovement`** and **`RobustLogNEI`** acquisition functions that target the **worst case across operating contexts** rather than the mean. That's what makes the results actually deploy: a tuning that's "great on average" but breaks at one corner of the regime is a regression.

#### PySINDy-derived feasibility regions + active-CP selection

The optimizer also takes hard / soft feasibility constraints from PySINDy. The system-identification step fits sparse dynamics models from rollout data using STLSQ / SR3 / ConstrainedSR3 / MIOSR sparse regression on combined `PolynomialLibrary + FourierLibrary` feature sets. The discovered equations carry information about which control parameters are dynamically relevant; an **active-CP selection** step uses that to automatically restrict the BO search to those parameters per context, rather than burning samples in directions the dynamics say don't matter.

#### Plugin architecture

The framework is **registry-backed**: experiments, objective processors, simulators, and hardware adapters are pluggable through a small set of registered factory points. Same tuner core, swap the hardware adapter to retarget; the simulator/hardware split is enforced by isolating `tuner_core/` from any simulator imports and putting MuJoCo / hardware backends into separate `sim_plugins/` directories with a shared dataset contract (`t`, `x`, `u`, `x_next`, `reward`, `done`, `context_bin`, `metadata`) that both feeds tuning and SINDy model fitting.

#### Discrete + continuous scheduling

| Scheduling approach | Representation | Useful when |
| --- | --- | --- |
| Discrete static bins | Per-bin optimal control-parameter lookup tables; quantile auto-binning adapts boundaries to the data | Operating contexts can be grouped into distinct regimes |
| Continuous | Piecewise-linear parameter models | Parameters need to vary across context boundaries |

For equilibrium-to-equilibrium handoff problems (cart-double-pendulum's "transition from upright to inverted-down", or any source-to-target task), the framework supports **curriculum-learning transition pairs**: the tuner learns separate CPs per `(source_equilibrium, target_equilibrium)` pair so the controller has the right setpoint for every direction of transit.

:::callout
**Same core, two platforms.** Validated on a cart-double-pendulum balancing testbed and the FLO i8 PD positive-displacement microfluidic dispenser — adopted by two teams running on entirely different mechanical hardware.
:::

### Storage carousel

End-to-end product I led from concept to first customer PO in **8 months** — a 144-plate cold/ambient SBS-format labware storage carousel with user-removable kinematic caddies and a direct-drive closed-loop servo. I owned both schedule and spec, reported directly to the Director of Engineering and CEO, and did substantial CAD personally alongside PM duties for an **international cross-disciplinary team** (PMD, ME, 2× EE, SE, manufacturing engineer).

#### Architecture

- **Rotating-mount architecture** — the plates ride on a rotating carousel; the access window is fixed and the carousel indexes plates into it. Direct-drive closed-loop servo motion means no belt/pulley height stack and no backlash to compensate in software.
- **Kinematic user-removable caddies** — caddies snap into kinematic mounts on the carousel for tool-free swap; the kinematic interface re-registers the caddy position deterministically so a freshly-loaded caddy doesn't need re-calibration.
- **Integrated motor-driven barcode scanning with empty-nest detection** — a single scanning head reads barcodes as plates index past, and a complementary empty-nest detector flags missing plates so the upstream STACK doesn't try to grab a phantom.
- **TCP + internal-protocol APIs** — works standalone as a customer-facing instrument or integrated into a STACK plate-handling system. In dual-STACK configuration the carousel sustains **1 plate / 10 s** end-to-end throughput.

#### Single-part-swap modularity

The defining architectural call: putting all size-range variation into a **single rotating mount plate**. Swap one part, cover the entire 6–12-caddie range — instead of multiple SKUs with separate base castings, BOM lines, and assembly fixtures, the company ships one core platform plus a part-number variant per size. That decision collapsed what would otherwise have been distinct SKUs into a clean modularity story for sales, manufacturing, and engineering.

:::callout
**Single-part-swap modularity collapsed multiple SKUs into one core platform.** Hit every milestone, demoed at SLAS 2026, generated 20+ leads, first customer PO secured with more pending.
:::

:::stats
- 144 plates · cold/ambient SBS storage
- 6–12 caddies · single-part-swap modularity
- 1 plate / 10s · dual-STACK throughput
- 20+ leads · at SLAS 2026
:::

GA targeted end of next half; additional customer POs pending.

### Lab-monitoring system

Heterogeneous-source video-monitoring product for biotech / pharma labs: aggregates industrial GigE Vision cameras, RTSP / ONVIF IP cameras, legacy USB feeds (via MotionEye), and a custom **Raspberry Pi UDP / RTP sender fleet** behind a single normalized wire contract, then exposes live streams, recordings, and event-triggered clip exports through a unified API. Designed end-to-end and demoed at SLAS 2026 just **two months after development started**.

#### Architecture

- **8 Docker services** with **150+ FastAPI / WS endpoints** glue every operator-facing interaction into one coherent API surface.
- **Single `FrameEnvelope` JSON-Schema wire contract** normalizes frames from all source types (GigE Vision via Sentech / Omron `stapipy` SDK, RTSP / ONVIF IP cams, MotionEye USB, custom RPi senders) so downstream consumers don't care where the frames came from.
- **Lock-free shared-memory ring buffer** transport in front of FFmpeg encoder workers — designed with a clean migration path to .NET (`MemoryMappedFile` + `Interlocked`) so the eventual port to the company's primary stack stays mechanical rather than re-architecture.
- **Per-camera-profile shared FFmpeg encoder workers** — encoder CPU is amortized across cameras with the same profile rather than scaling linearly with camera count.
- **Auto-detected hardware acceleration** — NVIDIA NVENC → AMD VAAPI → Intel QSV → x264 software fallback, in that priority order, picked at startup against the host's actual hardware.
- Latency target **< 0.8 s P50 streaming** with **60-minute rolling recording** as the default retention window.

#### Operator-facing primitives

The interesting parts beyond raw video plumbing are the operator-facing primitives:

- **Event-triggered footage packaging** — 4 s pre-roll + 4 s post-roll around a triggered event, packed into a per-event clip with a **SHA-256 entry in the `clips` ledger table** for tamper-evidence.
- **Self-tagging instrument-scan endpoint** — operator marks a time window during instrument operation; the endpoint identifies which cameras saw correlated motion during that window and **auto-groups them by the new instrument**, building the camera-to-instrument mapping without manual click-through.

:::callout
**Production-readiness artifacts atypical of a two-month prototype** — 24-hour soak runner, documented fault matrix and recovery report, Prometheus metrics, Grafana dashboard, and a versioned phased migration plan to .NET.
:::

### Droplet measurement system → automated gravimetric measurement

To close the BO tuning loop on the microfluidic dispenser, I needed a fast, repeatable volume signal. Built it twice.

| Measurement path | How it produces feedback | Project status |
| --- | --- | --- |
| Optical | Bright-field silhouette → axisymmetric volume reconstruction; checked against a microbalance | Built and validated; images and plots below document the approach |
| Automated gravimetric | Dispense → weigh → score → propose the next control parameters | Productionized as the BO feedback loop |

![Architecture overview: measurement feedback into control tuning](/media/case-studies/legacy-experiences/formulatrix-tuning.svg)

#### v1 — optical, 5 kfps bright-field

A high-speed-camera pipeline running at **5,000 frames per second** under bright-field illumination, processed in OpenCV. Two pieces made it accurate without a per-rig calibration step:

- **In-frame nozzle-geometry self-calibration** — the algorithm measures the dispenser's nozzle silhouette in each session and computes the px → mm intrinsic calibration from its known geometry, so a re-mounted camera or a different test station works without re-calibration.
- **Axisymmetric volume-of-revolution reconstruction** — the dispensed droplet is treated as axisymmetric about its falling axis, so the silhouette + axis are sufficient to compute the 3D volume without stereo or structured light.

Resolved volumes down to **~50 nL with ~15% accuracy**, validated against a **0.5 µg gravimetric microbalance** as the ground truth.

:::row
![Slow-motion of a single dispense](/media/experiences/formulatrix/slow-droplet.gif)
![Bright-field camera view at the nozzle](/media/experiences/formulatrix/camera-droplet.jpg)
![Detected silhouette + axisymmetric profile](/media/experiences/formulatrix/droplet.png)
:::

:::row
![small: Per-dispense volume estimates over a tuning run](/media/experiences/formulatrix/droplet-plot.png)
![small: Optical-pipeline volume vs gravimetric ground truth](/media/experiences/formulatrix/droplet-scatter.png)
:::

#### v2 — automated gravimetric (in production)

Once the microbalance step itself could be automated, the optical pipeline's complexity stopped paying for itself: gravimetric is fewer moving parts, no camera intrinsics to drift, and directly measures the quantity (mass) the BO objective cares about. Built and productionized an automated microbalance measurement loop that integrates directly with the BO framework.

:::callout
**The droplet-platform tuning loop is now self-driving end-to-end** — dispense, weigh, score, propose next control parameters — without operator intervention.
:::

### AI code-generation leadership

Cross-organizational AI-integration program with two halves: turn AI from individual-contributor experimentation into an **organizational capability** with consistent quality bars, and shape the **product roadmap** so Formulatrix instruments are first-class in customers' AI-driven automation workflows.

- **Engineering** — lead AI-for-code-generation sessions for a 10–20-engineer SE-III cohort across Cursor, Claude, and Codex. Established prompt patterns, AI-diff review checklists, and verification protocols so AI output meets the same bar as hand-written code; the protocols include explicit rules around what classes of change require human review even when the AI says it's done.
- **Support** — advised the architecture for a **RAG-based support bot trained on tens of thousands of historical tickets**, now internally deployed for Field Service Engineers. The bot's job is to give an FSE the same context an experienced support engineer would assemble from past tickets, in seconds rather than minutes.
- **Marketing & sales** — embedded as their **recurring AI advisor** for lead-generation workflows. Meet monthly with the marketing and sales department; work spans message tailoring, list enrichment, automation of follow-up cadences, and selecting the right **model + prompt design per step**: cheap-and-fast models for filtering, premium models for the actual draft, structured-output mode for entity extraction. **First month of advising reduced their AI research-credit spend by 60%** while preserving output volume — most of the savings came from (a) replacing premium-model calls with smaller models on filtering / classification steps and (b) collapsing several chained calls into a single schema-typed call. Focus is efficiency, not auto-send: **human-in-the-loop on every external-facing message**.
- **Leadership / management** — surveyed industry AI-integration trends at an international convention and presented to the executive team; running an ongoing prompt-engineering and tooling series for company management. Pushed **product-roadmap directives** to leadership: instruments need to be first-class in customer AI-driven automation downstream of LIMS, not just remote-controllable hardware.
