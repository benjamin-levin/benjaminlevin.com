---
id: mlx-fast
title: MLX Research — 25 Optimization Techniques, 12 Useful Paths
role: Personal Inference Research
url: https://github.com/benjamin-levin/mlx-fast
start: May 2026
end: Oct 2026
priority: 0.3
tags: [mlx, apple-silicon, inference, metal, quantization, kv-cache, moe, speculative-decoding, benchmarking]
---

# MLX Research — 25 Optimization Techniques, 12 Useful Paths

## Bullets

- Investigated **25 optimization techniques**, with **12 useful paths** in the original study, across attention kernels, MoE execution, KV and recurrent state, speculative decoding, caching, and serving policy.
- Built and evaluated a compiled quantized-attention primitive, physical cache compression, exact recurrent rollback, prefix reuse, and workload-aware serving integrations on an **Apple M4 Max with 36 GB unified memory**.
- Kept negative results and later remeasurements visible: several plausible fusions were redundant or slower, and some apparent standalone wins tightened to noise on a clean baseline.

## Detail

My MLX work began with a concrete workload: serve a hybrid mixture-of-experts language model on an **M4 Max with 36 GB of unified memory**, including long contexts and several agent requests arriving at different times. The interesting question was not whether an optimization sounded plausible. It was whether it removed work that the real serving loop was still doing.

The original study investigated **25 techniques, with 12 useful paths**. Those are an experiment inventory, not twelve independent speedups that can be multiplied together. Later drafts split and extended the variants, and isolated remeasurements changed several early claims. This account keeps that history visible: a technique may help only at long context, only with repeated prefixes, or chiefly as a correctness repair.

