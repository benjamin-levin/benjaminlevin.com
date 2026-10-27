// Authoritative site copy. All user-facing strings on the website that
// AREN'T in `data/candidate/` live here. Edit this file, save, refresh —
// no other code touches needed. Restart the dev server (or rebuild Docker)
// for changes to take effect.
//
// Resume content (experience / project / skill / education) is NOT here —
// it's in `data/candidate/`. The chatbot's content knowledge is generated
// from there into `BEN_CONTEXT.md`.

export const COPY = {
  hero: {
    // Paragraph that appears under the name on the home page.
    descriptor:
      "AI/ML engineer, robotics generalist, PRSM AI co-founder, and Product Owner at BeHuman. Governed agent systems, local voice assistants, and model-evaluation research. Python · C++ · Rust.",
    cta: {
      email: "Email Ben",
      linkedin: "LinkedIn",
      // Resume is dynamic — paste a JD or URL and the ai-assistant pipeline
      // tailors a resume to it. See `Hero.tsx` + `app/api/resume/generate`.
      resume: "Resume Generator",
    },
  },

  about: {
    eyebrow: "About",
    title: "Where engineering judgment ships work.",
    description:
      "Ben builds and evaluates AI systems, from PRSM’s governed software agents and Unify’s local voice runtime to controlled experiments on deception probes and long-context inference. His robotics and quantitative-systems work brings the same focus: identify the constraint, measure the tradeoffs, and verify what actually works.",
    stats: [
      {
        label: "Years building",
        value: "6+",
        hint:
          "2018 → present, spanning surgical imaging, lab automation, humanoid robotics, quant trading, and multi-agent AI.",
      },
      {
        label: "Languages",
        value: "Py · C++ · Rust",
        hint:
          "Plus TypeScript, C, JS, MATLAB, Bash. Lower-level when latency or precision matters; higher-level for breadth.",
      },
      {
        label: "Now",
        value: "PRSM AI · BeHuman",
        hint:
          "Co-leading PRSM AI and owning BeHuman’s patient interface and chart-analysis product work.",
      },
    ],
  },

  sections: {
    experience: {
      eyebrow: "Experience",
      title: "Work",
      description:
        "Reverse-chronological. Each card opens a dedicated page with architecture, decisions, and what shipped vs. what didn't.",
    },
    projects: {
      eyebrow: "Projects",
      title: "Personal & extracurricular",
      description:
        "Long-running personal projects where the interesting engineering lives outside the day-job perimeter.",
    },
    skills: {
      eyebrow: "Skills",
      title: "What's in the toolbox",
      description:
        "Organized by domain. Tools are listed because they've been used in production / on actual hardware / against real data — not because the install command was run once.",
    },
    education: {
      eyebrow: "Education",
      title: "Schools",
      description: undefined as string | undefined,
    },
  },

  nav: {
    items: [
      { id: "about", label: "About" },
      { id: "experience", label: "Experience" },
      { id: "projects", label: "Projects" },
      { id: "skills", label: "Skills" },
      { id: "education", label: "Education" },
    ],
    brand: "ben.levin",
  },

  chatbot: {
    // The greeting that appears when the FAB is first opened.
    greeting:
      "Hi — I'm Ben's portfolio assistant. Ask me anything about his experience, projects, or how to get in touch.",
    // Suggestion pills in the empty chat state.
    suggestions: [
      "What's PRSM?",
      "Tell me about Ben's work at Tesla",
      "What did Ben do at Formulatrix?",
      "What's the most technically interesting project?",
      "How can I contact Ben?",
    ],
    // Visible label on the FAB and chat header.
    title: "Ask about Ben",
    // System prompt the model sees on every message. The literal string
    // `{{CONTEXT}}` is replaced by BEN_CONTEXT.md content at request time.
    persona: `You are Ben Levin's personal portfolio assistant on benjaminlevin.com. Visitors are recruiters, hiring managers, founders, and engineers evaluating Ben for senior or founding-level roles in AI/ML, robotics, or quant.

Use the BEN_CONTEXT below as your sole source of truth. Answer naturally, in third-person about Ben ("Ben built X", "Ben led Y") — you are the assistant, not Ben.

RULES:
- Be specific. Cite real projects (PRSM, Sovlscan, Formulatrix carousel, Tesla Optimus, En Passant, etc.) with concrete details from the context.
- Be concise. 2–4 short paragraphs unless the visitor asks for depth.
- Never mention "context files", "documentation", or "my rules". Just speak as if you know Ben.
- Never invent projects, employers, dates, numbers, or technologies that aren't in the context. If asked about something not in your knowledge, say "I don't have detail on that — best to ask Ben directly via the contact links."
- For contact: surface email and LinkedIn freely. Ben's phone is intentionally not in your knowledge — don't speculate; redirect to email/LinkedIn.
- For Sovlscan strategy specifics (alpha, hyperparameters, regime taxonomy): the context explicitly withholds these. Say so plainly — "Ben withholds the specifics; engineering tradeoffs are fair game in interview."
- Stay on Ben's professional background. Politely deflect off-topic requests.

BEN_CONTEXT:
<BEN_CONTEXT>
{{CONTEXT}}
</BEN_CONTEXT>`,
  },
} as const;

export type SiteCopy = typeof COPY;
