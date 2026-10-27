"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { Hero } from "@/components/Hero";
import { COPY } from "../../data/copy";
import { PreviewCard } from "@/components/PreviewCard";
import { EXPERIENCE_HIGHLIGHTS, PROJECT_HIGHLIGHTS } from "@/lib/highlights";
import { HighlightStrip } from "@/components/HighlightStrip";
import { splitSubsections, renderMarkdown } from "@/lib/markdown";
import { isSinglePageEntry } from "@/lib/detailPresentation";
import { EdgeNav, type EdgeNeighbor } from "@/components/EdgeNav";

// Type definitions to mirror what we get from loadAll
type Personal = any;
type SkillCat = any;
type Education = any;
type Experience = any;
type Project = any;

function formatRange(start: string, end: string): string {
  const e = /^(present|current|now)$/i.test(end.trim()) ? "Present" : end.trim();
  return `${start} → ${e}`;
}

function dateRank(s: string | null | undefined): number {
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

interface IdePortfolioProps {
  personal: Personal;
  experiences: Experience[];
  projects: Project[];
  skills: SkillCat[];
  education: Education[];
}

type ActiveFile =
  | { type: "readme" }
  | { type: "skills" }
  | { type: "education" }
  | { type: "experience"; id: string; file: string }
  | { type: "project"; id: string; file: string };

// Build the linear order in which the sidebar files appear, so the EdgeNav
// gesture can step from one to the next.
type FileEntry = { file: ActiveFile; eyebrow: string; title: string };
function buildFileOrder(
  sortedExp: Experience[],
  sortedProj: Project[],
): FileEntry[] {
  const out: FileEntry[] = [];
  out.push({ file: { type: "readme" }, eyebrow: "/", title: "README.md" });
  out.push({ file: { type: "education" }, eyebrow: "/", title: "education.md" });
  out.push({ file: { type: "skills" }, eyebrow: "/", title: "skills.md" });


  for (const e of sortedExp) {
    const { sections } = splitSubsections(e.detail || "");
    const expEyebrow = `experiences / ${e.id}`;
    const expTitle = `${e.company} — ${e.role}`;
    if (sections.length > 0 && !isSinglePageEntry(e.id)) {
      out.push({ file: { type: "experience", id: e.id, file: "overview.md" }, eyebrow: expEyebrow, title: `${expTitle} · overview` });
      for (const s of sections) {
        out.push({ file: { type: "experience", id: e.id, file: `${s.slug}.md` }, eyebrow: expEyebrow, title: `${expTitle} · ${s.title}` });
      }
    } else {
      out.push({ file: { type: "experience", id: e.id, file: "overview.md" }, eyebrow: "experiences", title: expTitle });
    }
  }
  for (const p of sortedProj) {
    const { sections } = splitSubsections(p.detail || "");
    const projEyebrow = `projects / ${p.id}`;
    if (sections.length > 0 && !isSinglePageEntry(p.id)) {
      out.push({ file: { type: "project", id: p.id, file: "overview.md" }, eyebrow: projEyebrow, title: `${p.title} · overview` });
      for (const s of sections) {
        out.push({ file: { type: "project", id: p.id, file: `${s.slug}.md` }, eyebrow: projEyebrow, title: `${p.title} · ${s.title}` });
      }
    } else {
      out.push({ file: { type: "project", id: p.id, file: "overview.md" }, eyebrow: "projects", title: p.title });
    }
  }
  return out;
}

function sameFile(a: ActiveFile, b: ActiveFile): boolean {
  if (a.type !== b.type) return false;
  if ("id" in a && "id" in b) {
    if (a.id !== b.id) return false;
    if ("file" in a && "file" in b) return a.file === b.file;
  }
  return true;
}

// URL hash <-> active file. The home page uses fragment-style routing so each
// "file" in the IDE is reachable + reloadable via a unique URL — e.g.
// `/#README.md`, `/#skills.md`, `/#experiences/prsm-ai/architecture.md`.
function serializeFile(f: ActiveFile): string {
  switch (f.type) {
    case "readme": return "README.md";
    case "skills": return "skills.md";
    case "education": return "education.md";
    case "experience": return `experiences/${f.id}/${f.file}`;
    case "project": return `projects/${f.id}/${f.file}`;
  }
}

function parseFile(rawHash: string): ActiveFile | null {
  const h = decodeURIComponent(rawHash.replace(/^#/, "")).trim();
  if (!h || h === "top") return null;
  if (h === "README.md" || h.toLowerCase() === "readme") return { type: "readme" };
  if (h === "skills.md" || h === "skills.json" || h === "skills") return { type: "skills" };
  if (h === "education.md" || h === "education") return { type: "education" };
  const expMatch = /^experiences\/([^/]+)\/(.+)$/.exec(h);
  if (expMatch) return { type: "experience", id: expMatch[1], file: isSinglePageEntry(expMatch[1]) ? "overview.md" : expMatch[2] };
  const projMatch = /^projects\/([^/]+)\/(.+)$/.exec(h);
  if (projMatch) return { type: "project", id: projMatch[1], file: isSinglePageEntry(projMatch[1]) ? "overview.md" : projMatch[2] };
  return null;
}

export function IdePortfolio({ personal, experiences, projects, skills, education }: IdePortfolioProps) {
  const [activeFile, setActiveFile] = useState<ActiveFile>({ type: "readme" });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    experiences: true,
    projects: true,
  });

  // Tracks whether the next activeFile change came from the URL (hash hydrate
  // or popstate) — in that case we must NOT push another history entry, or
  // back-button history grows by two per real navigation.
  const skipNextHashUpdate = useRef(false);
  // First URL sync uses replaceState (no history entry) so a fresh page load
  // doesn't grow history when we auto-correct `/` → `/#README.md`.
  const isFirstUrlSync = useRef(true);

  const sortedExp = [...experiences].sort((a, b) => dateRank(b.start) - dateRank(a.start));
  const sortedProj = [...projects].sort((a, b) => a.priority - b.priority);

  // Refs for the EdgeNav scroll container + transform target.
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const editorContentRef = useRef<HTMLDivElement | null>(null);

  // Linear file order (sidebar). Memoised — only recomputes when source data changes.
  const fileOrder = useMemo(() => buildFileOrder(sortedExp, sortedProj), [sortedExp, sortedProj]);
  const activeIdx = fileOrder.findIndex((f) => sameFile(f.file, activeFile));
  const prevEntry = activeIdx > 0 ? fileOrder[activeIdx - 1] : undefined;
  const nextEntry = activeIdx >= 0 && activeIdx < fileOrder.length - 1 ? fileOrder[activeIdx + 1] : undefined;

  const prevNeighbor: EdgeNeighbor | undefined = prevEntry && {
    title: prevEntry.title,
    eyebrow: prevEntry.eyebrow,
  };
  const nextNeighbor: EdgeNeighbor | undefined = nextEntry && {
    title: nextEntry.title,
    eyebrow: nextEntry.eyebrow,
  };

  // Auto-expand the parent folder when activeFile is inside a sub-folder
  // (so the user can see where they are in the file tree after a gesture).
  useEffect(() => {
    if (activeFile.type === "experience") {
      setExpandedFolders((p) => ({ ...p, [`exp-${activeFile.id}`]: true, experiences: true }));
    } else if (activeFile.type === "project") {
      setExpandedFolders((p) => ({ ...p, [`proj-${activeFile.id}`]: true, projects: true }));
    }
  }, [activeFile]);

  // Reset editor scroll when active file changes (back to original behavior).
  useEffect(() => {
    if (editorScrollRef.current) {
      editorScrollRef.current.scrollTop = 0;
    }
  }, [activeFile]);

  // URL <-> activeFile sync. On mount we hydrate the active file from the URL
  // hash so reload / direct-link / share-URL all land on the same file. On
  // change we pushState a new hash so each file gets its own entry in browser
  // history (back/forward walks file-by-file). On popstate we re-read the hash
  // back into state.
  useEffect(() => {
    const hydrate = () => {
      const f = parseFile(window.location.hash);
      if (f) {
        skipNextHashUpdate.current = true;
        setActiveFile(f);
      }
    };
    hydrate();
    const onPop = () => {
      const f = parseFile(window.location.hash) ?? { type: "readme" as const };
      skipNextHashUpdate.current = true;
      setActiveFile(f);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (skipNextHashUpdate.current) {
      skipNextHashUpdate.current = false;
      isFirstUrlSync.current = false;
      return;
    }
    const newHash = serializeFile(activeFile);
    const currentHash = window.location.hash.replace(/^#/, "");
    if (currentHash === newHash) {
      isFirstUrlSync.current = false;
      return;
    }
    const url = `${window.location.pathname}${window.location.search}#${newHash}`;
    if (isFirstUrlSync.current) {
      // Fresh page load — auto-correct the URL without growing history.
      window.history.replaceState({}, "", url);
    } else {
      // Subsequent file changes — pushState so back button walks file-by-file.
      window.history.pushState({}, "", url);
    }
    isFirstUrlSync.current = false;
  }, [activeFile]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleFolder = (folder: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleSelectFile = (file: ActiveFile) => {
    setActiveFile(file);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const isFileActive = (file: ActiveFile) => {
    if (activeFile.type !== file.type) return false;
    if ("id" in activeFile && "id" in file) {
      if (activeFile.id !== file.id) return false;
      if ("file" in activeFile && "file" in file) return activeFile.file === file.file;
    }
    return true;
  };

  const renderFileTreeItem = (label: string, file: ActiveFile, icon: string = "📝", rightLabel?: string) => {
    const active = isFileActive(file);
    const keyStr = file.type + ("id" in file ? `-${file.id}` : "") + ("file" in file ? `-${file.file}` : `-${label}`);
    return (
      <div
        key={keyStr}
        onClick={() => handleSelectFile(file)}
        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm font-medium transition-colors ${
          active
            ? "bg-[color:var(--accent)]/10 text-[color:var(--accent-3)] border-l-2 border-[color:var(--accent)]"
            : "text-[color:var(--fg-muted)] hover:bg-white/[.04] hover:text-[color:var(--fg)] border-l-2 border-transparent"
        }`}
      >
        <span className="opacity-70 text-xs w-4 text-center">{icon}</span>
        <span className="truncate flex-1">{label}</span>
        {rightLabel && <span className="mono text-[9px] opacity-40 shrink-0 ml-2">{rightLabel}</span>}
      </div>
    );
  };

  const renderFolder = (label: string, folderKey: string, rightLabel: string | undefined, children: React.ReactNode) => {
    const expanded = expandedFolders[folderKey];
    return (
      <div key={folderKey} className="mb-1">
        <div
          onClick={(e) => toggleFolder(folderKey, e)}
          className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer text-sm font-semibold text-[color:var(--fg)] hover:bg-white/[.04] transition-colors"
        >
          <span className={`transition-transform duration-200 opacity-60 text-[10px] w-4 text-center ${expanded ? "rotate-90" : ""}`}>
            ▶
          </span>
          <span className="opacity-80 text-xs">📁</span>
          <span className="truncate flex-1">{label}</span>
          {rightLabel && <span className="mono text-[9px] opacity-40 shrink-0 ml-2 mr-1">{rightLabel}</span>}
        </div>
        {expanded && <div className="ml-2 border-l border-white/[.06] pl-1">{children}</div>}
      </div>
    );
  };

  const getBreadcrumb = () => {
    switch (activeFile.type) {
      case "readme": return "benjaminlevin / README.md";
      case "skills": return "benjaminlevin / skills.json";
      case "education": return "benjaminlevin / education.md";
      case "experience": return `experiences / ${activeFile.id} / ${activeFile.file}`;
      case "project": return `projects / ${activeFile.id} / ${activeFile.file}`;
      default: return "";
    }
  };

  const renderItemContent = (item: any, type: "experience" | "project") => {
    if (!item || !("file" in activeFile)) return null;
    
    const { intro, sections } = splitSubsections(item.detail || "");
    const forceSingleFile = isSinglePageEntry(item.id);

    if (activeFile.file === "overview.md" || forceSingleFile) {
      const isExp = type === "experience";
      const title = isExp ? `${item.company} — ${item.role}` : item.title;
      const eyebrow = item.team ?? item.location ?? item.role ?? undefined;
      const meta = formatRange(item.start, item.end);
      const highlights = isExp ? (EXPERIENCE_HIGHLIGHTS[item.id] ?? []) : (PROJECT_HIGHLIGHTS[item.id] ?? []);

      // If it's a forced single-file, we want to render the ENTIRE detail string
      const contentToRender = forceSingleFile ? (item.detail || "") : intro;

      return (
        <div className="max-w-4xl mx-auto py-10 px-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="prose-tight max-w-none">
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent-3)] mb-3">
              {eyebrow ? `${eyebrow} · ${meta}` : meta}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[color:var(--fg)] mb-8">
              {title}
            </h1>
            
            {highlights.length > 0 && !forceSingleFile && (
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-4 text-[color:var(--fg)]">## Highlights</h2>
                <HighlightStrip
                  highlights={highlights}
                  withDescription
                  variant="linked"
                  onSelect={(h) => {
                    if (!h.anchor) return;
                    setActiveFile({ type, id: item.id, file: `${h.anchor}.md` });
                  }}
                />
              </div>
            )}

            {contentToRender && (
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(contentToRender) }} />
            )}
          </div>
        </div>
      );
    }

    const sectionSlug = activeFile.file.replace(".md", "");
    const section = sections.find(s => s.slug === sectionSlug);

    if (section) {
      return (
        <div className="max-w-4xl mx-auto py-10 px-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="prose-tight max-w-none">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[color:var(--fg)] mb-8">
              # {section.title}
            </h1>
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(section.body) }} />
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto py-10 px-6">
        <p className="text-[color:var(--fg-muted)]">File not found.</p>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeFile.type) {
      case "readme":
        return (
          <div className="max-w-4xl mx-auto py-10 px-6 animate-in fade-in duration-500">
            <Hero personal={personal} />
            <div className="mt-12 grid md:grid-cols-[200px_1fr] gap-6 md:gap-10 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/media/profile/headshot.jpg"
                alt={personal.name}
                className="w-[160px] md:w-[200px] aspect-square object-cover rounded-2xl border border-white/[.08] shadow-[0_0_30px_rgba(59,130,246,0.1)]"
              />
              <div className="prose-tight max-w-none">
                <h2 className="text-3xl font-bold mb-6 text-[color:var(--fg)]"># Welcome</h2>
                <p className="text-[color:var(--fg-muted)] leading-relaxed text-lg">
                  {COPY.about.description}
                </p>
              </div>
            </div>
          </div>
        );

      case "skills":
        return (
          <div className="max-w-4xl mx-auto py-10 px-6 animate-in fade-in duration-500">
            <div className="prose-tight max-w-none">
              <h1 className="text-4xl font-bold mb-10 text-[color:var(--fg)]"># Skills</h1>
              {skills.map((cat: SkillCat) => (
                <div key={cat.name} className="mb-8">
                  <h2 className="text-2xl font-bold mb-4 text-[color:var(--fg)]">## {cat.name}</h2>
                  <div className="flex flex-wrap gap-2">
                    {cat.skills.map((s: any) => (
                      <span key={s.name} className="text-[13px] px-3 py-1.5 rounded border border-white/[.08] bg-[color:var(--bg-elev)] text-[color:var(--fg)] shadow-sm">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "education":
        return (
          <div className="max-w-4xl mx-auto py-10 px-6 animate-in fade-in duration-500">
            <div className="prose-tight max-w-none">
              <h1 className="text-4xl font-bold mb-10 text-[color:var(--fg)]"># Education</h1>
              {education.map((d: Education) => (
                <div key={d.id} className="mb-12">
                  <h2 className="text-2xl font-bold mb-2 text-[color:var(--fg)]">## {d.kind} @ {d.school}</h2>
                  <div className="mono text-[11px] text-[color:var(--fg-dim)] mb-4 uppercase tracking-widest">
                    {d.in_progress ? "In progress" : "Completed"} · {d.date}
                  </div>
                  <p className="text-[color:var(--fg-muted)] text-base">{d.school_full}</p>
                  {(d.gpa || d.honors || (d.courses && d.courses.length > 0)) && (
                    <ul className="mt-5 space-y-1.5 list-none pl-0">
                      {d.gpa && <li><strong className="text-[color:var(--accent-3)]">GPA:</strong> {d.gpa}</li>}
                      {d.honors && <li><strong className="text-[color:var(--accent-3)]">Honors:</strong> {d.honors}</li>}
                      {d.courses && d.courses.length > 0 && (
                        <li><strong className="text-[color:var(--accent-3)]">Relevant Coursework:</strong> {d.courses.map((c:any) => c.abbrev).join(", ")}</li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "experience": {
        const exp = sortedExp.find(e => e.id === activeFile.id);
        return renderItemContent(exp, "experience");
      }
      case "project": {
        const proj = sortedProj.find(p => p.id === activeFile.id);
        return renderItemContent(proj, "project");
      }
    }
  };

  return (
    <div className="no-pinch-zoom absolute inset-0 flex bg-[color:var(--bg)] text-[color:var(--fg)] overflow-hidden font-sans">
      {/* Mobile Sidebar Toggle Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (File Explorer) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-[color:var(--bg-elev)] border-r border-[color:var(--border)] flex flex-col transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="px-4 py-3 text-xs font-bold text-[color:var(--fg-dim)] tracking-widest uppercase mb-2 border-b border-[color:var(--border)] flex justify-between items-center h-[52px] shrink-0">
          <span>Explorer</span>
          <button className="md:hidden text-[color:var(--fg)]" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {renderFileTreeItem("README.md", { type: "readme" }, "ℹ️")}
          {renderFileTreeItem("education.md", { type: "education" }, "🎓")}
          {renderFileTreeItem("skills.md", { type: "skills" }, "⚙️")}
          
          <div className="mt-4">
            {renderFolder("experiences", "experiences", undefined, (
              <>
                {sortedExp.map((e) => {
                  const { sections } = splitSubsections(e.detail || "");
                  const dateStr = formatRange(e.start, e.end);
                  const forceSingleFile = isSinglePageEntry(e.id);
                  
                  if (sections.length > 0 && !forceSingleFile) {
                    return renderFolder(e.id, `exp-${e.id}`, dateStr, (
                      <>
                        {renderFileTreeItem("overview.md", { type: "experience", id: e.id, file: "overview.md" }, "📄")}
                        {sections.map(s => 
                          renderFileTreeItem(`${s.slug}.md`, { type: "experience", id: e.id, file: `${s.slug}.md` }, "📝")
                        )}
                      </>
                    ));
                  } else {
                    return renderFileTreeItem(`${e.id}.md`, { type: "experience", id: e.id, file: "overview.md" }, "📄", dateStr);
                  }
                })}
              </>
            ))}
          </div>

          <div className="mt-2">
            {renderFolder("projects", "projects", undefined, (
              <>
                {sortedProj.map((p) => {
                  const { sections } = splitSubsections(p.detail || "");
                  const dateStr = formatRange(p.start, p.end);
                  if (sections.length > 0 && !isSinglePageEntry(p.id)) {
                    return renderFolder(p.id, `proj-${p.id}`, dateStr, (
                      <>
                        {renderFileTreeItem("overview.md", { type: "project", id: p.id, file: "overview.md" }, "📄")}
                        {sections.map(s => 
                          renderFileTreeItem(`${s.slug}.md`, { type: "project", id: p.id, file: `${s.slug}.md` }, "📝")
                        )}
                      </>
                    ));
                  } else {
                    return renderFileTreeItem(`${p.id}.md`, { type: "project", id: p.id, file: "overview.md" }, "📄", dateStr);
                  }
                })}
              </>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Editor Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[color:var(--bg)]">
        {/* Editor Header / Breadcrumbs */}
        <header className="relative z-50 h-[52px] flex items-center px-4 border-b border-[color:var(--border)] bg-[color:var(--bg-elev)]/50 backdrop-blur-md shrink-0">
          <button 
            className="md:hidden mr-4 p-1.5 rounded hover:bg-white/10 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Toggle Sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="mono text-xs text-[color:var(--fg-muted)] tracking-wide flex items-center gap-2 overflow-hidden">
             <span className="opacity-50">#</span>
             <span className="truncate">{getBreadcrumb()}</span>
          </div>
        </header>

        {/* Editor Content Area */}
        <div ref={editorScrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
           {/* Line numbers illusion background */}
           <div className="absolute left-0 top-0 bottom-0 w-12 bg-[color:var(--bg-elev)]/30 border-r border-[color:var(--border)]/50 pointer-events-none hidden lg:block"></div>

           <div ref={editorContentRef} data-edge-nav="ide" className="lg:pl-12 pb-24">
             {renderContent()}
           </div>
        </div>

        {/* Pull-to-navigate between sidebar files. Listens on the editor
            scroll container, transforms the inner content, commits by
            switching activeFile (no route change). */}
        <EdgeNav
          prev={prevNeighbor}
          next={nextNeighbor}
          scrollContainer={editorScrollRef.current}
          transformTarget={editorContentRef.current}
          onCommit={(dir) => {
            const target = dir === "prev" ? prevEntry : nextEntry;
            if (target) setActiveFile(target.file);
          }}
        />
      </main>
    </div>
  );
}