---
id: draper
company: Draper Laboratory
location: Cambridge, MA
role: Mechanical & Software Engineering Co-op
role_short: Mech & CS Co-Op
team: null
url: null
start: Jul 2022
end: Dec 2022
priority: 6
tags: [hardware, software, instrumentation, guidance-systems, embedded]
---

# Draper Laboratory — Mechanical & Software Engineering Co-op

## Bullets

- Completely overhauled an **IMU-characterization test fixture's** software — modernized hardware interfacing, replaced the GUI with a Qt-based stack, and built an **automated error-handling library** combining retry-with-backoff on serial-comms timeouts, structured exception categorization with auto-recovery, watchdog-based hardware re-init, and explicit propagation of previously-silent data-corrupting exceptions. The prior stack errored out multiple times per day from a mix of comms timeouts, race conditions on shared state, GUI deadlocks, and untracked exceptions; **verified with the previous engineering manager 2 years post-internship that the rebuild has run with zero reported errors since deployment**.
- Designed extensible data visualization suite with the ability to import data sets spanning multiple files and to save visual configuration to JSON files for import in the future.
- Designed, characterized, and specified mechanical, electrical and software system to run large-scale representative model of guidance system for client and on-boarding engineers.

## Detail

Draper Lab is a not-for-profit R&D lab spun off from MIT, with deep history in inertial guidance systems (Apollo, Polaris, etc.). The co-op covered three major areas.

### IMU fixture rebuild

Completely overhauled the IMU-characterization test fixture's software stack — modernized hardware interfacing with a Python + serial protocol layer, replaced the legacy GUI with a Qt-based stack, and built an automated error-handling library with retry-with-backoff, exception categorization, watchdog re-init, and explicit propagation. The pre-overhaul fixture crashed multiple times per day from comms timeouts, race conditions on shared state, GUI deadlocks, and silently-corrupting untracked exceptions.

:::callout
**Verified 2 years post-internship: zero reported errors since deployment.** A multi-year production track record on a fixture that previously failed daily.
:::

### Multi-file viz suite

Designed an extensible data visualization tool for the team's analysis workflow. Supported importing datasets that spanned multiple files into a single coherent view, and saved visual configuration to JSON so reusable plot setups could be checked in, shared, and re-loaded across sessions. Exported to PNG and custom report formats for inclusion in engineering reports.

### Sensor architecture demonstrator

End-to-end mechanical, electrical, and software design of a large-scale representative model of a sensor architecture. Selected actuators, drove sensor placement, wrote control firmware, and integrated with the rebuilt test fixture above. The demonstrator was used to train on-boarding engineers on the underlying sensor-architecture concepts and as a tangible artifact when pitching a client.
