"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { WandSparkles, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface IterateVersion {
  title: string;
  changeNote: string | null;
}

interface IterateButtonProps {
  isEnabled: boolean;
  content: string;
  versions: IterateVersion[];
  comments?: string[];
}

const MAX_PROMPT_LENGTH = 20000;
const PROMPT_SAFETY_MARGIN = 250;
const MAX_CONTENT_LENGTH = 11000;
const MAX_VERSIONS_LENGTH = 4500;
const MAX_COMMENTS_LENGTH = 4500;
const MAX_VERSION_ITEMS = 20;
const MAX_COMMENT_ITEMS = 30;

function randomMatrixColumn(rows = 16): string {
  const chars = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+-<>[]{}";
  return Array.from({ length: rows }, () => chars[Math.floor(Math.random() * chars.length)]).join("\n");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  if (maxLength <= 16) {
    return text.slice(0, maxLength);
  }
  return `${text.slice(0, maxLength - 16)}\n...[truncated]`;
}

export function IterateButton({ isEnabled, content, versions, comments }: IterateButtonProps) {
  const t = useTranslations("prompts");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [matrixTick, setMatrixTick] = useState(0);

  const matrixColumns = useMemo(() => {
    return Array.from({ length: 14 }, () => randomMatrixColumn(14 + (matrixTick % 5)));
  }, [matrixTick]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const animation = setInterval(() => setMatrixTick((prev) => prev + 1), 120);
    return () => clearInterval(animation);
  }, [isLoading]);

  if (!isEnabled) {
    return null;
  }

  const systemPrompt = `Generate an improved starting prompt based on the context below.
Return only the improved prompt text.
Preserve intent while improving clarity, structure, and usefulness.`;
  const defaultIterateError = t.has("iterateError")
    ? t("iterateError")
    : tCommon("error");
  const iterateButtonLabel = t.has("iterateButton") ? t("iterateButton") : t("run");
  const iterateTitle = t.has("iterateTitle") ? t("iterateTitle") : iterateButtonLabel;
  const iterateDescription = t.has("iterateDescription")
    ? t("iterateDescription")
    : t("description");
  const iterateLoading = t.has("iterateLoading") ? t("iterateLoading") : tCommon("loading");
  const iterateResult = t.has("iterateResult") ? t("iterateResult") : t("outputType");
  const iterateCopy = t.has("iterateCopy") ? t("iterateCopy") : tCommon("copy");

  const prompt = (() => {
    const safeContent = truncateText(content || "", MAX_CONTENT_LENGTH);
    const versionLines = versions
      .slice(0, MAX_VERSION_ITEMS)
      .map((version) => `- ${version.title}: ${version.changeNote || "No change note"}`)
      .join("\n");
    const commentLines = (comments || [])
      .map((comment) => comment?.trim())
      .filter((comment): comment is string => Boolean(comment))
      .slice(0, MAX_COMMENT_ITEMS)
      .map((comment) => `- ${comment}`)
      .join("\n");

    const safeVersions = versionLines.length > 0
      ? truncateText(versionLines, MAX_VERSIONS_LENGTH)
      : "- None";
    const safeComments = commentLines.length > 0
      ? truncateText(commentLines, MAX_COMMENTS_LENGTH)
      : "- None";

    const composedPrompt = [
      "Current prompt content:",
      safeContent,
      "",
      "Prompt version history (title + changeNote):",
      safeVersions,
      "",
      "Prompt comments:",
      safeComments,
    ].join("\n");

    return truncateText(composedPrompt, MAX_PROMPT_LENGTH - PROMPT_SAFETY_MARGIN);
  })();

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setResult("");
    try {
      const response = await fetch("/api/ai/github-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemPrompt,
          model: "openai/gpt-5-nano",
        }),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        throw new Error(
          responseBody?.error ||
            defaultIterateError
        );
      }

      const data = await response.json();
      if (!data?.result || typeof data.result !== "string") {
        throw new Error(defaultIterateError);
      }
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : defaultIterateError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success(tCommon("copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(tCommon("failedToCopy"));
    }
  };

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      void handleGenerate();
    }
  };

  return (
    <div className="mt-4">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <WandSparkles className="h-4 w-4" />
            {iterateButtonLabel}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{iterateTitle}</DialogTitle>
            <DialogDescription>
              {iterateDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {isLoading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{iterateLoading}</span>
                </div>
                <div className="h-52 overflow-hidden rounded-md border bg-black p-3">
                  <div className="grid grid-cols-7 gap-2 text-[10px] leading-3 text-green-400 sm:grid-cols-14">
                    {matrixColumns.map((column, index) => (
                      <pre key={`${index}-${matrixTick}`} className="m-0 animate-pulse whitespace-pre">
                        {column}
                      </pre>
                    ))}
                  </div>
                </div>
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {iterateResult}
                </p>
                <div className="max-h-[50vh] overflow-y-auto rounded-md border bg-muted/20 p-3">
                  <pre className="whitespace-pre-wrap text-sm">{result}</pre>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tCommon("close")}
            </Button>
            {!isLoading && !!result && (
              <Button onClick={handleCopy} className="gap-1.5">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {iterateCopy}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
