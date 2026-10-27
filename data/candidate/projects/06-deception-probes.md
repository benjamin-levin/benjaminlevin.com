---
id: deception-probes
title: Deception and Refusal Probes — What Are We Actually Detecting?
role: Independent AI Safety Research
url: null
start: 2026
end: Oct 2026
priority: 0.2
tags: [ai-safety, interpretability, deception, refusal, linear-probes, qwen3, transfer, experimental-controls]
---

# Deception and Refusal Probes — What Are We Actually Detecting?

## Bullets

- Investigated **deception and refusal representations in Qwen3**, using controlled linear-probe experiments across tasks, layers, and model sizes.
- Compared cross-task deception transfer with cross-category refusal transfer: **0.602 versus 0.877 mean off-diagonal AUROC** in the retained Qwen3-8B comparison, with important corpus and label controls.
- Found prompt-framing confounds, reversed transfer, layer drift, and ensemble gains that shrank under fairer comparisons; instruction controls removed a clear self-generated-text advantage.
- Developed a follow-up refusal study that distinguishes prompt harmfulness from observed refusal behavior, and documented where the results stop supporting a general claim.

## Detail

**Strong within-task detection did not imply a stable safety signal.** I tested what linear probes on Qwen3 activations were actually measuring, then compared deception transfer with refusal-related transfer under a common measurement recipe. The key result is a contrast in generalization—not a claim that either label names a universal mechanism.

![Two six-by-six AUROC heatmaps. Deception transfer varies widely and includes inverted rankings; same-corpus refusal transfer is more consistent but includes one below-chance exception.](/media/case-studies/safety/transfer-matrices.svg)

*Rows train a probe; columns evaluate it. Outlined cells are within-task/category evaluations. Both panels share the same chance-centered 0–1 color scale. These are retained Qwen3-8B results at the fixed 65%-depth layer; different task sets and label meanings limit the comparison.*

| Measured contrast | Within-task mean | Cross-task/category mean | Cross cells below chance |
| --- | ---: | ---: | ---: |
| Deception · length controlled | 0.928 | 0.602 | 10 / 30 |
| Refusal contrast · same-corpus harmless class | 0.988 | 0.877 | 1 / 30 |
| Refusal contrast · Alpaca harmless class | 1.000 | 1.000 | 0 / 30 |

The perfect Alpaca result needed a better control: harmful and harmless classes came from different corpora. Matching both classes within BeaverTails lowered the score while preserving much of the cross-category signal. The deception matrix tells a different story: ten transfers reverse the ranking.

![A four-stage measurement diagram: define labels, fit on the source task, evaluate unchanged on a new task, and separately test causal effects. Controls cover framing, source, behavioral meaning, structural nulls, selection fairness, and token count.](/media/case-studies/safety/measurement-controls.svg)

*Stages 1–3 describe the measurement logic. Causal intervention is a separate proposed next step, not an achieved result.*

### How the probes were measured

#### The measurement: a direction is not an explanation

A linear probe fits a direction through hidden activations and uses it to rank examples. It can reveal information that is available in a representation without establishing what the model believes, whether it intends to deceive, or whether the direction causally controls behavior.

I use AUROC to summarize ranking performance. A value of 0.5 is chance-level ranking; below 0.5 means the direction orders the two classes the wrong way on that evaluation. This distinction matters for transfer: a detector can do worse than lose sensitivity. Its interpretation can reverse.

