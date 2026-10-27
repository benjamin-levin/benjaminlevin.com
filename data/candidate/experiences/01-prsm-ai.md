---
id: prsm-ai
company: PRSM AI
location: null
role: Co-Lead Developer
team: null
url: https://prsmai.org
start: Jan 2026
end: Present
priority: 1
tags: [ai, multi-agent, founding, governance, developer-tools, rust, distributed-systems]
---

# PRSM AI — Co-Lead Developer

## Bullets

- Co-founder and co-lead developer of **PRSM**, an in-development platform for coordinating AI agents on substantial software-engineering work.
- Work on orchestration architecture, provider integration, durable workflow coordination, and developer tooling.
- Shape a delivery approach built around explicit ownership, scoped implementation, independent review, and integration evidence.

## Detail

I co-founded **PRSM** to make coordinated software-agent work more manageable: clear ownership, bounded responsibilities, reviewable changes, and a reliable path from a user goal to an integrated result. I co-lead development across orchestration architecture, provider integration, workflow coordination, and developer tooling.

PRSM is in development. This overview reflects the current architectural direction and product plan while keeping the startup's implementation details private.

### The problem we are solving

Adding agents creates coordination work as well as capacity. Someone must decide how a change is divided, who owns an interface, how parallel changes are reconciled, and what evidence is sufficient to call the work complete.

PRSM approaches this as a software-delivery problem. The aim is to give agents useful scope and context while making ownership, review, permissions, and integration explicit.

### Current architectural direction

The current work is a modular runtime rework with extensible integrations and durable workflow state. The design separates coordination, permissions, and execution so that progress can be understood across interruptions and changes of provider.

My focus is the behavior that separation should enable: continuity without losing ownership, integrations that fit a common workflow, and developer tools that help an operator understand what is happening. Internal mechanisms and unreleased interfaces are intentionally outside this public case study.

### From parallel work to reviewed delivery

The [public product workflow](https://prsmai.org/product) describes initiative decomposition, role-based delegation, scoped workstreams, review, and integration. Isolated implementation helps agents make progress in parallel; independent review and integration checks establish whether those changes work together.

The important product distinction is between producing a plausible change and delivering a verified result. PRSM's direction is to make that difference visible throughout the workflow.

### Governance and provider flexibility

Explicit permissions, escalation, and separation of responsibilities are part of the [public governance approach](https://prsmai.org/governance). Different models can serve different roles while ownership and review remain properties of the workflow.

These are design and engineering goals under active development, not a claim of unrestricted autonomy or a generally available production product.

### Development focus

The near-term focus is validating the runtime rework and its integrations against real delivery workflows, improving continuity and operator visibility, and keeping implementation and verification aligned as the system evolves.

See [PRSM](https://prsmai.org) for the public product overview. Detailed internal architecture, proprietary implementation, and unreleased plans remain private.
