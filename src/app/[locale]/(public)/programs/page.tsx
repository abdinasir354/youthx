import { getTranslations } from "next-intl/server";
import { getPage, getProgramCategories, getPrograms } from "@/lib/data/cms";
import { Sections } from "@/components/cms/sections";
import { Container, PageIntro, SectionHeading } from "@/components/site/basics";
import { ProgramCard } from "@/components/site/cards";
import { cmsPageMetadata } from "@/components/site/cms-page";

export async function generateMetadata() {
  return cmsPageMetadata("programs", "Programs");
}

/**
 * Programs: an optional CMS hero (Admin → Pages → Programs), then every published program,
 * then the page's other CMS sections (stories, call to action…).
 */
export default async function ProgramsPage() {
  const [page, programs, categories, t] = await Promise.all([getPage("programs"), getPrograms(), getProgramCategories(), getTranslations("site")]);
  const sections = page?.sections ?? [];
  const hero = sections[0]?.type === "hero" ? sections[0] : null;
  const rest = hero ? sections.slice(1) : sections;
  const used = categories.filter((c) => programs.some((p) => p.category_id === c.id));

  return (
    <>
      {hero ? <Sections sections={[hero]} /> : <PageIntro eyebrow={t("programsEyebrow")} title={page?.page.title ?? t("programsTitle")} description={page?.page.description} />}

      <section id="programs" aria-labelledby="programs-heading" className="relative scroll-mt-24 overflow-hidden bg-white py-10 sm:py-12">
        <Container className="relative">
          <SectionHeading eyebrow={t("ourPillars")} heading={hero ? page?.page.title ?? t("programsTitle") : t("allPrograms")} intro={hero ? page?.page.description : null} id="programs-heading" />
          {used.length > 1 && (
            <nav aria-label={t("categories")} className="-mt-3 mb-7 flex flex-wrap gap-2">
              {used.map((c) => (
                <a key={c.id} href={`#cat-${c.slug}`} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition duration-300 ease-soft hover:-translate-y-0.5 hover:border-secondary/40 hover:bg-white">
                  {c.name}
                </a>
              ))}
            </nav>
          )}
          {programs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-lg text-muted-foreground">{t("noPrograms")}</p>
          ) : (
            <div data-reveal-stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((p, i) => {
                const firstOfCategory = programs.findIndex((x) => x.category_id === p.category_id) === i;
                const cat = categories.find((c) => c.id === p.category_id);
                return (
                  <div key={p.id} id={firstOfCategory && cat ? `cat-${cat.slug}` : undefined} className="scroll-mt-28">
                    <ProgramCard program={p} index={i} />
                  </div>
                );
              })}
            </div>
          )}
        </Container>
      </section>

      <Sections sections={rest} />
    </>
  );
}
