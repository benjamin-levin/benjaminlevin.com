// Loads candidate data (personal/education/skills + experience/project markdown)
// for use in the portfolio UI. Server-side only — reads from disk at build time.
//
// Mirrors the Python data.py loader shape from the resume tailor pipeline.

import fs from "node:fs";
import path from "node:path";

const CAND = path.join(process.cwd(), "data", "candidate");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Personal = {
  name: string;
  preferred_short_name?: string;
  city: string;
  state: string;
  email: string;
  links: { label: string; url: string }[];
  self_descriptors: string[];
};

export type Course = { id: string; name: string; abbrev: string; tags: string[] };
export type Degree = {
  id: string;
  kind: string;
  school: string;
  school_full: string;
  date: string;
  in_progress: boolean;
  gpa: string | null;
  honors: string | null;
  courses: Course[];
};

export type Skill = { name: string; tags: string[] };
export type SkillCategory = { name: string; skills: Skill[] };

export type Bullet = { id: string; text: string };

export type Experience = {
  id: string;
  company: string;
  location: string | null;
  role: string;
  team: string | null;
  url: string | null;
  start: string;
  end: string;
  priority: number;
  tags: string[];
  bullets: Bullet[];
  detail: string;
  media?: ProjectMedia;
};

export type Project = {
  id: string;
  title: string;
  role: string | null;
  url: string | null;
  start: string;
  end: string;
  priority: number;
  tags: string[];
  bullets: Bullet[];
  detail: string;
  media?: ProjectMedia;
};

export type ProjectMedia = {
  hero?: { type: "image" | "video"; src: string; poster?: string };
  gallery?: { type: "image" | "video"; src: string; caption?: string }[];
};

// ---------------------------------------------------------------------------
// Frontmatter / bullets parser (subset of YAML, same shape as data.py)
// ---------------------------------------------------------------------------
function parseValue(raw: string): unknown {
  raw = raw.trim();
  if (raw === "" || raw.toLowerCase() === "null") return null;
  if (raw.toLowerCase() === "true") return true;
  if (raw.toLowerCase() === "false") return false;
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return splitTopLevel(inner, ",").map((p) => parseValue(p));
  }
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  const n = Number(raw);
  if (!Number.isNaN(n) && /^-?\d+(\.\d+)?$/.test(raw)) return n;
  return raw;
}

function splitTopLevel(text: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let buf = "";
  for (const ch of text) {
    if (quote) {
      buf += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      buf += ch;
      continue;
    }
    if ("[{(".includes(ch)) depth++;
    else if ("]})".includes(ch)) depth--;
    if (ch === sep && depth === 0) {
      out.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf) out.push(buf.trim());
  return out;
}

function parseFrontmatter(text: string): { fields: Record<string, unknown>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return { fields: {}, body: text };
  const fields: Record<string, unknown> = {};
  for (const line of m[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    fields[line.slice(0, idx).trim()] = parseValue(line.slice(idx + 1));
  }
  return { fields, body: text.slice(m[0].length) };
}

function splitMdSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let current: string | null = null;
  let buf: string[] = [];
  for (const line of body.split("\n")) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (current !== null) sections[current] = buf.join("\n").trim();
      current = m[1].trim().toLowerCase();
      buf = [];
    } else {
      buf.push(line);
    }
  }
  if (current !== null) sections[current] = buf.join("\n").trim();
  return sections;
}

function parseBullets(text: string): Bullet[] {
  const out: Bullet[] = [];
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const m = /^-\s+(.*)$/.exec(line);
    if (!m) {
      i++;
      continue;
    }
    const head = m[1].trim();
    const idMatch = /^id:\s*(\S+)\s*$/.exec(head);
    if (idMatch && i + 1 < lines.length) {
      const ahead = lines[i + 1].trimStart();
      const tm = /^text:\s*(.*)$/.exec(ahead);
      if (tm) {
        out.push({ id: idMatch[1], text: tm[1].trim() });
        i += 2;
        continue;
      }
    }
    const slug = head.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32).replace(/^-|-$/g, "")
      || `b${out.length}`;
    out.push({ id: slug, text: head });
    i++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------
export function loadPersonal(): Personal {
  const personalFile = fs.existsSync(path.join(CAND, "personal.json")) ? "personal.json" : "personal.example.json";
  const raw = JSON.parse(fs.readFileSync(path.join(CAND, personalFile), "utf8"));
  return {
    name: raw.name,
    preferred_short_name: raw.preferred_short_name,
    city: raw.city,
    state: raw.state,
    email: raw.email,
    links: raw.links ?? [],
    self_descriptors: raw.self_descriptors ?? [],
  };
}

