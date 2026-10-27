---
id: mantis
company: Mantis Health
location: Stamford, CT
role: Mechanical & Software Engineer
team: null
url: null
start: Jun 2018
end: Apr 2022
priority: 7
tags: [robotics, hardware, computer-vision, embedded, fea, c-plus-plus, linux]
---

# Mantis Health — Mechanical & Software Engineer

## Bullets

- Engineered the **3-axis serial robotic arm that became the production stereoscopic-camera manipulator** (the replacement for an earlier 6-axis Delta prototype that I killed): designed joint assemblies and industrial casing, performed structural FEA analysis, designed control algorithm in C++.
- Developed robotic arm in-house by implementing Linux drivers for joystick, while communicating with manufacturers for part selection and sourcing and performing reliability testing.
- Created Unix scripts for easy field deployment, installation of system, and source control.
- Led a **company-sanctioned exploratory 6-axis Delta-type parallel-kinematic** surgical-camera manipulator prototype (chosen for compactness, repeatability, lower motor cost, and simpler motor placement) — concept to working prototype in **6 weeks** (2 weeks mech, 2 weeks IK + control, 2 weeks assembly + testing). Bench testing surfaced that the architecture was **over-constrained in (x, y, z, pitch, roll) but under-constrained in yaw** — a kinematic-geometry problem the architecture couldn't be tuned out of. **Killed the program rather than fight the constraint topology**; the lessons fed directly into the simpler 3-axis serial arm that shipped.

## Detail

