---
id: unify
title: Unify — Building a Responsive Local Voice Agent
role: Personal Engineering and Research
url: null
start: 2026
end: Oct 2026
priority: 0.1
tags: [voice-agent, llm, shared-prefill, speculative-decoding, elastic-kv, quantization, bonsai, audio, systems]
---

# Unify — Building a Responsive Local Voice Agent

## Bullets

- Built a local-first conversational assistant around **Bonsai, shared-prefill agent roles, early planning, and interruptible speech**, treating response time as a whole-pipeline problem.
- Developed **elastic quantized KV caching, shared recurrent rollback state, and workload-dependent speculative decoding** to make several agent roles practical within a constrained GPU memory budget.
- Designed and compared **sentence-aware audio stitching** strategies, then refined the first-clause policy to balance early speech against natural phrasing.
- In a four-repeat replay pilot, reduced mean response latency from **6.66 to 3.66 seconds** at the same 800 ms quiet gate, measured from scheduled speech end to first software PCM.

## Detail

A voice assistant can generate tokens quickly and still feel slow. It can also answer quickly and feel unpleasant: clipped phrases, awkward joins, talking over an interruption, or describing an action that never happened. **Unify treats those problems as one engineering system.**

I built a local-first runtime that connects speech recognition, planning, thinking, tools, a speaking model, and text-to-speech on a single consumer GPU. The central problem is reuse: reuse work before an utterance ends, computed context between roles, scarce GPU state between speculative steps, and coherent text units as speech starts.

My earlier [Openclaw and Discord Voice platform](/project/ai-assistant) provides the background. This case study goes deeper into the native runtime, inference, and audio engineering.

### Measured replay comparison

![Four replay repetitions per configuration, with means of 6.66 and 3.66 seconds. Same 800 ms quiet gate; scheduled speech end to first software PCM.](/media/case-studies/unify/replay-latency.svg)

The October 20 pilot reduced mean response latency from **6.66 to 3.66 seconds** over four repetitions per configuration. The optimized path combines early planning, tool preparation, context reuse, and speculative decoding. The comparison measures their combined effect; it does not isolate speculation.

| Comparison control | What stayed fixed |
|---|---|
| Endpoint setting | 800 ms quiet gate in both configurations |
| Inference and speech | Same target model, GPU, and CPU speech stack |
| Input | Same replay recording; four repeats per configuration |
| Measurement boundary | Scheduled speech end → first software PCM sample |
| Scope | A replay pilot, not acoustic speaker latency or a broad workload benchmark |

A separate baseline used a 1500 ms quiet gate. I exclude it here so a shorter endpoint policy does not receive credit as an inference optimization. A quiet gate is also not the entire endpoint delay: transcription and permission decisions can still hold the response after silence begins.

### Latency is a pipeline problem

The naive path waits for silence, finishes transcription, decides what to do, retrieves evidence, generates an answer, synthesizes it, then plays it. I moved safe work earlier and preserved computed state across the transitions.

| While the user speaks | At the final utterance | While the assistant replies |
|---|---|---|
| Interim ASR updates the plan | Reconcile the final transcript with the early plan | Synthesize a coherent opening unit |
| Read-only tools can prepare evidence | Keep valid evidence; invalidate stale decisions | Group later sentences while audio plays |
| Planner appends only new context when valid | Enforce permission and endpoint gates | Stop queued and prefetched audio on interruption |

Early work must remain provisional. A partial request can justify a useful read without justifying a write, or finish in a way that makes the original plan wrong.

### Bonsai role mode and shared prefill

![One shared conversation trunk branches into planner, thinker, and speaker directives, then commits valid state or discards stale branches.](/media/case-studies/unify/shared-prefill.svg)

The local Bonsai path uses **one target-model weight set and a reusable computed trunk**. Planner, thinker, and speaker are logical roles. The common material—conversation, utterance, and evidence—comes before each role's directive. Moving the role selector to the suffix is essential: different personas at the beginning of a prompt would destroy the identical prefix needed for reuse.

The native sequence machinery shares common prefix cells while keeping branch state distinct. A useful speaking branch can be promoted; a discarded plan is dropped. In the paired local classifier/speaker path, speaking can continue from the classifier's sequence with only the new tail when the exact prefix contract matches. This local role is separate from the optional hosted Jev risk classifier below.

| Context event | Runtime response | Correctness reason |
|---|---|---|
| Transcript appends words | Extend the open planner lane with the delta | Avoid trunk copies and repeated suffix prefill |
| Earlier transcript words change | Drop or rebuild the affected branch | An append cannot repair an incompatible history |
| Planner patch is malformed | Reject it rather than execute it | A fast update still needs validated semantics |
| Final utterance changes the decision | Replan while retaining valid tool evidence | An interim “wait” or clarification is provisional |
| Exact continuation prefix does not match | Use an explicit cold path | Similar text is not interchangeable recurrent state |

