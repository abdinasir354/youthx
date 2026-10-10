import { getTranslations } from "next-intl/server";
import { getStories } from "@/lib/data/cms";
import { pageMetadata } from "@/lib/seo";
import { Container, PageIntro } from "@/components/site/basics";
import { StoryCard } from "@/components/site/cards";

export async function generateMetadata() {
  const t = await getTranslations("site");
  return pageMetadata({ title: t("storiesTitle"), description: t("storiesIntro"), path: "/stories" });
}

/** Real youth stories, published only with the person's consent. */
export default async function StoriesPage() {
  const [stories, t] = await Promise.all([getStories(), getTranslations("site")]);
  return (
    <>
      <PageIntro eyebrow={t("storiesEyebrow")} title={t("storiesTitle")} description={t("storiesIntro")} />
      <Container className="py-8 sm:py-10">
        {stories.length ? (
          <div data-reveal-stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{stories.map((s) => <StoryCard key={s.id} story={s} />)}</div>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-muted-foreground">{t("noStories")}</p>
        )}
      </Container>
    </>
  );
}
