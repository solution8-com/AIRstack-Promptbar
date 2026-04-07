"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GuideContent } from "@/components/guides/guide-content";

export function GuideForm() {
  const t = useTranslations("prompts");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  function handlePreview() {
    setShowPreview(true);
    // Smoothly scroll to the preview block after it renders
    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: description || undefined,
            content,
            type: "GUIDE",
            tagIds: [],
            isPrivate: false,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.message || "Failed to create guide");
          return;
        }

        const created = await res.json();
        router.push(`/guides/${created.id}`);
      } catch {
        setError("An unexpected error occurred. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="guide-title">{t("guideTitle")}</Label>
        <Input
          id="guide-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("guideTitle")}
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="guide-description">{t("guideDescription")}</Label>
        <Input
          id="guide-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("guideDescription")}
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="guide-content">{t("promptContent")}</Label>
        <Textarea
          id="guide-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("guideMarkdownPlaceholder")}
          required
          rows={20}
          className="font-mono text-sm resize-y"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending || !title || !content}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("createGuide")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={!content}
          className="gap-1.5"
        >
          <Eye className="h-4 w-4" />
          {t("guidePreview")}
        </Button>
      </div>

      {showPreview && content && (
        <div ref={previewRef} className="mt-8 border-t pt-8">
          <h2 className="text-lg font-semibold mb-4">{t("guidePreview")}</h2>
          {title && <h1 className="text-3xl font-bold tracking-tight mb-4">{title}</h1>}
          {description && (
            <p className="text-lg text-muted-foreground mb-6">{description}</p>
          )}
          <GuideContent content={content} />
        </div>
      )}
    </form>
  );
}