The work spans the public [mlx-fast package](https://github.com/benjamin-levin/mlx-fast), MLX kernel changes, and serving integrations. It is broader than the original SnapKV-only summary, and it belongs to the Apple-Silicon study; its ratios should not be transplanted to the AMD Bonsai runtime in [Unify](/project/unify).

### Read the evidence at three scales

![Historical combined-stack decode throughput at 32k, 96k and 128k context. Vanilla: 75.66, 52.60 and 43.22 tokens/s; stack: 96.24, 113.32 and 114.78 tokens/s.](/media/case-studies/mlx/historical-stack.png)

*Historical combined-stack observations from the archived study, §5.1. One request; Qwen3.6-35B-A3B-4bit on M4 Max, 36 GB. These are reported measurements, not a new independent reproduction. The stack changes several mechanisms together, including lossy cache selection.*

| Evidence scale | Question it answers | What it cannot establish |
| --- | --- | --- |
| Isolated kernel | Does this implementation reduce work for this tensor shape? | Whole-request latency or quality |
| Clean serving ablation | Does one change help the existing serving loop? | Combined-stack gain or every arrival pattern |
| Combined stack | Does this particular configuration improve the complete workload? | Independent credit for each component |

**A note on the count.** “25 techniques, 12 useful paths” is the original study framing retained here. The surviving paper is a changing research document: its abstract later says 28 attempted / 13 shipped, while an older contribution still says 25 strategies and another says 12 dead ends. I cannot reconcile those into a single independently verified count. The twelve rows below are an editorial map of useful families, including correctness repairs and narrow integrations—not twelve universal speed wins. The negative-result table groups thirteen approaches; it is not a claim that all surviving draft variants partition cleanly into 25.

### Start with the bottleneck, then the intervention

The target was Qwen3.6-35B-A3B-4bit: a hybrid full-attention/recurrent model with routed experts. “Fits in memory” was only the entry condition. During decoding, weights, attention caches, and recurrent state still had to move through the memory system for every generated token.

I separated **prefill**—processing the prompt—from **decode**—generating subsequent tokens. A technique that accelerates one can leave the other unchanged or make it worse. I also separated an isolated kernel measurement from a complete request through the serving loop, where lazy evaluation, batching, and CPU/GPU overlap already eliminate some apparent overhead.

Experiments used named context and batch configurations, warm-up, serialized access to the GPU, and correctness checks appropriate to the intervention. Exact speculative decoding should preserve the greedy token stream; reduced precision and lossy cache selection need quality measurements rather than a demand that every floating-point value remain identical.

### The twelve useful paths

The table is a map to the work, including the qualifications that decide whether an approach is worth using. “Useful” does not imply a robust standalone speed gain on every clean baseline.

| Approach | What it changes | Where the result applies |
| --- | --- | --- |
| Compiled quantized SDPA | Dequantize K/V inside a fused attention kernel | Long-context decode; distinct from the slower Python prototype |
| Routed-expert gate/up fusion | Combine compatible expert projections | A modest measured contribution, not a replacement for the gather kernel |
| Whole-MoE compile block | Compile a larger block around stock operations | Correct integration; later isolated gain was small enough to be within noise |
| Physical SnapKV trimming | Remove selected cache positions from the actual tensors | Long context, with narrow retrieval checks |
| BF16 recurrent state | Reduce recurrent-state traffic | Kernel benefit; small or negligible end-to-end effect in some reruns |
| Persistent prompt cache | Reuse computed prefix state across requests/restarts | Repeated-prefix workloads, not fresh prompts |
| Depth-one MTP | Verify a cheap one-token proposal | Single-request workloads with sufficient acceptance |
| Exact-state PLD | Repair recurrent rollback for prompt-lookup drafts | Enables correct comparison; speed remains workload-dependent |
| Speculation routing | Choose a candidate path or fall back | Probe cost and available backends determine whether it helps |
| Prefer-prefill scheduling | Change interleaving of arriving requests | Staggered arrivals; a throughput/streaming-latency tradeoff |
| Baked kernel constants | Remove repeated runtime argument work | Small dispatch improvement, below a headline end-to-end gain |
| Multi-shot prefix reuse | Prefill one prompt once for several completions | Repeated-prompt sampling with independent completion state |

### Quantized attention: why fewer bytes initially lost

The first KV-quantization experiment did what the memory accounting predicted: it stored fewer cache bytes. But at longer contexts, the default quantized attention path decoded more slowly than the BF16 fused-attention baseline.

The reason was the computation replacing it. Two quantized matrix multiplications with a separate softmax materialized the score matrix. The BF16 reference used a fused attention path that avoided that intermediate. Reduced K/V traffic was competing with extra score traffic and a less favorable execution structure.

That failure motivated a compiled-in `fused_qsdpa` primitive: dequantize tiles cooperatively, reuse them across grouped query heads, and perform online softmax without materializing the full score matrix. This required a different implementation surface from the user-space Metal prototype.

The distinction matters because **the original Python `metal_kernel` prototype was slower**, as the public README records. It should not receive credit for the later compiled primitive's measurements. The archived in-PR remeasurement reported roughly 1.10–1.30× for the compiled decode-shape microbenchmark in its tested regime; that is a kernel result, not a universal application speedup.

![Mechanism diagram contrasting separate quantized matmuls and a materialized score matrix with tile dequantization and online softmax inside compiled attention.](/media/case-studies/mlx/attention-mechanism.svg)

| Attention path | What happens to K/V | Intermediate work | Observed interpretation |
| --- | --- | --- | --- |
| BF16 fused SDPA | Read full-precision cache tiles | Online softmax; no full score matrix | Optimized reference |
| Default quantized attention | Read fewer stored bytes, then quantized matmuls | Separate softmax and materialized scores | Can lose despite smaller cache |
| Python Metal prototype | User-space custom implementation | Constrained execution geometry | Slower; no credit for compiled-kernel wins |
| Compiled `fused_qsdpa` | Dequantize tiles inside attention; share across query heads | Online softmax inside the fused primitive | Corrected microbenchmark range: 1.10–1.30× |

The design removes an intermediate representation rather than merely compressing its input. A tile is unpacked where it is consumed, reused across grouped query heads, then discarded. This is why the implementation surface matters: an algorithm name alone does not describe the memory traffic.

### Real batches do not all have the same prompt length

A same-prompt benchmark is convenient, but agents often arrive with different document lengths. Left-padded caches and heterogeneous batches exercise paths that a homogeneous benchmark misses.

The fused attention work needed a left-padding-aware extension so each request used the correct effective cache. An archived remeasurement reported about a 22% decode improvement in its heterogeneous three-request, 32k-context comparison. That is useful evidence for a particular serving shape, not a reason to attach the same percentage to unrelated requests.

This changed how I designed the harness. A mechanism can look complete in a canonical benchmark and still miss the workload that motivated it. The benchmark matrix therefore needs to reflect prompt diversity and arrival pattern as well as context size.

### SnapKV: selection has to remove real traffic

At long context, attention repeatedly rereads historical K/V. I compared strategies that logically select positions with a path that physically trims the cache.

The useful distinction is whether selection itself still scans the full K tensor. A method can call itself sparse while paying much of the original bandwidth cost to choose its subset. Physical SnapKV trimming instead retains sink tokens, content-selected middle positions, and a recent window in a smaller actual cache.

The public package reports **60.8 to 80.2 decode tokens/s at roughly 95k context** on the named M4 Max/model setup, with all three inserted retrieval needles recovered in that small test. The faster sliding-window alternative recovered only one of three. That is why I evaluated speed and retrieval together.

![At roughly 95k context, baseline decoded at 60.8 tokens/s with three of three needles; physical SnapKV at 80.2 with three of three; sliding window at 102.2 with one of three.](/media/case-studies/mlx/snapkv-quality.png)

*Public README measurements on the named M4 Max/model setup. The chart reports the observed retrieval count rather than turning three trials into a general quality percentage.*

| Cache region | Why keep it | What changes physically |
| --- | --- | --- |
| Sink positions | Preserve initial attention anchors | Retained at the front |
| Selected middle | Preserve content judged important | Gathered into a smaller tensor |
| Recent window | Keep immediate conversation context | Slides as decoding advances |
| Unselected history | Avoid rereading low-priority positions | Removed from the working cache |

Three inserted needles do not establish general long-context answer quality. Nor does a faster decode loop remove the original prompt's prefill cost. The benefit starts after the work needed to construct and compress the cache.

### MoE fusion and the optimization the runtime already did

Routed experts made an appealing target: many projections, quantized gathers, and repeated activations. Gate/up concatenation and a whole-block compile wrapper could compose with the existing optimized gather path.

Replacing the gather itself was less promising than expected. The stock operation already dispatched a combined kernel for the selected experts, so an early “many launches become one” justification was wrong. Expert deduplication also introduced CPU-side preparation that could outweigh the small amount of duplicate work removed.

The later measurements are an important correction. Whole-block compilation's isolated gain in vanilla serving tightened to around 0–1%, and a retained clean rerun was essentially flat at a 32k single-request decode shape. That does not invalidate the integration; it means I no longer describe an earlier gain measured with the rest of the optimized stack enabled as a standalone result.

![Clean one-request MoE compilation rerun: off/on rates of 143.96/142.34 tokens/s at 1,980 prompt tokens and 110.73/110.90 at 32,692 prompt tokens.](/media/case-studies/mlx/moe-clean-rerun.png)

*Retained targeted rerun, May 19. These are individual observations, without a retained uncertainty interval. They support “essentially flat,” not a statistically established speedup or slowdown. The three-request cells in that file include prefill in aggregate throughput and are deliberately excluded from this decode-only comparison.*

A separate fused SwiGLU/down-projection primitive likewise looked better in a tight microbenchmark than in the live loop. The serving loop already overlapped graph construction through asynchronous evaluation. Removing overhead that was already hidden did not buy the same wall-clock improvement.

### Recurrent state is not just another attention cache

The hybrid model carries Gated DeltaNet state alongside full-attention KV. Reducing that state to BF16 targets its traffic and footprint. The kernel-level benefit was measurable, but the end-to-end effect on a clean vanilla baseline was small—sometimes near zero, sometimes a few percent.

The other recurrent-state problem was correctness under speculation. Full-attention KV can often be truncated after a rejected draft; a recurrent update cannot be undone by decrementing a cache offset.

I investigated algebraically reversing that update. It worked on benign synthetic arithmetic and became ill-conditioned on trained gates near zero. Those gates represent learned forgetting or overwriting: dividing through them is not a stable way to recover the past. The useful repair was to snapshot, restore, and re-forward the accepted prefix.

![Rejected speculative tokens require attention-cache truncation and recurrent-state snapshot restoration followed by re-forwarding the accepted prefix.](/media/case-studies/mlx/rollback-mechanism.svg)

| Speculative state transition | Full-attention cache | Recurrent state |
| --- | --- | --- |
| Before drafting | Save accepted position | Snapshot complete state |
| Verify proposals | Append candidate K/V | Apply candidate recurrent updates |
| Reject suffix | Truncate candidate positions | Restore snapshot |
| Commit accepted prefix | Keep accepted positions | Re-forward accepted tokens from snapshot |

A cache offset describes *where* attention history ends. It does not contain the prior recurrent state. That difference is the reason “truncate both caches” can yield a fast but incorrect speculative decoder.

That exact rollback changed the interpretation of prompt-lookup decoding. Some earlier “speedups” had been measured on a token stream that no longer matched the autoregressive reference. Correctness had to be restored before timing the method again.

### Speculation: draft quality and recovery cost decide the win

Depth-one multi-token prediction uses an auxiliary head to propose the next token, then lets the main model verify it. The retained in-PR measurements tightened the original single-request range to roughly **1.13–1.21× on the tested short workloads**, with smaller gains at longer prompts.

Chaining the head to produce more draft tokens did not improve that story consistently. Later proposals consume synthetic hidden state, their acceptance falls, and partial-accept recovery costs real work. A sequential two-branch tree adds another verifier pass when the first branch fails; its extra accepted tokens did not reliably pay for that pass.

Prompt-lookup decoding has a different opportunity: reuse text already present in the prompt. It can be useful for copying or editing and unattractive for open generation. A router can probe for that opportunity and fall back, but the probe has a cost too. Later upstream-clean measurements supported a narrower, workload-dependent result than the initial three-way AR/MTP/PLD narrative.

The rule I take from this is simple: **count accepted work after paying for verification and recovery**, and compare against the exact output the baseline would have produced.

### Prefix reuse: avoid doing the same prefill twice

Two useful optimizations avoid repeated prefill at different lifetimes.

A persistent cache stores reusable computed prefix state with a content-derived identity and metadata, then integrates it with the in-memory prompt cache. It helps a long-lived application that revisits stable contexts or restarts between requests. Its large warm-prefix TTFT ratios compare reuse with recomputing an expensive prefix; they do not mean a new prompt became thousands of times faster.

The multi-shot API works within one request pattern: prefill once, replicate the appropriate cache state for several completions, and track sampling and stopping independently. It is useful for parallel candidate answers or critic sampling. Reproducible per-completion seeds and greedy-reference checks keep the optimization from collapsing independent samples into one accidental shared continuation.

These paths require the **complete hybrid state**, not only the full-attention K/V. They also have integration limits: a library-level multi-shot API is not automatically available through an HTTP server that does not implement the corresponding request parameter.

### Serving policy is an optimization with a price

Staggered arrivals revealed a scheduler asymmetry: a new request's prefill could repeatedly interfere with requests already decoding. Preferring prefill under specified conditions recovered a more useful batched decode pattern.

The tradeoff is explicit. Existing streams may pause while pending prefill completes, and late-arriving requests may wait longer for their first token. That can be appropriate for background agents and inappropriate for a human who needs smooth token delivery.

I also tested whether separate GPU streams would remove the conflict. On the measured M4 Max setup, the probes did not produce useful compute overlap. Distinct software stream handles were not evidence of independent hardware execution capacity for that workload. I closed that direction rather than build a serving policy around concurrency the measurements did not show.

### The thirteen paths that did not earn a default

The unsuccessful inventory is as useful as the wins because it identifies the assumption that failed. These are grouped approaches; later draft variants split some of them further.

| Approach | What stopped it |
| --- | --- |
| Default unfused KV quantization | Less stored KV, but extra attention intermediates and a slower path |
| Replacing the multi-expert gather kernel | The baseline already combined the work; staging/dedup overhead consumed the saving |
| User-space prefill-shape attention | It did not match the optimized prefill kernel in the tested geometry |
| Separate-stream prefill/decode pipelining | No useful compute overlap appeared in the device probes |
| MTP deeper than one proposal | Falling acceptance and recovery costs erased the extra-token upside |
| Sequential two-branch speculative trees | Another verifier pass cost more than the few extra accepted tokens |
| Manual shared-input matmul fusion | Existing lazy-runtime fusion or overlap already captured much of the opportunity |
| Fused SwiGLU/down projection | Microbenchmark benefit failed to transfer cleanly to the live loop |
| Dense shared-expert gate/up fusion | Slicing and materialization outweighed the saved dispatch |
| Algebraic GDN-state reversal | Near-zero learned gates made the inverse numerically unstable |
| Naive persistent-prefix caching | Incomplete state/key assumptions did not survive serving integration |
| The alternate llama.cpp MTP path | It did not become the working MLX depth-one integration |
| Logical sparse-cache selection | Choosing a subset still read too much of the full cache to save bandwidth |

### The correction ledger

| Intervention | Later retained evidence | What I would claim now |
| --- | --- | --- |
| Compiled attention microbenchmark | 1.10–1.30× | Tested decode shapes; not end-to-end |
| Heterogeneous attention batch | +21.9% | Three requests at 32k in that comparison |
| Whole-MoE compile | +0.4–1.1%, described as within noise | Integration works; standalone speed remains weak |
| BF16 recurrent state | +0.0–2.5% end-to-end on vanilla serving | A kernel saving can be diluted by attention |
| Depth-one MTP | 1.13–1.21× | Tested short single-request workloads |
| Prompt lookup and routing | Winners changed with workload and available backend | Include probe, verify and rollback costs |

*Source: archived paper Appendix E.17, in-PR remeasurement on May 18–19. These are later reports, not measurements rerun for this website; draft PRs are not represented as merged upstream.*

### What the complete stack—and its corrections—show

The archived full-stack study reports decode comparisons of **1.27× at 32k, 2.15× at 96k, and 2.66× at 128k** for its named single-request setup. Those are historical combined-stack measurements on the M4 Max configuration. They are not the gain from each individual technique, and they are not reductions in fresh-prompt prefill time.

Shorter, mixed serving scenarios showed much smaller improvements, which is exactly what the activation thresholds and bottleneck analysis predict. The large long-context benefit does not belong on a short voice-turn claim.

Later isolated remeasurements are part of the result, not an appendix to hide: compiled-attention gains tightened, MoE compilation approached noise, exact PLD changed the winning workloads, and BF16 recurrent state produced a smaller application effect than its kernel result suggested. Hardware, baseline stack, request shape, and correctness gate belong next to the number.

The contribution I value most is the map: which work is actually removed, which work is merely moved, and which attractive optimization was already being done somewhere else in the stack.