This is the difference between sharing prefill and sending the same words repeatedly: the saving comes from retaining computed state and tracking exactly which tokens each branch consumed.

### Speculation, batching, and verification

The target is Ternary-Bonsai-2-27B in PQ2_0 form, paired with a DFlash2 draft. The draft proposes tokens; the target verifies them and commits a matching prefix. Rejection requires rolling model state back correctly, not merely trimming an output string.

| Workload | Observed policy choice | What the experiment taught me |
|---|---|---|
| One active generating role | Short fixed draft | Draft work can accelerate otherwise serial target steps |
| Several active roles | Batch target steps without drafting | In the recorded three-role sweep, aggregate throughput beat the speculative alternative |
| Acceptance-aware draft length at 32k context | Retain the fixed short draft | The adaptive policy did not beat it in that experiment |

Proposed tokens are not free. Draft computation, target verification, accepted length, and existing batch utilization all change the tradeoff. The result is a workload-dependent policy rather than a blanket claim that speculation wins.

### The recurrent-state memory surprise

![Device peak in the same 32k-context solo k=3 sweep: 15.38 GB for the old layout and 13.19 GB with the shared rollback pool. Decimal GB.](/media/case-studies/unify/rollback-memory.svg)

Bonsai is a hybrid model. Full-attention KV is only part of its state; recurrent layers also need live and rollback state. The old layout reserved a rollback window independently for every sequence even though only one sequence drafted at a time. I replaced that redundant reservation with **a shared rollback pool lent to the active drafting sequence**, keeping role live states separate.

The selected matched sweep cells measured **15.38 → 13.19 GB device peak** at 32k context. This is a memory-layout comparison, independent of the voice replay above. Intended output tokens matched in the checked cells. The gain also introduced a lifecycle obligation: settle pending rollback before handing the pool to another sequence. An ordinary generation pass does not prove that difficult handoff was exercised.

![Shared recurrent rollback state and elastic attention KV address different allocations; growth must account for transient old-plus-new memory.](/media/case-studies/unify/memory-lifecycle.svg)

### Quantization is several decisions

Calling the whole runtime “quantized” hides which representation changes memory, accuracy, and kernel behavior.

| Object | Representation or experiment | Engineering implication |
|---|---|---|
| Target weights | PQ2_0 | Fit the large target model into the local budget |
| Draft weights | Q8_0 | Draft storage and compute are separate from target weights |
| Attention KV | F16, Q8_0, Q4_0 comparisons | Check retrieval and predictive behavior across context depths |
| Recurrent live / rollback state | Separate allocation and pool policy | Attention-cache savings do not remove recurrent reservations |
| Mixed K/V formats | Encountered a slower kernel path | Smaller tensors do not guarantee faster serving |

The attention-cache study used a fixed token stream, teacher-forced comparisons, and inserted retrieval checks. Its preselected gates covered perplexity change, top-token agreement, and matching needle retrieval. Q4_0 passed the selected longer-fill gates but narrowly missed one short-context agreement threshold. That supports a bounded configuration choice, not a claim that four-bit KV preserves every aspect of quality.

### Elastic KV and allocation transients

Elastic KV commits a smaller context tier and grows as the conversation expands. A final allocation can fit while the transition fails: copying may temporarily require **old cache + new cache + reserve**. The policy must account for the retained working set and device and host headroom before choosing a migration path.

| Path or issue | Design response | Evidence boundary |
|---|---|---|
| Direct / Grouped / Staged copy | Select a path using transient memory estimates | Individual paths and guards require their own exercise |
| GPU memory accounting | Compare switch-local accounting with allocator observations | Early runs failed tracking gates; idle allocator steps complicated settled residuals |
| Virtual-memory backing | Explore in-place growth with fresh virtual addresses | Separate candidate; device-specific mapping behavior needs qualification |
| Draft sliding-window cache | Add multi-owner cell reuse | A smaller buffer alone failed when shared-prefix ownership blocked recycling |

The retained handoff records the progression rather than a clean success story: an initial memory-tracking failure, subsequent accounting refinements, a Q4 settle mismatch needing classification, and a draft-window failure followed by a passing reuse fix. Those are reasons to retain configuration-specific gates. The diagram describes the mechanism; it is not a claim that every backing and long-context path is production-qualified.

### Audio stitching is part of the model experience

