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

A voice assistant can generate tokens quickly and still feel slow. It can also answer quickly and feel unpleasant: clipped phrases, awkward joins, talking over an interruption, or confidently describing an action that never happened. **Unify is my attempt to solve those problems as one engineering system.**

The local runtime combines speech recognition, planning, thinking, tool use, a speaking model, and text-to-speech. My central constraint was making that loop useful on a single consumer GPU rather than giving every role its own large model. The interesting work sits at the boundaries: how roles share prefill, how speculative state is rolled back, how context grows without an allocation failure, and how generated text becomes speech someone wants to listen to.

This case study covers the measured October 2026 runtime and distinguishes it from later implementation work awaiting live verification. My earlier [Openclaw and Discord Voice platform](/project/ai-assistant) provides the background; this is the deeper native-runtime and inference work.

### Latency is a pipeline problem

The naive path is serial: wait for silence, finish transcription, decide what to do, retrieve evidence, generate an answer, synthesize it, then play it. Even a small cost at each stage becomes a noticeable pause.

I split the problem into two questions. **What can safely happen before the user finishes?** And **what state can be reused when the next stage begins?** The first leads to interim-ASR planning and early read-only tools. The second leads to shared-prefill roles, continuation rather than repeated prompting, and a speech pipeline that works on coherent units before the whole reply exists.

An endpoint decision is still necessary. A short pause may mean the user is thinking rather than finished. Shortening that gate can improve a headline latency figure while making conversation worse, so I keep its setting explicit in comparisons.

### Bonsai role mode and shared prefill

The fast local Bonsai role-switching path uses **one set of target-model weights and a reusable context trunk**. Planner, thinker, and speaker are logical roles, not three independently loaded large models. This shared-prefill path is separate from the optional hosted Jev classifier discussed below.

The expensive shared material is placed before the role-specific suffix: conversation context, the current utterance, and relevant evidence. A role branches from that trunk and prefills only its directive and new suffix. Putting the role selector at the end matters: three prompts with different personas at the beginning do not have the same reusable prefix, however similar their later text looks.

The native sequence machinery shares the common prefix cells while keeping branch state distinct. A successful speaking branch can be promoted; a discarded plan is dropped. In the pilot's paired classifier/speaker path, the final speaking request can continue from the classifier's own sequence with only its tail added when the exact prefix contract matches. A mismatch takes an explicit cold path rather than pretending unrelated recurrent state is reusable.

That is the useful distinction between **shared prefill** and merely sending the same text several times. The saving comes from preserving computed state and maintaining a strict account of which tokens each branch has actually consumed.

### Updating a plan while speech arrives

The planner starts from an interim transcript. As recognition adds words, it updates an existing plan rather than beginning from a blank decision every time. The update can keep the plan or patch validated fields; a malformed patch does not silently become an executable action.

A native `branch_extend` path keeps the planner lane open and appends the delta at its tip. This avoids copying the trunk and re-prefilling the full suffix on each interim. A transcript revision is different from an append: if earlier words change, the runtime drops or rebuilds the relevant branch instead of treating incompatible histories as equivalent.

A partial utterance also must not become a premature final answer. A decision to wait or ask for clarification halfway through a sentence is not automatically reused after the user finishes it. Early read-only tool results can still be carried forward as evidence, even when the final plan needs to change.

The implementation therefore tracks both plan semantics and context provenance. A faster update is useful only if it is updating the right conversation.

### Speculation, batching, and the cost of verification

The local target is Ternary-Bonsai-2-27B in PQ2_0 form, paired with a DFlash2 draft. The draft proposes tokens; the target verifies them and accepts a matching prefix. Rejected proposals require correct state rollback, not just a shorter output string.

The best policy depends on how many roles are active. The measured runtime uses a short draft when one role generates, and disables drafting when several roles can already share a batched target step. In the recorded sweep, three-role batching without a draft produced more aggregate throughput than the speculative alternative. Extra proposed tokens were not free: draft computation and verification could outweigh the accepted work.

