---
id: ornithopter
title: Ornithopter (Daedalus / MRK4)
role: Mechanical & ML/Software, Shoulder Subsystem (ME Capstone)
url: null
start: Jul 2023
end: Dec 2023
priority: 7
tags: [robotics, hardware, optimization, mechanical-design, kinematics, particle-swarm, capstone, embedded, arduino]
---

# Ornithopter — Mechanical Engineering Capstone

## Bullets

- Designed and optimized the **2-DOF spatial shoulder linkage** of a flapping-wing flying robot (ME capstone, "Daedalus / MRK4"), converting **a single BLDC flap motor into synchronized stroke (φ) + feathering / angle-of-attack (α) outputs** through a 5-link chain with eccentric pin and differential plate. Servo-trimmed AoA carrier (ψ) provides a slow runtime tuning axis.
- Built a **custom Particle-Swarm Optimizer** (NumPy, 20 particles × 100 iterations, 6 design variables — crank radii R1/R2, connecting-rod length L, base-frame translation offset Sx/Sy/Sz) that searched the linkage geometry space against a target ±45° sinusoidal stroke profile. Ran a parallel **81-combo hyperparameter grid search** over PSO inertia / cognitive / social coefficients via `multiprocessing.Pool` to find the most reliable swarm dynamics.
- Productionized the resulting linkage as a **runtime AoA-trim toolchain**: PSO geometry → parallel `ThreadPoolExecutor` sweep of a **181×181 (θ, ψ) → (β, α) forward-kinematic lookup table** (multi-seed `scipy.fsolve` with branch selection across the 4-bar's two solution branches) → interactive Tk GUI to paint a target AoA(θ) curve → **cyclic 5th-order polynomial fit with first-derivative continuity at the wrap** → emit Arduino header file → runtime `multiMap<float>` linear interpolation against an **AS5600 magnetic encoder** (Kalman-filtered RPM feedback) controlling a BLDC ESC + 2 servos.
- Built mechanical CAD assembly in Inventor (`Shoulder Asm.iam`, ball-joint + swivel-joint hardware sourced from McMaster `1064K811`, `1071K11/23`) and the surrounding ornithopter assembly (`Daedalus 2`, `MRK4`).

## Detail

ME capstone — a flapping-wing flying robot ("Daedalus / MRK4"). On a multi-person team, my end-to-end scope was the **shoulder subsystem**: linkage geometry, PSO optimization, forward-kinematic lookup tables, runtime AoA-trim toolchain, and Arduino firmware.

![Ornithopter flapping — built prototype on the bench](/media/projects/ornithopter/flapping.mov)

### Why a flapping wing

Fixed-wing aircraft trade maneuverability for endurance; quad-rotors trade endurance for maneuverability. A flapping wing sits in the middle — and (per Festo's SmartBird, the team's reference point) is dramatically quieter and more bird-like than a propeller. The target is a bird-like stroke profile with a fast downstroke for lift and a slower, feathered recovery.

![Festo SmartBird — the inspiration](/media/projects/ornithopter/festo-bird.mp4)

### Shoulder linkage

The shoulder is the project's hardest mechanical problem: a single BLDC motor must drive both **stroke (φ)** and **feathering / angle-of-attack (α)** in one coordinated cycle. I built it as a spatial 5-link chain — a non-planar 4-bar for stroke, plus a servo-positioned secondary chain that biases the AoA carrier (ψ) for slow runtime trim. Six geometry variables (R1, R2, L, Sx, Sy, Sz) fully parameterize the chain.

![Stroke kinematics — derivation of φ(θ) from R1, R2, L and the base-frame offset Sx/Sy/Sz](/media/projects/ornithopter/plunging-kinematics.png)
![AoA chain — a second crank on a servo carrier feeds a 4-bar that drives the differential plate](/media/projects/ornithopter/aoa-diagram.png)
![Final shoulder CAD — ball joints, differential plate, drivetrain pulley](/media/projects/ornithopter/shoulder-anim.mp4)

### Particle-swarm optimization

I wrote a custom particle-swarm optimizer in NumPy: 20 particles × 100 iterations across the 6 geometry variables, minimizing RMSE between the linkage-produced φ(θ) and a target asymmetric stroke. An 81-combo grid search over PSO inertia/cognitive/social coefficients ran in parallel via `multiprocessing.Pool` to pick the most reliable swarm dynamics. The winning geometry drove a parametric Inventor model directly into CAD.

![PSO convergence — 20 particles settling onto the optimum in a 2D parameter slice](/media/projects/ornithopter/ornithopter-pso.mp4)

:::stats
- 6 design variables · R1, R2, L, Sx, Sy, Sz
- 20 particles × 100 iterations · custom NumPy PSO
- 81 hyperparameter combos · grid-searched in parallel via multiprocessing
- 181 × 181 lookup table · forward kinematics over (θ, ψ)
:::

:::callout
**33% faster downstroke** — the asymmetry that does most of the lifting work, achieved through the spatial 5-link geometry the PSO converged on.
:::

![Parametric Inventor model — PSO outputs flow straight into the shoulder CAD](/media/projects/ornithopter/param-cad.png)

### Runtime AoA toolchain

PSO fixes geometry once; *which* AoA profile the bird actually executes is a runtime choice. I generated a 181×181 forward-kinematics lookup table over (θ, ψ) → α — multi-seed `fsolve` with branch-filtering to avoid bistability — then a Tk GUI lets the user paint a target α(θ) curve. A path-optimizer walks the (θ, ψ) surface to minimize α-error and total ψ-movement; a cyclic 5th-order polynomial with first-derivative continuity at the wrap is exported to an Arduino header and interpolated at runtime against an AS5600 encoder.

![(θ, ψ) → α surface from the parallel forward-kinematics solver](/media/projects/ornithopter/aoa-surface.png)
![Interactive AoA curve picker — paint α(θ), the optimizer finds ψ(θ)](/media/projects/ornithopter/aoa-picker.mp4)
![Optimized ψ-path overlaid on the surface, plus the cyclic 5th-order fit](/media/projects/ornithopter/slice-fit.png)

### Test fixture and build

A 2-DOF gantry test fixture mounts a single wing in front of a fan bank, isolating lift/drag against AoA, flap frequency, and stroke amplitude. The optimal linkage was built and flown on the fixture for tuning.

![Test fixture under load](/media/projects/ornithopter/fixture-test.mp4)
![Ornithopter flapping](/media/projects/ornithopter/flapping.mov)
![Flight test](/media/projects/ornithopter/flight-test.mov)
![Built ornithopter](/media/projects/ornithopter/prototype.jpeg)
