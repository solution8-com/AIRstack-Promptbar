"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Pencil } from "lucide-react";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  const t = useTranslations("prompts");
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {t("markdownPreview")}
        </label>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "edit" | "preview")}>
          <TabsList className="h-8">
            <TabsTrigger value="edit" className="text-xs gap-1.5 px-2.5 h-6">
              <Pencil className="h-3 w-3" />
              {t("edit")}
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs gap-1.5 px-2.5 h-6">
              <Eye className="h-3 w-3" />
              {t("preview")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {mode === "preview" && (
        <div className="rounded-md border bg-muted/30 p-4 min-h-[200px] prose prose-sm dark:prose-invert max-w-none">
          {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">{t("noContentToPreview")}</p>
          )}
        </div>
      )}
    </div>
  );
}
