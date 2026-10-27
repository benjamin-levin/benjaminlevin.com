// Compact entries read as one page in both the IDE and dedicated detail view.
// Long research/workstream case studies retain their section navigation.
const SINGLE_PAGE_IDS = new Set([
  "behuman", "prsm-ai", "tesla", "neu-rover", "draper", "mantis-health",
  "mantis", "mantis-dental", "infinite-cooling", "tetris-bot", "en-passant", "ornithopter",
]);

export function isSinglePageEntry(id: string): boolean {
  return SINGLE_PAGE_IDS.has(id);
}
