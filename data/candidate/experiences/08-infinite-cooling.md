---
id: infinite-cooling
company: Infinite Cooling
location: Somerville, MA
role: Mechanical & Software Engineering Co-op
role_short: Mech & CS Co-Op
team: null
url: null
start: Jul 2021
end: Dec 2021
priority: 8
tags: [hardware, software, daq, instrumentation, fatigue-testing, mechanical-design, vibration-testing, hv-systems]
---

# Infinite Cooling — Mechanical & Software Engineering Co-op

## Bullets

- Re-built codebase for customer DAQ with an interdisciplinary team of electrical and mechanical engineers — standardized sensor abstractions, added structured logging, fixed reliability issues causing field failures.
- Designed a **cam-driven vibrational fatigue test rig** to qualify high-voltage wire specs against **Aeolian (vortex-induced) vibration** — the wind-driven Kármán-vortex-shedding failure mode breaking deployed wires in the field. Characterized real field-vibration spectra with accelerometers on production cooling towers and replicated them on the rig (cam-drive selected for the large-displacement excitation regime that electromagnetic shakers couldn't reach economically). Single-wire full-length test article instrumented with **strain gauges + resistance monitoring**; multi-spec head-to-head comparison sweeping wire material, gauge, and strand-count layout. Rig design + build delivered; test campaign was in progress when the internship ended.

## Detail

Infinite Cooling is an MIT-spinoff that **captures and reuses water from cooling-tower plumes** via electrostatic precipitation: a high-voltage electrode array charges the mist droplets escaping the tower, then a grounded mesh collects the charged droplets and routes the recovered water back into the tower. At industrial scale this both **reduces a facility's water consumption** (cooling towers are huge consumers) and **reduces the visible plume** that makes a tower obvious from a distance — both attractive lines for power plants, semiconductor fabs, and large data centers. The hardware footprint that goes onsite is the HV electrode array, the collection mesh, the high-voltage power supply, and a sensor package wired to a customer-facing DAQ that proves to the operator that the system is doing what it's billed for.

I came in as a co-op (Jul 2021 – Dec 2021) and worked across two distinct tracks that bracketed the same field-failure mode the company was hitting at scale: **the DAQ that customers used to monitor performance**, and a **reliability-test rig for the HV wires** that were breaking in the field. The DAQ was a software / instrumentation track; the test rig was a mechanical-design + instrumentation track.

### 1. Customer DAQ codebase rebuild

The customer-side DAQ stack instrumented every deployed system. Inputs:

- **Radial temperature + humidity** profiles above and below the condensation mesh — the proxy for "is mist hitting the mesh and is it actually condensing?"
- **Water-reclamation rate** — the headline metric customers cared about (gallons/hour reclaimed back into the tower).
- **HV power-supply telemetry** (voltage, current, arc-event counters) — diagnostic signal for the electrode array.

The prototype had hard-coded sensor pinouts, inconsistent logging, and collection failures. Working with the electrical and mechanical engineers, I rebuilt the collection path around explicit sensor boundaries.

| Field problem | Design response | Effect on diagnosis or operation |
| --- | --- | --- |
| Sensor variants required collection-loop changes | Uniform `read()`, `health()`, and `calibrate()` interface | New sensor variants use a shared collection path |
| Readings lacked consistent context | Sensor ID, timestamp, calibration version, and health flags | Records carry the context needed for diagnosis |
| One sensor exception stopped the run | Catch errors at the individual sensor boundary | Collection continues with a flagged degraded record |

Implementation details:

- **Standardized sensor abstraction** — a uniform interface (`read()`, `health()`, `calibrate()`) over each sensor type, so adding a new humidity sensor variant didn't require new code paths in the data-collection loop.
- **Structured logging** — every reading tagged with sensor id, timestamp, calibration version, and a per-record health flag, so when a customer reported "the data looks weird from 2 to 4 PM" we could grep instead of guess.
- **Fault-tolerant collection** — the data-collection loop survived single-sensor failures (degraded mode with a flagged record) instead of crashing the whole run. Field-failure cause analysis: the original code's `try/except` was at the loop level, so any sensor exception killed the loop until restart. The rewrite caught at the per-sensor `read()` boundary and continued.

The rewrite shipped to existing customer deployments alongside a per-machine install workflow that pulled the new code, ran a self-test against each connected sensor, and emitted a calibration overlay for the local hardware.

### 2. HV-wire fatigue-life test rig

The active field-failure mode driving this track: **HV wires in deployed installations were snapping after weeks-to-months in the field, in a pattern consistent with Aeolian (wind-induced) vibration.** A round wire in steady wind sheds **Kármán vortices** off its lee side at a frequency proportional to wind speed and inversely proportional to wire diameter. Those alternating vortices put a periodic transverse force on the wire; if the shedding frequency lands near a structural mode of the deployed wire span, the wire goes into self-sustained resonant oscillation at amplitudes that put the steel at the wire's clamp points into the fatigue regime. Days to weeks of that and the wire snaps where the strain concentration is highest — typically right at the strain-relief or insulator clamp.

The engineering question for the company was: **which wire specs survive longest under realistic Aeolian excitation, and how does service life scale with wire material, gauge, and strand-count layout?** That couldn't be answered analytically with confidence (the wire's combined geometry, manufacturing variation, and clamp boundary conditions aren't tractable closed-form), so the right answer was a head-to-head bench test with a defensible excitation profile.

#### Field characterization

First step was characterizing what "realistic excitation" actually looked like. **Mounted accelerometers on the HV wire spans of production cooling towers**, captured wire motion under live wind loading across multiple sites, and built a representative excitation spectrum — peak displacements, dominant frequencies, dwell times. The spectrum told us the rig had to reproduce **large-displacement, low-frequency** motion (centimeters of throw at single-Hz to low-tens-of-Hz frequencies), not the small-amplitude / high-frequency regime electromagnetic shakers excel at.

#### Why a cam, not an EM shaker

Standard practice for vibration testing is an electromagnetic shaker — clean profile, controllable from a waveform generator, easy. But shaker force capacity drops sharply at the displacement amplitudes our spectrum demanded; the few shakers in that envelope ran six figures and still couldn't sustain dwell at peak displacement.

A **cam-driven excitation system** gets there much more economically: a profiled cam on a controlled-speed motor drives a follower that inputs displacement into the wire fixture. Profile shape sets displacement-vs-rotation, motor speed sets frequency. The tradeoff is that the cam profile is fixed once machined, so you need to commit to a target displacement-time profile up front; in exchange you get the large-amplitude low-frequency excitation that the field demands at a build cost the company could absorb in a co-op term.

:::callout
**Cam-driven excitation, not an EM shaker.** Field-replicated amplitudes were beyond the displacement envelope of any economically-procurable shaker. The cam profile was machined to the dominant displacement-vs-time waveform measured in the field; motor speed sweeps the frequency range during the test campaign.
:::

#### Rig design

The rig held a **single full-length wire test article** under realistic clamp boundary conditions (the same insulator/strain-relief geometry used in the field, not a simplified pin support — boundary conditions dominate the fatigue mode). One end was the cam-driven excitation point; the other was the fixed strain-relief, instrumented for fatigue strain. The mechanical chassis was sized to resist the dynamic loads transferred through the structure without shaking on its own (a rig that resonates with the test profile contaminates the data).

#### Instrumentation

Every test article was instrumented two ways:

- **Strain gauges along the wire**, particularly near the clamp points where the field failures originated. Output was the per-cycle strain history that fed the S-N analysis.
- **Resistance monitoring across the wire** as the failure-detection criterion. A fatigue crack reduces the wire's effective cross-section, which shows up as a small resistance rise; **full break = open circuit**, which is the unambiguous test-article-dead signal that ended the run.

#### Test campaign + multi-spec comparison

The campaign swept the design space the company was choosing between: **wire material** (different alloys), **gauge** (cross-section trade-off between fatigue resistance and electrical performance), and **strand-count layout** (solid vs. multi-strand, with different strand-twist patterns affecting both internal damping and surface finish). Head-to-head comparison against the same cam profile across all candidates put the spec-selection decision on data instead of intuition.

| Evidence or deliverable | Status at end of co-op |
| --- | --- |
| Field vibration characterization | Captured to define representative excitation |
| Cam-driven rig | Designed and built |
| Wire material, gauge, and strand-layout comparison | Test campaign in progress; continued by a successor engineer |
| Final fatigue-life ranking | Not reported here; no completed campaign dataset is available on this page |
