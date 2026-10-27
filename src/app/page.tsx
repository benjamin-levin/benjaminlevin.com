import { loadAll } from "@/lib/data";
import { IdePortfolio } from "@/components/IdePortfolio";

export default function Home() {
  // loadAll uses better-sqlite3, which only runs on the server.
  // By keeping this a Server Component, we fetch data on the server
  // and pass it down to the interactive Client Component.
  const { personal, education, skills, experiences, projects } = loadAll();

  return (
    <main id="top" className="h-[100dvh] bg-[color:var(--bg)] overflow-hidden flex flex-col">
      <div className="flex-1 relative">
        <IdePortfolio
          personal={personal}
          experiences={experiences}
          projects={projects}
          skills={skills}
          education={education}
        />
      </div>
    </main>
  );
}