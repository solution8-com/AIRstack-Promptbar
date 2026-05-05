"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GuideContent } from "@/components/guides/guide-content";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Contributor {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
}

interface GuideEditFormProps {
  guideId: string;
  initialData: {
    title: string;
    description: string;
    content: string;
    categoryId?: string;
    tagIds: string[];
    contributors: Contributor[];
  };
  categories: Category[];
  tags: Tag[];
}

export function GuideEditForm({
  guideId,
  initialData,
  categories,
  tags,
}: GuideEditFormProps) {
  const t = useTranslations("prompts");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [content, setContent] = useState(initialData.content);
  const [categoryId, setCategoryId] = useState(initialData.categoryId || "");
  const [selectedTagIds, setSelectedTagIds] = useState(initialData.tagIds);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const contentExceedsLimit = initialData.content.length > 20000;
  const maxLength = contentExceedsLimit ? undefined : 20000;

  function handlePreview() {
    setShowPreview(true);
    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function handleTagToggle(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!contentExceedsLimit && content.length > 20000) {
      setError("Guide content cannot exceed 20,000 characters");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/prompts/${guideId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: description || undefined,
            content,
            type: "GUIDE",
            categoryId: categoryId || undefined,
            tagIds: selectedTagIds,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.message || "Failed to update guide");
          return;
        }

        router.push(`/guides/${guideId}`);
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
          maxLength={maxLength}
          className="font-mono text-sm resize-y"
        />
        {content.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {content.length} / {contentExceedsLimit ? "∞" : "20,000"} characters
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="guide-category">{t("category")}</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="guide-category">
            <SelectValue placeholder={t("selectCategory")} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("tags")}</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleTagToggle(tag.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedTagIds.includes(tag.id)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending || !title || !content}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("saveGuide")}
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