Mantis Health was an early-stage startup building a **stereoscopic surgical-imaging system** — two synchronized cameras mounted above the operating field, computing live depth maps and a 3D reconstruction of the surgical site for the operating surgeon. The cameras lived on an end-effector that had to hold a multi-kilogram stereo rig dead-still at any programmable pose around the patient and reposition smoothly between shots without bumping the surgeon, the lights, or the OR table. That manipulator was the load-bearing piece of hardware; if it shook, everything downstream (depth quality, registration, the surgeon's confidence) degraded.

I joined out of high school in 2018 and stayed through early college (April 2022), wearing whatever hat the company needed at each stage — early on that meant prototyping in CAD and mounting cameras by hand; later it became the engineer responsible for the production manipulator's mechanical, electrical, and software pieces, plus the field deployment story.

### Killed Delta 6-axis prototype

Led a company-sanctioned exploratory build of a 6-axis manipulation platform using **Delta-type parallel kinematics** adapted from 3D-printer architecture. The architectural pitch was strong on paper: three actuators driving three pairs of parallel forearms onto a shared end-effector plate gives you **mechanical averaging of joint error** (repeatability without per-joint hand-tuning), **all motors mounted at the base** (lighter moving mass, lower inertia, faster moves, no cabling running the length of a moving arm), and a much **smaller swept volume** than a serial arm of comparable reach — which mattered because the OR ceiling is low and the surgeon's working envelope is sacred.

| Architecture | Reason to explore or select it | Observed project outcome |
| --- | --- | --- |
| Delta-type parallel prototype | Compact swept volume, base-mounted motors, and mechanical averaging of joint error | Bench testing exposed yaw drift; program stopped |
| Serial camera arm | Predictable, well-constrained kinematics for deterministic camera positioning | Developed through reliability testing and field deployment |

Concept to working prototype in **6 weeks**, scoped into three two-week blocks:

- **Mechanical design** (weeks 1–2): three identical actuator-arm assemblies, a fixed base plate, a moving end-effector plate, and ball-jointed parallel forearms in between. Drove the joint geometry off available stepper torque and carbon-fiber rod stiffness numbers. Rapid CAD iteration to converge on a build that fit the camera mass at full extension.
- **Inverse kinematics + control** (weeks 3–4): derived the closed-form IK from end-effector position to joint angles by hand, validated against a Python forward-kinematics simulator, and ported to the embedded controller. Wrote a path-blender so successive setpoints didn't snap-step.
- **Assembly + bench testing** (weeks 5–6): printed and machined parts arrived, integrated the actuators and forearms, and walked it through the workspace.

![Delta-type parallel-kinematics motion](/media/experiences/mantis/delta-motion.gif)

Bench testing surfaced the killer: the architecture was **over-constrained in (x, y, z, pitch, roll) and under-constrained in yaw**. End-effector position locked precisely; end-effector pitch and roll locked precisely; but yaw — rotation about the end-effector's normal vector — drifted freely. The three pairs of parallel forearms (six rods total) lock five of the six end-effector DOFs by geometry alone. The sixth — yaw about the camera-normal axis — has no constraint anywhere in the linkage. We saw it as visible azimuthal sway under load, and it was *not* a tuning issue: no controller gain, mechanical preload, or actuator change can constrain a DOF that the kinematic chain doesn't constrain in the first place.

The standard fix in the literature is to add a **passive central column with a torsional constraint** (the "U-joint at the center" pattern from 6-DOF Stewart variants), but at that point the topology is no longer a Delta and you've reintroduced a moving-mass element that defeated the original architectural pitch.

![Delta CAD iteration](/media/experiences/mantis/cad-iteration-1.png)
![Inverse-kinematics derivation](/media/experiences/mantis/ik-derivation.png)
![Assembled Delta prototype](/media/experiences/mantis/assembled.jpg)

:::callout
**Killed the program rather than fight the constraint topology.** Over-constrained in (x,y,z,pitch,roll) and under-constrained in yaw — a kinematic-geometry property of the linkage, not a controller-tuning issue. The recommendation to leadership was to spend the next iteration on a serial arm rather than try to retrofit the Delta's missing DOF; the IK derivation work, the joint design intuition, and the supply-chain relationships all transferred forward.
:::

### Serial arm deployment

Engineered the **3-axis serial arm** that replaced the Delta and shipped as the production stereoscopic-camera manipulator. End-to-end ME + EE + SW ownership through prototype, reliability testing, field deployment, and the install/update tooling that ran at customer sites. Trading the Delta's compactness for a serial arm's **predictable, well-constrained kinematics** — the right call for a surgical application that wanted deterministic pose at low cycle rates over maximum throughput.

#### Mechanical design + FEA

The arm is a three-revolute-joint chain: a base yaw joint, a shoulder pitch joint carrying the upper link, and an elbow pitch joint carrying the forearm and the camera-mount plate. Joint assemblies were specified around **planetary-gearbox stepper modules** with built-in encoders for closed-loop position, sized so each joint could hold its rated payload (the camera plus the worst-case lever arm of the joint distal to it) at zero motor current. The casing was an industrial-cleanroom-friendly enclosure designed to seal the drive train against OR contaminants and let the entire arm be wiped down between cases.

Structural **FEA in Solidworks Simulation** drove the joint and link geometry. Load cases that mattered: the elbow joint at full forearm extension under camera weight (worst-case torque), the shoulder under combined pitch torque + gravity moment when the arm reached out laterally, and a **collision impact case** for an inadvertent bump into the camera assembly. The output was minimum wall thickness on the structural housings and bearing pre-load specs that gave acceptable deflection (sub-millimeter at the camera tip across the workspace) without overspec-ing the actuators.

#### Control algorithm in C++

Wrote the full pose-control stack in C++:

- **Forward kinematics** from joint encoders to camera pose for the live UI overlay.
- **Closed-form inverse kinematics** for the 3-DOF chain (a textbook geometric solve, since 3-axis serial has clean closed-form rather than the iterative numerical solve a 6-DOF arm would need) with branch selection so the arm doesn't flip elbow configurations mid-trajectory.
- **Per-joint PID** with feed-forward gravity compensation derived from the link mass model, so static-pose holding doesn't burn motor current heat and so trajectory tracking doesn't lag under load.
- **Trajectory blending** between waypoints (S-curve velocity profiles) so a surgeon driving the camera by joystick gets smooth motion, not staircase steps when the setpoint stream updates.

#### Linux joystick driver

Off-the-shelf userspace joystick libraries (SDL, jstest, etc.) all introduced ~30–80 ms of input latency between the surgeon's stick deflection and a controller setpoint update — visibly laggy when the surgeon was driving the camera live. Implemented the joystick driver in-house against the **`/dev/input/js0` raw event interface** in the kernel, with a tight `read(2)`-loop polling at 1 kHz and minimal user/kernel boundary crossing. Calibration and deadband filters lived in userspace; the hot path stayed on a single CPU core to avoid scheduling jitter. Shipped sub-millisecond input latency from stick to setpoint update.

#### Reliability testing + supply chain

For a clinical product the arm has to behave the same on day 1 and day 1000. Designed and ran **bench reliability tests** including continuous joint-cycling at full payload, sustained-pose hold tests for thermal soak, and inadvertent-impact tests against the camera mount. Worked directly with **bearing, gearbox, and stepper manufacturers** for part selection — comparing torque/backlash spec sheets, life-cycle ratings, and qualifying replacement parts against datasheet drift before incorporating them into the BOM.

#### Field deployment + install scripts

Each customer-site machine had its own Linux install: differing kernel versions, differing udev rules, differing user accounts. Wrote **Unix install scripts** that:

- Configured systemd units so the control daemon started at boot and respawned on crash.
- Installed udev rules that named `/dev/input/js*` and the controller serial port deterministically regardless of plug-order.
- Pulled a versioned source bundle from internal source control, applied a per-machine calibration overlay (joint offsets measured at install time), and ran a self-test that walked the arm through a known trajectory and compared encoder feedback against the expected path.
- One-shot install + update — the field engineer runs the script, the system either comes up clean or fails loudly with a diagnostic log.

The same scripting carried the source-control workflow: each customer machine was a tagged config in a central repo, so a hot-fix could be staged, reviewed, and deployed without an engineer flying to the site.

![small: 3-axis serial arm prototype on the bench](/media/experiences/mantis/3-axis-prototype.mp4)
![6-axis system field deployment](/media/experiences/mantis/6-axis-deployment.mov)