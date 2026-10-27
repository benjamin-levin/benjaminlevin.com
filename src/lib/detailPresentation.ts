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
    "limitations-and-next-experiment": "where-i-would-take-the-research-next",
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
