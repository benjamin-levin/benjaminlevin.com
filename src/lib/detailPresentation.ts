// Compact entries read as one page in both the IDE and dedicated detail view.
// Long research/workstream case studies retain their section navigation.
const SINGLE_PAGE_IDS = new Set([
  "behuman", "prsm-ai", "tesla", "neu-rover", "draper", "mantis-health",
  "mantis", "mantis-dental", "infinite-cooling", "tetris-bot", "en-passant", "ornithopter",
]);

export function isSinglePageEntry(id: string): boolean {
  return SINGLE_PAGE_IDS.has(id);
}

// Keep earlier case-study links usable after headings are consolidated.
const SECTION_ALIASES: Record<string, Record<string, string>> = {
  "unify": {
    "planning-while-the-user-speaks": "bonsai-role-mode-and-shared-prefill",
    "updating-a-plan-while-speech-arrives": "bonsai-role-mode-and-shared-prefill",
    "speculation-batching-and-the-cost-of-verification": "speculation-batching-and-verification",
    "quantization-is-several-different-decisions": "quantization-is-several-decisions",
  },
  "deception-probes": {
      "the-measurement-a-direction-is-not-an-explanation": "how-the-probes-were-measured",
      "building-a-transfer-experiment-instead-of-one-score": "how-the-probes-were-measured",
      "what-each-control-changed": "how-the-probes-were-measured",
      "prompt-framing-can-masquerade-as-honesty": "how-the-probes-were-measured",
      "cross-task-failure-and-inverted-rankings": "deception-transfer-and-representation-stability",
      "layers-stability-and-misleading-model-size-stories": "deception-transfer-and-representation-stability",
      "when-an-ensemble-win-depends-on-its-baseline": "ensembles-self-generated-text-and-sincere-errors",
      "self-generated-text-sincere-errors-and-failed-predictions": "ensembles-self-generated-text-and-sincere-errors",
      "refusal-transfer-the-follow-up-question": "refusal-transfer-corpus-and-behavioral-controls",
      "the-perfect-result-that-needed-a-control": "refusal-transfer-corpus-and-behavioral-controls",
      "harmful-prompts-are-not-observed-refusals": "refusal-transfer-corpus-and-behavioral-controls",
      "what-the-nulls-and-uncertainty-actually-cover": "limits-uncertainty-and-the-next-experiment",
      "where-i-would-take-the-research-next": "limits-uncertainty-and-the-next-experiment",
      "limitations-and-next-experiment": "limits-uncertainty-and-the-next-experiment"
  },
  "mlx-fast": {
    "physical-cache-truncation": "snapkv-selection-has-to-remove-real-traffic",
  },
};

export function resolveDetailFile(id: string, file: string): string {
  if (isSinglePageEntry(id)) return "overview.md";
  const slug = file.replace(/\.md$/, "");
  return SECTION_ALIASES[id]?.[slug] ? `${SECTION_ALIASES[id][slug]}.md` : file;
}

export function detailSectionAliases(id: string, slug: string): string[] {
  return Object.entries(SECTION_ALIASES[id] ?? {}).filter(([, target]) => target === slug).map(([alias]) => alias);
}