The work builds on [representation engineering](https://arxiv.org/abs/2310.01405) and [Apollo Research's strategic-deception detection work](https://arxiv.org/abs/2502.03407). My emphasis is the gap between learning a clean separation within a dataset and learning a reusable safety signal.

#### Building a transfer experiment instead of one score

For the deception study, each task supplied a training contrast and every other task became a transfer target. The diagonal asks whether a probe works on its own distribution; the off-diagonal asks whether the same learned direction means something useful elsewhere.

The comparison spans different forms of deception pressure rather than repeated variants of one prompt. I also tested layers and model sizes, separated within-task fitting from target-task evaluation, and examined controls for token count and instructions.

This structure exposes a failure that a random train/test split within one dataset can hide. A task-specific classifier may generalize to new examples of the same task while remaining a poor monitor for a different kind of behavior.

#### What each control changed

| Alternative explanation | Control or comparison | What the evidence supports |
| --- | --- | --- |
| Surrounding instructions identify the class | Hold the assistant statement constant while changing framing | Separation can reflect framing rather than an intentional falsehood |
| Different token counts drive transfer | Length-controlled deception matrix; fixed template positions for refusal | Task structure persists after controlling sampled positions |
| Corpus style identifies harmful examples | Replace Alpaca harmless examples with same-corpus BeaverTails examples | The original perfect result was over-optimistic |
| Harmfulness is equivalent to refusal | Label model continuations for observed behavior | Adds a behavioral check; remains on the Alpaca-backed dataset |
| An ensemble beats an unlucky layer | Freeze selection without target labels; compare fair single-layer rules | Gains shrink; held-out-task uncertainty spans no improvement |
| Model authorship explains detection | Hold instructions fixed across text sources | No clear self-generation advantage survives the stronger controls |

#### Prompt framing can masquerade as honesty

In the RepE contrast, honest and deceptive examples can contain **the same assistant statement surrounded by different instructions**. Strong separation appears after that surrounding context has been processed, even though the statement itself has not changed.

The consequence is narrower than “the probe detects lying.” It shows that the representation carries information about the response's framing. That can be interesting, but it is a different property from discovering that a statement is an intentional falsehood.

An embedding-layer null provided a useful pipeline check. At fixed positions with identical input tokens, the two classes must have identical embeddings; a classifier should not obtain a real separation there. This kind of structural null is valuable because its expected result follows from the construction, rather than from an intuition about how honest a model ought to be.

### Deception transfer and representation stability

#### Cross-task failure and inverted rankings

The retained Qwen3-8B, length-controlled matrix has a **0.928 mean diagonal AUROC and 0.602 mean off-diagonal AUROC**. Ten of its thirty off-diagonal cells fall below chance. The difference between those two summaries is the central deployment concern: strong validation on a familiar task did not buy reliable interpretation on another.

Some transfers reverse because the task changes what language accompanies the label. In one financial-deception setting, an honest account can discuss the problematic information more explicitly than a deceptive account. A probe sensitive to that language can rank the honest transcript as more deceptive.

This is a plausible explanation of a measured failure, not evidence that every inversion has the same cause. It illustrates why a monitor needs more than a plausible name for its activation direction.

Token count was also a confound worth testing rather than merely mentioning. Equalizing the number of probed tokens did not dissolve the task structure; it made part of it clearer. A variable that looked like a possible source of the result had partly been masking it.

![Every within-task and cross-task AUROC cell plotted individually for deception and matched refusal, with diamonds marking the four means and a dashed line at chance.](/media/case-studies/safety/transfer-distributions.svg)

*Each circle is one cell from the matrices above, not an independent experimental replication. The diamonds are arithmetic means. This plot shows heterogeneity, not uncertainty across new fits, seeds, or datasets.*

#### Layers, stability, and misleading model-size stories

A useful representation can move through the network. Comparing probe weights across layers is therefore not as simple as taking a cosine between vectors produced under different normalization schemes.

I examined directions in a common coordinate interpretation and compared their drift with split-half fitting reliability. The evidence supported changes across layers beyond fitting noise. Larger models retained more useful signal under layer transplantation in these experiments.

That is a statement about **stability**, not a demonstrated monotonic improvement in deception-detection accuracy with model size. Some early scaling interpretations were too broad, and I keep that distinction explicit. A more stable direction is not automatically a more accurate or more transferable detector.

### Ensembles, self-generated text, and sincere errors

#### When an ensemble win depends on its baseline

Combining layers sometimes improved performance, especially when the comparison used a poorly oriented single layer. But choosing the baseline is part of the experiment, not a neutral bookkeeping step.

A source task that saturates across many layers can make an argmax layer choice effectively arbitrary. One tied layer may transfer badly while another tied layer transfers well. Comparing an ensemble with the unlucky member tells a different story from comparing it with a fair single-layer rule.

I therefore distinguished target-informed comparisons from a frozen ensemble that receives no labels from the target task. The attractive gains shrank under those controls. The leave-one-task-out result had uncertainty spanning no improvement. The useful finding is conditional benefit, not an ensemble that solves transfer in general.

#### Self-generated text, sincere errors, and failed predictions

Another experiment asked whether a model's own text is easier to probe than text generated by another model. The initial result was striking, but different instructions were entangled with who generated the text.

Holding the instruction fixed removed much of that apparent advantage. Behavioral checks also showed why “asked to lie” is not a sufficient label: a model can exhibit an answer-polarity bias rather than consistently invert the truth. A classifier can then look effective by reading the asserted answer rather than a deception-specific state.

The mirror test was especially important. Probes could flag sincere mistakes as deceptive, so the distinction between **false statement** and **deliberate deception** remained unresolved by the simple contrast. The expected self-generation advantage did not survive the stronger controls clearly enough to claim it.

Some follow-up score artifacts were not retained with the rest of the experiment archive. I discuss those analyses qualitatively here rather than present their old point estimates as independently reproducible benchmark results. A written finding and a recoverable evaluation artifact are different kinds of evidence.

### Refusal transfer: corpus and behavioral controls

#### Refusal transfer: the follow-up question

The refusal study asked whether the poor deception-transfer pattern also appears across refusal categories. To make that comparison meaningful, I held the core measurement recipe aligned with the deception matrix: **Qwen3-8B, a fixed layer at 65% depth, regularized logistic regression, train-fold-only standardization, an 80/20 split, shuffled-label checks, and cell-level bootstrap analysis**.

Six categories contributed 150 harmful and 150 harmless examples each. Activations came from the final five chat-template positions, making the number of probed positions equal by construction. The categories were chosen on available pool size before inspecting transfer performance.

The first harmless class came from Alpaca. The important control rebuilt it from BeaverTails, the same corpus as the harmful examples. This changes the question from “can the probe distinguish these two datasets?” toward “does the distinction survive when source and register are better matched?”

#### The perfect result that needed a control

With Alpaca as the harmless class, **every cell in the six-by-six matrix reached 1.000 AUROC**. That looks like a decisive result until the data construction is considered. Polished instructional Alpaca text and terse conversational BeaverTails text differ for reasons unrelated to refusal.

Matching the harmless class within BeaverTails reduced the mean off-diagonal score to **0.877**, with a retained cell-bootstrap interval of approximately **0.828–0.917**. The decrease is evidence that the uncontrolled contrast was over-optimistic. It does not identify an exact percentage of a vector as “style” versus “harm.”

The supported observation is that **refusal-related discrimination transferred more consistently across these categories than deception-related discrimination transferred across these tasks**. It is not proof of a universal refusal direction, and it is not a causal removal experiment.

#### Harmful prompts are not observed refusals

A prompt's harmfulness label and a model's actual refusal behavior are not interchangeable. In the manipulation check, some harmful categories produced refusals much less consistently than others. A classifier trained on harmful versus harmless inputs can therefore be doing something other than detecting refusal.

I added a behavioral labeling scheme based on the model's own greedy continuations. In that Alpaca-backed dataset, the off-diagonal mean was about **0.936**, while the estimated own-category advantage had an interval spanning zero. That result adds a useful behavioral check, but it retains the limitations of its dataset construction; it does not substitute for the same-corpus control.

Refusal was not perfectly uniform either. In the matched matrix, one violence-to-privacy transfer scored about **0.327**, while privacy's own probe was near ceiling. Treating all refusal categories as one interchangeable direction would miss that exception.

### Limits, uncertainty, and the next experiment

#### What the nulls and uncertainty actually cover

The fixed-position embedding-layer null produced chance-level scores and zero fitted direction, as expected from identical template tokens. Shuffled-label tests and independently built dataset variants provided additional checks against an accidentally informative pipeline.

The uncertainty intervals are conditional on a particular fitted pipeline. They do not capture all the variation from changing the random seed, refitting the probe, selecting a new layer, or choosing a different corpus. With six diagonal cells, statements about a small own-task advantage are especially fragile.

Same-corpus matching controls source and register better than the Alpaca contrast, but does not perfectly match topic. The behavioral marker checks only a short continuation and can miss a refusal that appears later. One model and one set of categories cannot establish universality.

#### Where I would take the research next

The practical conclusion is to validate a monitor on **the distinction and shift it will actually face**. Within-task accuracy, cross-task transfer, veracity, refusal behavior, and causal control are separate questions. A strong answer to one should not quietly stand in for the others.

My next proposed experiment separates the model's active goal, the user's goal, conflict between them, and concealment. I would test whether those representations transfer and whether interventions produce the predicted behavioral changes. **That goal-based causal experiment remains a proposal.**

For now, the contribution is a controlled account of when internal signals are informative, when their meaning changes, and how several apparently clean safety results become less simple once the alternatives are measured.
