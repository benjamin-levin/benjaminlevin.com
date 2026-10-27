import type { ProjectMedia as ProjectMediaType } from "@/lib/data";

export function ProjectMedia({ media }: { media: ProjectMediaType }) {
  return (
    <div className="mt-5">
      {media.hero && (
        <div className="rounded-lg overflow-hidden border border-white/[.08] bg-black">
          {media.hero.type === "video" ? (
            <video
              src={media.hero.src}
              poster={media.hero.poster}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="w-full h-auto block"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.hero.src} alt="" className="w-full h-auto block" />
          )}
        </div>
      )}
      {media.gallery && media.gallery.length > 0 && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          {media.gallery.map((item, i) => (
            <figure
              key={i}
              className="rounded-lg overflow-hidden border border-white/[.06] bg-black"
            >
              {item.type === "video" ? (
                <video
                  src={item.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  className="w-full h-auto block"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.src} alt={item.caption ?? ""} className="w-full h-auto block" />
              )}
              {item.caption && (
                <figcaption className="mono text-[10px] uppercase tracking-wider text-[color:var(--fg-dim)] px-3 py-1.5 border-t border-white/[.06]">
                  {item.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
