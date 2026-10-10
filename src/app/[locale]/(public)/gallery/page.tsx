import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Images } from "lucide-react";
import { getPage } from "@/lib/data/cms";
import { Sections } from "@/components/cms/sections";
import { Container, PageIntro } from "@/components/site/basics";
import { cmsPageMetadata } from "@/components/site/cms-page";

export async function generateMetadata() {
  return cmsPageMetadata("gallery", "Gallery");
}

type Photo = { url: string; alt: string; caption: string | null };
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

/**
 * Gallery: every "Gallery" section of Admin → Pages → Gallery becomes an album
 * (masonry wall of photos). Other section types on that page render below.
 */
export default async function GalleryPage() {
  const [page, t] = await Promise.all([getPage("gallery"), getTranslations("site")]);
  const sections = page?.sections ?? [];
  const albums = sections
    .filter((s) => s.type === "gallery")
    .map((s) => ({
      id: s.id,
      heading: str(s.data.heading),
      intro: str(s.data.intro),
      photos: ((Array.isArray(s.data.images) ? s.data.images : []) as Record<string, unknown>[])
        .filter((p) => str(p.url))
        .map((p) => ({ url: str(p.url)!, alt: str(p.alt) ?? "", caption: str(p.caption) }) as Photo),
    }))
    .filter((a) => a.photos.length);
  const others = sections.filter((s) => s.type !== "gallery");

  return (
    <>
      <PageIntro eyebrow={t("galleryEyebrow")} title={page?.page.title ?? t("galleryTitle")} description={page?.page.description ?? t("galleryIntro")} />
      <section className="bg-white">
        <Container className="py-8 sm:py-10">
          {albums.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center">
              <Images className="mx-auto size-10 text-secondary/40" aria-hidden />
              <p className="heading mt-4 text-2xl text-ink">{t("galleryEmptyTitle")}</p>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">{t("galleryEmptyText")}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {albums.map((a) => (
                <section key={a.id} aria-label={a.heading ?? t("galleryTitle")}>
                  {(a.heading || a.intro) && (
                    <div data-reveal className="mb-6">
                      {a.heading && <h2 className="heading text-2xl text-ink sm:text-3xl">{a.heading}</h2>}
                      {a.intro && <p className="mt-2 max-w-2xl text-muted-foreground">{a.intro}</p>}
                    </div>
                  )}
                  <ul data-reveal-stagger className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
                    {a.photos.map((p, i) => (
                      <li key={`${p.url}-${i}`} className="break-inside-avoid">
                        <figure className="group overflow-hidden rounded-xl bg-muted transition duration-[400ms] ease-soft hover:-translate-y-1 hover:shadow-md">
                          <a href={p.url} target="_blank" rel="noopener" className="block overflow-hidden" aria-label={p.alt || p.caption || t("openPhoto")}>
                            <Image src={p.url} alt={p.alt} width={800} height={600} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="h-auto w-full transition-transform duration-700 ease-soft group-hover:scale-[1.04]" loading={i < 3 ? "eager" : "lazy"} />
                          </a>
                          {p.caption && <figcaption className="px-4 py-3 text-sm text-muted-foreground">{p.caption}</figcaption>}
                        </figure>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Container>
      </section>
      <Sections sections={others} />
    </>
  );
}