![Streamed text becomes coherent synthesis units, prepared clips, and heard history; an independent interruption path cuts playback and queued audio.](/media/case-studies/unify/speech-lifecycle.svg)

A tiny text fragment can arrive quickly but receive the wrong intonation because TTS cannot see the phrase that follows. Crossfading independently phrased clips cannot necessarily repair that. I put chunking and joining in a shared module used by the live path and offline listening comparison, so the audition evaluated the actual policy.

| Listening comparison | Review outcome | Consequence |
|---|---|---|
| Early short-chunk baseline | Rejected | Earlier output alone was not enough |
| Crossfade treatment | Rejected | Smoother edges did not fix the listening result |
| Complete sentences | Acceptable | Preserve phrase-level context |
| Two-sentence groups | Acceptable; initial fastest acceptable choice | Initial selected profile |
| Whole reply | Acceptable | Useful quality reference with later start |
| Later `first_clause` refinement | Implementation refinement after that comparison | Do not present it as the winner of the earlier listening test |

The later first-clause policy looks for a real clause or sentence boundary before emitting the opening unit, then groups subsequent sentences. It protects abbreviations, numbers, URLs, code-like text, and open brackets from false boundaries, and bounds run-on text when punctuation never arrives. Joining respects the preceding unit: a sentence can receive a full pause, a clause a shorter pause, and a mid-sentence cut should not acquire an artificial full stop.

### Interruption and what the assistant remembers

Barge-in must stop queued and prefetched audio, not just flag the generation loop. An audio-side watcher can cut playback independently of a slower planner or hosted request. The history then needs to reflect what the user actually heard.

| Event | Audio behavior | Conversation behavior |
|---|---|---|
| Reply completes | Finish the queued units | Commit the completed reply |
| User interrupts partway through | Cut playback and discard queued / held audio | Distinguish heard text from the full generated reply |
| User continues speaking across phases | Carry speaking state into listening and planning | Avoid answering a stale segment or talking over the continuing utterance |

If the model generated three sentences but the user heard one, recording all three as delivered gives the next turn a false premise. Correct history is part of interruption handling.

### Context compaction without a retry loop

Long conversations accumulate tool detail. Summarizing it can itself allocate enough context to fail, so the repair starts before asking a model for a summary.

| Order | Operation | Purpose |
|---|---|---|
| 1 | Cap incoming evidence | Bound growth at the source |
| 2 | Replace older tool detail with deterministic stubs | Recover space without another model call |
| 3 | Preflight the rebuilt context alongside existing state | Avoid starting an impossible rebuild |
| 4 | Summarize only when useful and feasible | Spend inference on a viable compaction |
| 5 | Back off failed or ineffective attempts | Avoid repeating the same delay every turn |

Idle compaction is interruptible. Restoration can fall back to evidence stubs or dropping old turns instead of retrying the same impossible allocation. These choices matter after a long conversation, when a first-turn demo no longer represents the working state.

### Jev classification, tools, and backend placement

The optional **hosted TypeSafe Jev classifier** evaluates host-level tool requests. It is distinct from the local Bonsai role-switching path and may make a local decision stricter without relaxing a local deny or confirmation requirement.

| Layer | Responsibility |
|---|---|
| Early planner | Prepare a provisional plan and permitted read-only evidence |
| Local execution policy and broker | Apply tool permissions and workspace boundaries |
| Optional hosted Jev | Escalate risk classification; never weaken local restrictions |
| Confirmation | Bind consequential action to the exact readback |
| Off-host data policy | Control what context can leave the local runtime |

Planner, thinker, speaker, classifier, ASR, and TTS can use different backends. The recorded placement matrix showed why this is empirical: hosted roles worked, but separate hosted planner and speaker first-token delays slowed the voice path; a background thinker had a different cost profile. GPU speech also did not automatically beat the measured CPU path on this machine.

### What I would verify next

| Runtime area | Current evidence | Next verification |
|---|---|---|
| Shared conversation trunk | Measured runtime foundation | Broader conversational workload coverage |
| Persistent per-role native trunks | Later code and CPU-tested contracts | Build and GPU gates before performance claims |
| Candidate elastic memory backings | Configuration-specific acceptance and failure history | Longer soaks and unexercised transition paths |
| Notes and compaction changes | Implementation with remaining live checks | Live interruption and restoration scenarios |
| Remote adapters and meeting integration | Partial endpoint qualification and accepted interfaces | End-to-end service behavior |

The persistent-trunk extension would separate the speaker's conversational history from planner and thinker detail while retaining one native runtime. It is a next step, not a measured replacement for the shared-trunk results above. The self-tuner can propose configurations, but their acceptance still depends on the workload the assistant will serve.
