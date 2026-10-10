import { getTranslations } from "next-intl/server";
import { getResources } from "@/lib/data/cms";
import { pageMetadata } from "@/lib/seo";
import { Container, PageIntro } from "@/components/site/basics";
import { ResourceCard } from "@/components/site/cards";

export async function generateMetadata() {
  const t = await getTranslations("site");
  return pageMetadata({ title: t("resourcesTitle"), description: t("resourcesIntro"), path: "/resources" });
}

export default async function ResourcesPage() {
  const [resources, t] = await Promise.all([getResources(), getTranslations("site")]);
  const groups = new Map<string, typeof resources>();
  for (const r of resources) {
    const key = r.category?.name ?? t("otherResources");
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return (
    <>
      <PageIntro eyebrow={t("resourcesEyebrow")} title={t("resourcesTitle")} description={t("resourcesIntro")} />
      <Container className="space-y-10 py-8 sm:py-10">
        {resources.length === 0 && <p className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-muted-foreground">{t("noResources")}</p>}
        {[...groups.entries()].map(([name, items]) => (
          <section key={name} aria-label={name}>
            {groups.size > 1 && <h2 className="mb-6 text-2xl font-semibold text-secondary">{name}</h2>}
            <div data-reveal-stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((r) => <ResourceCard key={r.id} resource={r} />)}</div>
          </section>
        ))}
      </Container>
    </>
  );
}