I also implemented an acceptance-aware draft-length policy. It did not beat a fixed short draft in the 32k-context experiment. That negative result matters because an adaptive controller can look sophisticated while optimizing a cost model calibrated in the wrong regime.

The practical result is a conditional policy, not an assertion that speculative decoding always wins.

### The recurrent-state memory surprise

Bonsai is a hybrid model: full-attention KV is only part of its state. Recurrent layers require their own live and rollback state, and those rows can dominate the memory budget.

The original layout reserved a rollback window independently for every sequence. Yet only one sequence drafted at a time. I changed that into a **shared rollback pool** lent to the active drafting sequence, while retaining separate live state for the roles.

At 32k context, the retained sweep measured device peaks of about **15.38 GB with the old layout and 13.19 GB with the shared pool**. That is a memory-layout comparison in the same benchmark, not a voice-latency result. The intended output tokens matched in the checked cells.

This was a more consequential optimization than shaving a small amount from attention: the large redundant allocation was elsewhere. It also created new correctness obligations around lending, settling, and handing off the rollback window. Passing an ordinary generation test does not prove a pending-rollback handoff was exercised.

### Quantization is several different decisions

The target weights, draft weights, attention KV, and recurrent state are different objects. Calling the system “quantized” hides the decisions that actually determine memory use and quality.

The runtime combines PQ2_0 target weights, a Q8_0 draft, and selectable KV formats. The attention-cache study compared F16, Q8_0, and Q4_0 using a fixed token stream, teacher-forced comparisons, and inserted retrieval checks across context depths. The acceptance criteria were chosen before looking at the results: bounded perplexity change, sufficient top-token agreement, and matching needle retrieval.

Q4_0 passed the selected comparison gates at the tested longer fills, but narrowly missed one short-context agreement threshold. That is more informative than declaring 4-bit KV “the same quality.” It explains why the result is useful while preserving the scope of the check.

A mixed K/V format was also unattractive when it fell onto a slower kernel path. Smaller stored tensors do not automatically mean a faster serving implementation; the dispatch path still decides what work the hardware performs.

### Elastic KV and allocation transients

Allocating the maximum context up front wastes headroom before a conversation needs it. Elastic KV starts with a smaller committed tier and grows at idle points as the working context expands.

Growth has a catch: copying into a larger allocation can require **old cache + new cache + reserve** at the same time. A final allocation may fit while the transition does not. The policy therefore considers transient device memory, the retained working set, and available host memory, rather than checking only the desired final cache size.

The implementation explores Direct, Grouped, and Staged copy paths. A virtual-memory-backed alternative can reduce the need for a full old-plus-new copy, but introduced a device-specific mapping problem on the AMD stack. Fresh virtual addresses were a measured workaround; that path remained a separate candidate rather than silently replacing the conservative copy-backed default.

Likewise, the draft model's sliding-window cache needed its own treatment. Shrinking an allocation to the window size was insufficient when shared-prefix ownership prevented cells from being reused. The subsequent multi-owner reuse fix addressed the actual lifetime problem. **A smaller buffer is not a complete optimization if the allocator cannot recycle its contents correctly.**

### Audio stitching is part of the model experience

A stream of text tokens is not yet a natural stream of speech. Very early chunks reduce waiting, but a tiny fragment can receive the wrong intonation because the synthesizer cannot see the phrase that follows it. Crossfading two independently phrased clips cannot necessarily repair that.

I built the chunking and joining policy as a shared module used by both the live pipeline and the offline listening comparison. The listening test therefore evaluated the same policy the user would hear, rather than a separate hand-edited demo.

The comparison included an early short-chunk baseline, complete-sentence chunks, two-sentence grouping, whole-reply synthesis, and crossfaded joins. In my listening review, complete-sentence, two-sentence, and whole-reply versions were acceptable; the early baseline and crossfade treatment were not. The initial choice was the fastest acceptable profile, two-sentence grouping.

The later `first_clause` refinement makes the opening unit end at a real clause or sentence boundary, then groups subsequent sentences. It handles abbreviations, numbers, URLs, code-like tokens, and open brackets so punctuation inside those structures is not mistaken for a clean place to speak. A bounded fallback handles run-on output with no useful punctuation.