export function loadEducation(): Degree[] {
  const raw = JSON.parse(fs.readFileSync(path.join(CAND, "education.json"), "utf8"));
  return raw.degrees.map((d: Record<string, unknown>) => ({
    id: d.id as string,
    kind: d.kind as string,
    school: d.school as string,
    school_full: (d.school_full as string) ?? (d.school as string),
    date: d.date as string,
    in_progress: Boolean(d.in_progress),
    gpa: (d.gpa as string) ?? null,
    honors: (d.honors as string) ?? null,
    courses: ((d.courses as Course[]) ?? []).map((c) => ({
      id: c.id, name: c.name, abbrev: c.abbrev ?? c.name, tags: c.tags ?? [],
    })),
  }));
}

export function loadSkills(): SkillCategory[] {
  const raw = JSON.parse(fs.readFileSync(path.join(CAND, "skills.json"), "utf8"));
  return raw.categories.map((cat: Record<string, unknown>) => ({
    name: cat.name as string,
    skills: ((cat.skills as Skill[]) ?? []).map((s) => ({ name: s.name, tags: s.tags ?? [] })),
  }));
}

function loadMdCollection(dir: string) {
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const { fields, body } = parseFrontmatter(text);
    const sections = splitMdSections(body);
    const bullets = parseBullets(sections["bullets"] ?? "");
    return { fields, sections, bullets };
  });
}

// Hero-only media for experiences. Inline media within the markdown sections
// carries the rest of the visuals — listing them here would create duplicates
// (same as the projects setup).
const EXPERIENCE_MEDIA: Record<string, ProjectMedia> = {
  "neu-rover": {
    hero: { type: "image", src: "/media/experiences/neu-rover/utah-competition.jpg" },
  },
  "mantis": {
    hero: { type: "image", src: "/media/experiences/mantis/prototype.jpg" },
  },
  "tesla": {
    hero: { type: "image", src: "/media/experiences/tesla/hand-tactile-egg-demo.jpg" },
  },
  "formulatrix": {
    hero: { type: "video", src: "/media/experiences/formulatrix/formulatrix-bayes.mp4" },
  },
};

export function loadExperiences(): Experience[] {
  return loadMdCollection(path.join(CAND, "experiences")).map(({ fields, sections, bullets }) => {
    const id = fields.id as string;
    return {
      id,
      company: fields.company as string,
      location: (fields.location as string) ?? null,
      role: fields.role as string,
      team: (fields.team as string) ?? null,
      url: (fields.url as string) ?? null,
      start: fields.start as string,
      end: fields.end as string,
      priority: Number(fields.priority ?? 99),
      tags: (fields.tags as string[]) ?? [],
      bullets,
      detail: (sections["detail"] ?? "").trim(),
      media: EXPERIENCE_MEDIA[id],
    };
  });
}

// Hero-only media. Each project's gallery is rendered inline within its
// detail-page sections (markdown ![alt](url) syntax) — listing media here
// and inline both creates duplicates, so we keep only the hero "first
// impression" image/video at the top of the detail page.
const PROJECT_MEDIA: Record<string, ProjectMedia> = {
  "en-passant": {
    hero: { type: "image", src: "/media/projects/en-passant/system-stackup.png" },
  },
  "ornithopter": {
    hero: { type: "video", src: "/media/projects/ornithopter/shoulder-anim.mp4" },
  },
  "tetris-bot": {
    hero: { type: "video", src: "/media/projects/tetris-bot/heuristic-pruning.mp4" },
  },
};

export function loadProjects(): Project[] {
  return loadMdCollection(path.join(CAND, "projects")).map(({ fields, sections, bullets }) => {
    const id = fields.id as string;
    return {
      id,
      title: fields.title as string,
      role: (fields.role as string) ?? null,
      url: (fields.url as string) ?? null,
      start: fields.start as string,
      end: fields.end as string,
      priority: Number(fields.priority ?? 99),
      tags: (fields.tags as string[]) ?? [],
      bullets,
      detail: (sections["detail"] ?? "").trim(),
      media: PROJECT_MEDIA[id],
    };
  });
}

export function loadAll() {
  return {
    personal: loadPersonal(),
    education: loadEducation(),
    skills: loadSkills(),
    experiences: loadExperiences(),
    projects: loadProjects(),
  };
}

// Date parsing for chronological sort. "Present" sorts first.
export function dateRank(s: string | null | undefined): number {
  if (!s) return 0;
  const t = s.trim();
  if (/^(present|current|now)$/i.test(t)) return 99999912;
  const cleaned = t.replace(/^(paused|expected|approx\.?|ongoing|since)\s+/i, "");
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(cleaned);
  const months: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
    jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
    oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  };
  if (m) {
    const month = months[m[1].toLowerCase()] ?? 6;
    return Number(m[2]) * 100 + month;
  }
  const yearMatch = /(\d{4})/.exec(cleaned);
  if (yearMatch) return Number(yearMatch[1]) * 100 + 6;
  return 0;
}

export function formatRange(start: string, end: string): string {
  const e = /^(present|current|now)$/i.test(end.trim()) ? "Present" : end.trim();
  return `${start} → ${e}`;
}
