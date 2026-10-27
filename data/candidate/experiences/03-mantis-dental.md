---
id: mantis-dental
company: Mantis Dental
location: Remote
role: ML Engineer (Contract)
team: null
url: null
start: Aug 2024
end: Oct 2024
priority: 4
tags: [computer-vision, ml-systems, stereoscopic-vision, disparity-mapping, point-cloud, raft-stereo, blender, cycles, synthetic-data, domain-randomization, gd-and-t, web-scraping, selenium, medical, ar-overlay, pytorch, python]
---

# Mantis Dental — ML Engineer (Contract)

## Bullets

- Built a **session-resilient Selenium-driven dental-arch scraper** against a chronically unreliable third-party dentist database — robust per-arch validation, checkpoint-and-resume mechanics, and re-authentication recovery that survived the database's frequent unprompted logouts mid-interaction. Built a steady-state corpus of **42,000 3D dental-arch meshes** out of an upstream that was effectively unusable without this resilience layer.
- Built a **Blender Cycles (path-traced) headless stereoscopic-rendering pipeline** producing **>1M photorealistic stereo training pairs** from the 42K-arch corpus by sweeping each arch on a semi-random camera path. **Domain-randomized** the stereo baseline, camera-to-arch pose, and inter-camera manufacturing-tolerance deviations using **GD&T-grounded distributions** to mirror the real loupe-hardware variation envelope — sidestepping the cost and ethical friction of in-the-mouth stereo capture while giving the model a tolerance-grounded prior. Set up **RAFT-Stereo (PyTorch)** disparity-mapping training on the corpus.
- Designed the downstream **disparity → spatial point cloud → ICP-based CT alignment** overlay intended to surface the patient's pre-op CT anatomy in the surgeon's **custom in-house 4K low-latency robotic-camera-driven digital loupes** during the procedure. Target use case: **root canal surgery, where overall failure rates are ~14% and the first molar exceeds 50%** — a live AR overlay of the canal anatomy materially shifts the surgeon's information envelope.
- Worked alongside one other ML engineer (2-person ML team). Left the company before the alignment system was fully operational; ownership covered the scraping corpus, the Blender synthesis pipeline, the disparity training setup, and the design of the alignment system.

## Detail

Mantis Dental was building an AR-assisted oral-surgery system — affiliated with Mantis Health, where I worked 2018–2022 on the original stereoscopic surgical-camera arm. Brief contract engagement between Tesla (Sep 2023) and Formulatrix (Oct 2024); 2-person ML team.

:::callout
**Root canal failure rates: ~14% overall, >50% on first molars.** Live CT-overlay would materially shift the surgeon's information envelope mid-procedure.
:::

The pipeline: scrape ground-truth 3D arch meshes → render synthetic stereo pairs in Blender Cycles → train RAFT-Stereo for disparity → lift to point cloud → ICP-register against the patient's pre-op CT → re-project the canal anatomy into the surgeon's custom in-house **4K low-latency digital loupes** in real time. I owned stages 1 and 2 and designed stage 3.

:::stats
- 42,000 arches · scraped from chronically unreliable upstream
- >1,000,000 stereo pairs · path-traced photorealism
- GD&T-grounded · domain randomization sized to manufacturing tolerance envelope
:::

### 1. Dental-arch scraper (42K arches)

The upstream third-party dentist database had no documented session contract — forced re-auth mid-interaction, intermittent partial responses, no rate-limit guarantees. I treated it as adversarial: a **Selenium-driven** scraper with per-arch structural validation (integrity, completeness, tooth count), checkpoint-and-resume keyed per-arch, and transparent re-auth recovery so the consumer saw a steady stream. Result: **42,000 validated meshes** from an upstream that was effectively unusable without this resilience layer.

### 2. Blender Cycles stereoscopic-render pipeline (>1M training pairs)

Headless `bpy` pipeline path-tracing photorealistic stereo pairs of each arch along a semi-random camera trajectory. The key choice was **GD&T-grounded domain randomization**: rather than arbitrary noise, the perturbations on stereo baseline, camera-to-arch pose, and inter-camera deviation were sampled from distributions matching the loupe hardware's actual **manufacturing-tolerance envelope** — so the model trained over the same variation distribution it would face at inference. Per-pixel ground-truth disparity fell out of the rendering math for free. Output: **>1M training pairs** feeding **RAFT-Stereo** (PyTorch), then-SOTA and a clean fit for this synthetic supervision.

### 3. Point-cloud reconstruction + ICP CT alignment (designed, not shipped)

Designed the inference path: loupe stereo capture → RAFT-Stereo disparity → per-pixel depth → point cloud in the loupe's camera frame → **ICP** registration against a CT-extracted dental surface → re-project the registered anatomy into the 4K display in real time. I left before this stage was operational. Shipped: the scraping corpus, the synthesis pipeline, the RAFT-Stereo training setup, and the alignment-stage design.
