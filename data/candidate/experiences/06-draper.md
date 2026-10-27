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

Rebuilt the fixture's hardware interface with Python and a serial protocol layer, replaced the GUI with Qt, and introduced explicit recovery and error reporting.

| Failure or workflow problem | Rebuild response |
| --- | --- |
| Serial communication timeouts | Retry with backoff |
| Unclassified exceptions | Structured exception categories and recovery paths |
| Unresponsive hardware | Watchdog-triggered reinitialization |
| Previously silent data-corrupting exceptions | Explicit propagation so failures become visible |
| Fragile operator interface | Replacement Qt GUI |

The previous stack reportedly failed multiple times per day. The follow-up below is an engineering-manager report, rather than a published uptime log.

:::callout
**Verified 2 years post-internship: zero reported errors since deployment.** Follow-up with the previous engineering manager; no raw error log is presented here.
:::

### Multi-file viz suite

Designed an extensible data visualization tool for the team's analysis workflow. Supported importing datasets that spanned multiple files into a single coherent view, and saved visual configuration to JSON so reusable plot setups could be checked in, shared, and re-loaded across sessions. Exported to PNG and custom report formats for inclusion in engineering reports.

### Sensor architecture demonstrator

End-to-end mechanical, electrical, and software design of a large-scale representative model of a sensor architecture. Selected actuators, drove sensor placement, wrote control firmware, and integrated with the rebuilt test fixture above. The demonstrator was used to train on-boarding engineers on the underlying sensor-architecture concepts and as a tangible artifact when pitching a client.
