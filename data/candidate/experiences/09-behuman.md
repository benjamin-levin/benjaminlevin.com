---
id: behuman
company: BeHuman
location: null
role: Product Owner
team: null
url: null
start: Jun 2026
end: Present
priority: 1
tags: [product-ownership, patient-experience, clinical-ai, evaluation, workflow-design, cross-functional]
---

# BeHuman — Product Owner

## Bullets

- **Own the patient interface and patient-chart analysis optimization**, connecting an understandable patient experience with evidence-based clinical AI evaluation.
- Investigated chart representation, model behavior, and processing cost; turned experimental findings into a staged rollout and clinician-review plan.
- Built a reusable adversarial AI QA framework and delivered a development dashboard for inspecting groundedness, unsupported claims, and overly agreeable answers.

## Detail

Since June 2026, I have been a Product Owner at **BeHuman**, responsible for the patient interface and patient-chart analysis optimization. My work spans product requirements, hands-on implementation, experimental evaluation, and coordination with engineering and clinical stakeholders.

The connecting problem is trust: patients need information they can understand, while clinicians need analysis they can inspect. A clearer interface cannot compensate for an unsupported finding, and a cheaper report is useful only if it preserves the evidence needed for clinical review.

### Chart analysis: approach and results

I investigated how to make AI-assisted analysis of longitudinal charts more useful and less expensive. The work compared alternatives against the existing report-generation flow, with attention to omitted findings, unsupported claims, consistency, processing cost, and turnaround time. I treated these as separate dimensions: a lower cost or a higher automated score did not establish clinical equivalence.

| Approach | Observed result | Product decision |
| --- | --- | --- |
| Examine what the model actually receives | Earlier chart reduction discarded clinical history; reducing input size alone could conceal a quality regression. | Preserve clinical facts and evaluate the result against the original chart. |
| Evaluate a lossless chart representation with prompt and caching improvements | Internal experiments showed lower report cost and a better grounding profile than the earlier reduced representation. | Prioritize the smaller change before adopting a more complex processing architecture. |
| Compare a more complex model orchestration | Experiments showed a promising cost and coverage tradeoff, alongside greater complexity and slower turnaround. | Keep it as a candidate for shadow comparison rather than declare an immediate replacement. |
| Inspect evaluation methods and disagreement | Different automated judges reached different conclusions; aggregate gains could hide weak performance in individual finding categories. | Require category-level review and clinician validation before making broader quality claims. |

These were experimental findings, not demonstrated patient outcomes. They supported a concrete delivery choice: improve the existing path first, preserve comparable outputs, and review alternatives before changing which result people rely on. I do not present the pilot as proof of clinical accuracy or realized production savings.

### Make the comparison reviewable

I defined an evaluation approach that keeps the baseline visible and separates evidence from interpretation. The same chart should support a comparison of candidate reports, with the original chart available to assess anything a reduced representation may have omitted. Repeated runs help expose variability; blinded clinician review supplies a different check from automated scoring.

![Evaluation workflow: compare candidate reports against the same source chart, inspect evidence and variability, then obtain clinician review before a promotion decision. This is the evaluation design, not a claim that clinical validation is complete.](/media/case-studies/behuman/evaluation-workflow.svg)

The agreed rollout approach retained the existing output alongside candidate versions, tracked usage separately, and used controlled selection of the official report. This made comparison part of the release plan. At the latest verified project checkpoint, clinician validation and the final promotion decision remained outstanding.

I also challenged how confidently results could be summarized. A useful evaluation must distinguish improvements in one category from improvements across the whole report, and model selection on an evaluation set limits how independently that set can validate the chosen configuration. That led to a stronger emphasis on fresh cases and human review.

### Reusable AI quality assurance

Earlier in the role, I built an adversarial test harness for the clinical assistant, then generalized it into a framework with per-feature adapters and a model-aware dashboard. Tests examined whether answers stayed supported by retrieved evidence when challenged by misleading premises, contradictory requests, or pressure to agree.

| Delivered | What it enabled | Verified boundary |
| --- | --- | --- |
| Adversarial assistant harness | Repeatable inspection of hallucination, sycophancy, and confidently incorrect answers | Automated findings still require interpretation. |
| Reusable adapter framework and development dashboard | A shared place to configure runs and inspect model-specific results | Deployed in development; organization-wide adoption is not established. |
| Usage and pricing foundations | Clearer inspection of the cost of AI interactions | A foundation for further cost reporting, not a claim of realized savings. |

### Patient experience and delivery

For the patient interface, I translate feedback into priorities, implementation work, and acceptance criteria. My contributions include portal UI improvements, clearer access to help, and health-record trend displays prepared for review. For laboratory trends, the presentation must respect unit compatibility rather than imply that incompatible measurements belong on the same scale.

I carry product decisions through engineering discussion and QA, including identifying prerequisites before implementation and resolving overlapping plans. When a proposed pipeline migration overlapped with another team's direction, the migration was cancelled; my provenance, citation, and evaluation requirements carried forward into the shared plan. The contribution was clearer requirements and alignment, not a shipped replacement pipeline.
