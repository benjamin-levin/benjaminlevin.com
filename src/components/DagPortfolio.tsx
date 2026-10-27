"use client";
import { useState, useMemo, useEffect } from "react";
import { ForceGraph, type GraphNode, type GraphLink } from "@/components/ForceGraph";
import { PreviewCard } from "@/components/PreviewCard";
import { EXPERIENCE_HIGHLIGHTS, PROJECT_HIGHLIGHTS } from "@/lib/highlights";

function formatRange(start: string, end: string): string {
  const e = /^(present|current|now)$/i.test(end.trim()) ? "Present" : end.trim();
  return `${start} → ${e}`;
}

// Type definitions to mirror what we get from loadAll
type Personal = any;
type Experience = any;
type Project = any;
type SkillCat = any;
type Education = any;

interface DagPortfolioProps {
  personal: Personal;
  experiences: Experience[];
  projects: Project[];
  skills: SkillCat[];
  education: Education[];
}

export function DagPortfolio({ personal, experiences, projects, skills, education }: DagPortfolioProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  // Transform data into GraphNodes and GraphLinks
  const { nodes, links } = useMemo(() => {
    const n: GraphNode[] = [];
    const l: GraphLink[] = [];

    // Root node
    n.push({ id: "root", type: "root", label: personal.name, group: 0, radius: 40 });

    // Categories
    const categories = [
      { id: "cat-exp", label: "Experience", type: "category" as const },
      { id: "cat-proj", label: "Projects", type: "category" as const },
      { id: "cat-skills", label: "Skills", type: "category" as const },
      { id: "cat-edu", label: "Education", type: "category" as const },
    ];

    categories.forEach(cat => {
      n.push({ id: cat.id, type: cat.type, label: cat.label, group: 1, radius: 25 });
      l.push({ source: "root", target: cat.id, value: 1 });
    });

    // Experiences
    experiences.forEach(exp => {
      n.push({ id: `exp-${exp.id}`, type: "experience", label: exp.company, group: 2, radius: 10, data: exp });
      l.push({ source: "cat-exp", target: `exp-${exp.id}`, value: 1 });
    });

    // Projects
    projects.forEach(proj => {
      n.push({ id: `proj-${proj.id}`, type: "project", label: proj.title, group: 3, radius: 10, data: proj });
      l.push({ source: "cat-proj", target: `proj-${proj.id}`, value: 1 });
    });

    // Skills (Groups)
    skills.forEach(skillCat => {
      const catId = `skillcat-${skillCat.name.replace(/\s+/g, '-').toLowerCase()}`;
      n.push({ id: catId, type: "skill", label: skillCat.name, group: 4, radius: 12, data: skillCat });
      l.push({ source: "cat-skills", target: catId, value: 1 });
      
      // Leaf skills (Optional: makes graph very dense. Let's just keep categories for now)
      /*
      skillCat.skills.forEach((s: any) => {
        const sId = `skill-${s.name.replace(/\s+/g, '-').toLowerCase()}`;
        n.push({ id: sId, type: "skill", label: s.name, group: 4, radius: 5 });
        l.push({ source: catId, target: sId, value: 1 });
      });
      */
    });

    // Education
    education.forEach(edu => {
      n.push({ id: `edu-${edu.id}`, type: "education", label: edu.school, group: 5, radius: 10, data: edu });
      l.push({ source: "cat-edu", target: `edu-${edu.id}`, value: 1 });
    });

    return { nodes: n, links: l };
  }, [personal, experiences, projects, skills, education]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedNode(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderModalContent = () => {
    if (!selectedNode || !selectedNode.data) return null;
    const { type, data } = selectedNode;

    if (type === "experience") {
      const exp = data as Experience;
      return (
        <PreviewCard
          href={`/experience/${exp.id}`}
          eyebrow={exp.team ?? exp.location ?? undefined}
          title={`${exp.company} — ${exp.role}`}
          meta={formatRange(exp.start, exp.end)}
          tags={exp.tags || []}
          highlights={EXPERIENCE_HIGHLIGHTS[exp.id] ?? []}
          hasMedia={!!exp.media}
        />
      );
    }

    if (type === "project") {
      const proj = data as Project;
      return (
        <PreviewCard
          href={`/project/${proj.id}`}
          eyebrow={proj.role ?? undefined}
          title={proj.title}
          meta={formatRange(proj.start, proj.end)}
          tags={proj.tags || []}
          highlights={PROJECT_HIGHLIGHTS[proj.id] ?? []}
          hasMedia={!!proj.media}
        />
      );
    }

    if (type === "skill") {
      const cat = data as SkillCat;
      return (
        <div className="rounded-xl border border-white/[.06] bg-[color:var(--bg-card)] p-6 backdrop-blur-md">
          <h3 className="mono text-xs uppercase tracking-[0.2em] text-[color:var(--accent-3)] mb-4 font-bold">
            {cat.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {cat.skills.map((s: any) => (
              <span
                key={s.name}
                className="text-[13px] px-3 py-1.5 rounded-full border border-white/[.05] bg-white/[.02] text-[color:var(--fg)]"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (type === "education") {
      const edu = data as Education;
      return (
        <div className="rounded-xl border border-white/[.06] bg-[color:var(--bg-card)] p-6 backdrop-blur-md">
           <div className="mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent-3)] mb-3 font-semibold">
              {edu.in_progress ? "In progress" : "Completed"} · {edu.date}
            </div>
            <h3 className="text-xl font-bold leading-tight text-[color:var(--fg)] mb-1">{edu.kind}</h3>
            <p className="text-sm text-[color:var(--fg-muted)] mb-4">{edu.school_full}</p>
            <div className="flex flex-wrap gap-3 text-xs font-medium text-[color:var(--fg-dim)]">
              {edu.gpa && <span>GPA <span className="text-[color:var(--fg)]">{edu.gpa}</span></span>}
              {edu.honors && <span>· {edu.honors}</span>}
            </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="relative w-full h-[100vh] overflow-hidden">
      <ForceGraph nodes={nodes} links={links} onNodeClick={setSelectedNode} />

      {/* Intro Overlay Text */}
      <div className="absolute bottom-10 left-10 pointer-events-none max-w-md opacity-60">
         <h1 className="text-2xl font-bold tracking-tighter gradient-text">{personal.name}</h1>
         <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
           Drag nodes to explore. Click on glowing outer nodes to view details.
         </p>
      </div>

      {/* Modal Overlay */}
      {selectedNode && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setSelectedNode(null)}
            aria-label="Close modal"
          />
          <div className="relative z-10 w-full max-w-2xl transform transition-all animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setSelectedNode(null)}
              className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
}