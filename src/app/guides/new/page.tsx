import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { GuideForm } from "@/components/guides/guide-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("prompts");
  return {
    title: t("createGuideTitle"),
    description: t("createGuideDescription"),
  };
}

export default async function NewGuidePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/guides");
  }

  const t = await getTranslations("prompts");

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t("createGuideTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("createGuideDescription")}</p>
      </div>
      <GuideForm />
    </div>
  );
}
