#!/usr/bin/env node
// Compile candidate data into BEN_CONTEXT.md — the source of truth the chatbot reads.
// Run via `node scripts/build-context.mjs` whenever data/candidate/ changes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CAND = path.join(ROOT, 'data', 'candidate');
const OUT = path.join(ROOT, 'BEN_CONTEXT.md');

const personalFile = fs.existsSync(path.join(CAND, 'personal.json')) ? 'personal.json' : 'personal.example.json';
const personal = JSON.parse(fs.readFileSync(path.join(CAND, personalFile), 'utf8'));
const education = JSON.parse(fs.readFileSync(path.join(CAND, 'education.json'), 'utf8'));
const skills = JSON.parse(fs.readFileSync(path.join(CAND, 'skills.json'), 'utf8'));

// Strip YAML frontmatter (`---\n...\n---`) so the chatbot's context isn't
// peppered with raw `id: foo / company: bar / ...` blocks that some models
// like to quote back to the user verbatim.
const stripFrontmatter = (text) => text.replace(/^---\n[\s\S]*?\n---\n+/, '');

const readDir = (dir) =>
  fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
    .map((f) => ({ file: f, body: stripFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8')) }));

const experiences = readDir(path.join(CAND, 'experiences'));
const projects = readDir(path.join(CAND, 'projects'));

const out = [];
out.push('# Benjamin Levin — Portfolio Context');
out.push('');
out.push('This document is the source of truth for the chatbot answering questions about Ben on benjaminlevin.com. Speak naturally, cite specific projects, never invent facts not in this document.');
out.push('');
out.push('## Personal');
out.push(`- **Name**: ${personal.name} (goes by ${personal.preferred_short_name})`);
out.push(`- **Location**: ${personal.city}, ${personal.state}`);
out.push(`- **Email**: ${personal.email}`);
out.push(`- **LinkedIn**: ${personal.links.find(l => l.label === 'LinkedIn')?.url ?? ''}`);
out.push(`- **Self-described**: ${personal.self_descriptors.join('; ')}`);
out.push(`- **Geographic preferences**: ${(personal.geographic_preferences || []).join(', ')}`);
out.push(`- **Level target**: ${personal.level_target ?? ''}`);
out.push('');
out.push('NOTE: Ben\'s phone number is intentionally not in this document. If asked, direct visitors to email or LinkedIn.');
out.push('');

out.push('## Education');
out.push('');
for (const d of education.degrees) {
  out.push(`### ${d.kind} — ${d.school_full}`);
  out.push(`- ${d.in_progress ? 'Expected' : 'Completed'}: ${d.date}`);
  if (d.gpa) out.push(`- GPA: ${d.gpa}`);
  if (d.honors) out.push(`- Honors: ${d.honors}`);
  if (d.courses?.length) {
    out.push(`- Relevant courses: ${d.courses.map((c) => c.name || c.abbrev).join(', ')}`);
  }
  out.push('');
}

out.push('## Skills');
out.push('');
for (const cat of skills.categories) {
  out.push(`### ${cat.name}`);
  out.push(cat.skills.map((s) => s.name).join(', '));
  out.push('');
}

out.push('## Experience');
out.push('');
out.push('Listed reverse-chronologically. Each entry has bullets (resume-form, surface-level) and detail (in-depth context the chatbot can pull from for follow-up questions).');
out.push('');
for (const { body } of experiences) {
  out.push(body.trim());
  out.push('');
  out.push('---');
  out.push('');
}

out.push('## Projects');
out.push('');
out.push('Personal / extracurricular projects, listed by priority.');
out.push('');
for (const { body } of projects) {
  out.push(body.trim());
  out.push('');
  out.push('---');
  out.push('');
}

fs.writeFileSync(OUT, out.join('\n'), 'utf8');
console.log(`[build-context] wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);
