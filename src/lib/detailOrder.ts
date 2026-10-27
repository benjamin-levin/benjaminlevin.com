// Computes the ordered list of detail pages (experiences in
// reverse-chronological order, then projects by priority) so neighbors can
// stitch together for the pull-to-navigate gesture.
//
// Server-side only — uses data.ts loaders.

import { loadExperiences, loadProjects, dateRank, type Experience, type Project } from "./data";

export type DetailNeighbor = {
  href: string;
  title: string;
  eyebrow: string; // e.g., "Experience" or "Project"
};

export type DetailNeighbors = {
  prev?: DetailNeighbor;
  next?: DetailNeighbor;
};

function expToEntry(e: Experience): DetailNeighbor {
  return {
    href: `/experience/${e.id}`,
    title: `${e.company} — ${e.role}`,
    eyebrow: "Experience",
  };
}

function projToEntry(p: Project): DetailNeighbor {
  return {
    href: `/project/${p.id}`,
    title: p.title,
    eyebrow: "Project",
  };
}

export function getDetailOrder(): DetailNeighbor[] {
  const exps = loadExperiences().sort((a, b) => dateRank(b.start) - dateRank(a.start));
  const projs = loadProjects().sort((a, b) => a.priority - b.priority);
  return [...exps.map(expToEntry), ...projs.map(projToEntry)];
}

export function getDetailNeighbors(href: string): DetailNeighbors {
  const list = getDetailOrder();
  const idx = list.findIndex((e) => e.href === href);
  if (idx === -1) return {};
  return {
    prev: idx > 0 ? list[idx - 1] : undefined,
    next: idx < list.length - 1 ? list[idx + 1] : undefined,
  };
}
