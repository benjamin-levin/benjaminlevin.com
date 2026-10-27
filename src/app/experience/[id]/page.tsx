import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadExperiences, formatRange } from "@/lib/data";
import { EXPERIENCE_HIGHLIGHTS } from "@/lib/highlights";
import { getDetailNeighbors } from "@/lib/detailOrder";
import { DetailPage } from "@/components/DetailPage";
import { isSinglePageEntry } from "@/lib/detailPresentation";

type Params = Promise<{ id: string }>;

export function generateStaticParams() {
  return loadExperiences().map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const exp = loadExperiences().find((e) => e.id === id);
  if (!exp) return {};
  const bullet = exp.bullets[0]?.text.replace(/[*`]/g, "").slice(0, 200) ?? "";
  return {
    title: `${exp.company} — ${exp.role} · Benjamin Levin`,
    description: bullet,
  };
}

export default async function ExperiencePage({ params }: { params: Params }) {
  const { id } = await params;
  const exp = loadExperiences().find((e) => e.id === id);
  if (!exp) notFound();

  const eyebrowParts = [exp.team, exp.location].filter(Boolean) as string[];
  const eyebrow = [...eyebrowParts, exp.role].filter(Boolean).join(" · ");

  return (
    <DetailPage
      backHref="/#experience"
      backLabel="Back to experience"
      eyebrow={eyebrow}
      title={exp.company}
      subtitle={null}
      meta={formatRange(exp.start, exp.end)}
      tags={exp.tags}
      url={exp.url}
      singlePage={isSinglePageEntry(exp.id)}
      highlights={EXPERIENCE_HIGHLIGHTS[exp.id] ?? []}
      detail={exp.detail}
      media={exp.media}
      neighbors={getDetailNeighbors(`/experience/${exp.id}`)}
    />
  );
}
