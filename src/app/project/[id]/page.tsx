import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadProjects, formatRange } from "@/lib/data";
import { PROJECT_HIGHLIGHTS } from "@/lib/highlights";
import { getDetailNeighbors } from "@/lib/detailOrder";
import { DetailPage } from "@/components/DetailPage";

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return loadProjects().map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const project = loadProjects().find((p) => p.id === id);
  if (!project) return {};
  const bullet = project.bullets[0]?.text.replace(/[*`]/g, "").slice(0, 200) ?? "";
  return {
    title: `${project.title} · Benjamin Levin`,
    description: bullet,
  };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { id } = await params;
  const project = loadProjects().find((p) => p.id === id);
  if (!project) notFound();

  return (
    <DetailPage
      backHref="/#projects"
      backLabel="Back to projects"
      eyebrow={project.role ?? undefined}
      title={project.title}
      subtitle={null}
      meta={formatRange(project.start, project.end)}
      tags={project.tags}
      url={project.url}
      highlights={PROJECT_HIGHLIGHTS[project.id] ?? []}
      detail={project.detail}
      media={project.media}
      neighbors={getDetailNeighbors(`/project/${project.id}`)}
    />
  );
}
