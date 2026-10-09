import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { Container } from "@/components/site/basics";
import { UnsubscribeButton } from "@/components/forms/unsubscribe-button";

export async function generateMetadata() {
  const t = await getTranslations("footer");
  return pageMetadata({ title: t("unsubscribeTitle"), path: "/newsletter/unsubscribe", noindex: true });
}

export default async function UnsubscribePage({ searchParams }: PageProps<"/[locale]/newsletter/unsubscribe">) {
  const t = await getTranslations("footer");
  return (
    <Container narrow className="py-20 text-center">
      <h1 className="text-3xl font-bold text-secondary">{t("unsubscribeTitle")}</h1>
      <p className="mt-3 text-muted-foreground">{t("unsubscribeText")}</p>
      <Suspense fallback={null}>
        <TokenButton searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function TokenButton({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { token } = await searchParams;
  return <UnsubscribeButton token={typeof token === "string" ? token : ""} />;
}