Joining is also contextual: sentence ends receive a pause, clause boundaries a shorter pause, and a mid-sentence cut should not acquire a fake full stop. The objective is not the fewest milliseconds in isolation. It is an early, coherent phrase followed by speech that does not sound assembled from unrelated clips.

### Interruption and what the assistant remembers

Barge-in has to stop queued and prefetched audio, not merely set a flag in the language-model loop. The real-time path therefore lets the audio-side watcher cut playback independently of a slower planning or hosted-model request.

An interruption changes the conversation state too. If the model generated three sentences but the user heard only one, recording all three as delivered would give the assistant a false view of the conversation. Unify distinguishes a completed reply from the portion actually heard and commits the appropriate history.

Live tests also exposed a subtler failure: consuming a speech-start event without carrying the “user is still speaking” state into the next phase could make the assistant answer a stale segment or talk over a continuing utterance. Fixing that required consistent audio state across planning, listening, and playback—not another adjustment to the token generator.

### Context compaction without a retry loop

A long conversation cannot retain every tool dump forever. But a compaction algorithm can make things worse if it asks for an expensive summary before checking whether the rebuilt context can coexist with the old one.

The repair has an order: cap incoming evidence, deterministically replace old tool detail with short stubs, preflight the shape of a possible rebuild, and ask for a model summary only when it can fit and is worth doing. Failed or ineffective attempts receive backoff instead of running again before every turn.

Idle compaction can be interrupted. Restoration can degrade gracefully by stubbing older evidence or dropping old turns, rather than repeatedly attempting the same impossible allocation. These are ordinary systems techniques, but they matter directly to whether a voice assistant feels responsive after half an hour rather than only in its first demo turn.

### Jev classification, tools, and backend placement

The **optional hosted Jev classifier** is distinct from the local shared-prefill Bonsai execution path. It evaluates host-level tool requests and is configured as an escalation layer: it may make a local decision stricter, but does not relax a local deny or confirmation requirement.

Consequential actions require confirmation tied to the exact readback. Early planning does not grant permission to execute writes while the user is still speaking. Workspace sandboxing, the tool broker, and off-host data policy remain separate from the model's explanation of what it wants to do.

Planner, thinker, speaker, classifier, ASR, and TTS can be bound to different backends. Placement is an empirical decision. Hosted LLM roles worked in the recorded matrix, but putting the planner and speaker behind separate hosted first-token delays made the voice path slower. Hosting a background thinker had a different cost profile. GPU speech was also not automatically better than the measured CPU speech path on this machine.

### Measured replay comparison

The October 20 replay pilot compared a serial baseline with a combined optimized pipeline over four repeats per configuration.

:::callout
**6.66 s to 3.66 s mean response latency.** Same model, GPU, recording, CPU speech stack, and 800 ms quiet gate. The boundary is scheduled speech end to the first software PCM sample.
:::

The optimized path overlaps early planning and tool preparation and uses speculative decoding. This is a combined pipeline comparison, so it does not isolate speculation's contribution. It measures software audio output rather than a microphone recording of sound from a speaker.

A separate baseline used a longer 1500 ms quiet gate. I exclude it from the comparison above so a shorter endpoint policy does not receive credit as an inference optimization. Likewise, later tuner and long-context runs use different configurations and should not be combined into a single synthetic headline.

### What I would verify next

The measured shared-trunk runtime is the foundation. Later per-role persistent-context work explores separating the speaker's conversational history from planner and thinker detail while still using one native runtime. The retained native-trunk plan explicitly marks that extension as code and CPU-tested contracts awaiting its build and GPU gates; it is not a measured replacement for the shared-trunk results above.

The remaining work includes real endpoint qualification for some remote adapters, live verification of notes and compaction changes, longer soaks of candidate memory backings, and meeting integration beyond the accepted interface contract. The self-tuner helps choose configurations, but its presets still need to be judged against the workload the assistant will actually serve.
