---
id: tesla
company: Tesla
location: Palo Alto, CA
role: Autopilot Intern
team: Optimus Structures Team
url: null
start: May 2023
end: Sept 2023
priority: 3
tags: [robotics, hardware, manufacturing, humanoid, ml-systems, optimization, failure-mode-analysis, process-improvement, vectorized-search]
must_include_bullet_ids: [tesla-400-pct]
---

# Tesla — Autopilot Intern (Optimus Structures Team)

## Bullets

- id: tesla-400-pct
  text: Drove a **400% increase** in Optimus hand production throughput for data-collection fleets via three reinforcing tracks — (a) stood up a Jira dashboard coordinating **8 repair technicians** and **10–12 mocap data labelers** to track hand repair events and failure modes; (b) presented weekly findings to an 8-person cross-functional engineering audience (mechanical, electrical, software, leadership) to direct mitigation effort at highest-impact failures; (c) redesigned mechanical parts for repairability and easier assembly, built assembly tooling and jigs, trained technicians, and rewrote build documentation enabling parallel work distribution across the bench.
- id: tesla-spring
  text: Designed a **novel single-piece dual-coil extension spring** for Optimus 2-segment fingers — one continuous piece of wire formed into a central ring with two dissimilar extension-spring coils on each side, independently tuning the **MCP** and **PIP** joints from a single component; tuned for **human-like grasp-release dynamics** and constrained to fit inside both existing and future finger envelopes.
- id: tesla-spring-tool
  text: Built a **fully vectorized** spring-optimization tool that evaluated **~30M unique designs** across **7 spring parameters** (wire diameter, material, per-side coil turns and outer diameters, per-joint pulley diameters), scoring each on **effective angular acceleration**, **fatigue life** (S-N curve + Shigley's empirical spring equations), **manufacturability**, and form-factor fit. The tool has continued to drive design decisions as the finger architecture has evolved post-internship.

## Detail

I joined the Optimus Structures Team while the program was scaling its data-collection fleet, and hand assembly was the bottleneck. The internship split into one process-heavy and two design-heavy contributions, all converging on getting more working hands onto more robots, faster.

### Production throughput

:::callout
**400% increase in Optimus hand production throughput** — combined effect of failure-mode tracking, mechanical redesign for repairability, and rewritten documentation enabling parallel-build distribution.
:::

I stood up a Jira dashboard as the single source of truth for repair tickets, coordinating **8 repair technicians** and **10–12 mocap data labelers** so every failed hand was logged, classified, and tagged with a root-cause hypothesis. Weekly cross-functional reviews (mechanical, electrical, software, leadership) turned scattered bench knowledge into a prioritized engineering backlog. On the mechanical side I redesigned parts for repairability — eliminating manual deburring, swapping hand-screwed joints for snap-fit + structural adhesive, and building jigs that let one technician run two parallel builds. Rewritten step-by-step build manuals cut training from three shadow shifts to one and unlocked parallel work distribution across the bench.

![Tesla Optimus hand closeup](/media/experiences/tesla/optimus-hand-closeup.jpg)

### Dual-coil spring architecture

Each 2-segment finger needs passive return-to-extended after grip release with human-like dynamics, inside a tight envelope, at fleet-scale cycle counts. I converged on a **single continuous piece of wire** formed into a central ring with **two dissimilar extension-spring coils** branching off — one per side, independently tuning the MCP and PIP joints from one integrated component. The architecture collapses what would otherwise be two separate springs (and their failure modes) into a single part while letting geometry differ across the two joints, and fits inside both the current finger and a forward-looking envelope.

![Tesla Optimus Gen 2 hands holding eggs with tactile-sensor heatmap visualization](/media/experiences/tesla/hand-tactile-egg-demo.jpg)

To pick the geometry, I built a fully vectorized NumPy tool sweeping **7 parameters** — wire diameter, material, per-side coil turns and outer diameters, and per-joint pulley diameters — across roughly **30 million candidate designs** in one batched pass. Each candidate was scored on effective angular acceleration (the human-like-dynamics figure of merit), fatigue life from S-N curves and Shigley's empirical spring equations, manufacturability against producible wire stock, and geometric fit. Vectorization was the load-bearing choice — it turned a per-candidate analysis into one array computation, making full-design-space sweeps tractable on a workstation.

:::stats
- 30M designs · 7 parameters · vectorized
- 4-axis scoring · angular acceleration, fatigue life, manufacturability, fit
:::

![Tesla Optimus Gen 2 hand pinching an egg](/media/experiences/tesla/gen2-hand-holding-egg.png)

*Hand photos: stills from Tesla's December 2023 Optimus Gen 2 reveal video.*
