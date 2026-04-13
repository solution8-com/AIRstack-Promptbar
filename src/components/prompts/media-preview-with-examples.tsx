"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ImageIcon, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AudioPlayer } from "./audio-player";
import { UserExamplesGallery } from "./user-examples-gallery";

interface UserExample {
  id: string;
  mediaUrl: string | null;
  content: string | null;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    avatar: string | null;
  };
}

interface MediaPreviewWithExamplesProps {
  mediaUrl?: string | null;
  title: string;
  type: string;
  promptId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  refreshTrigger?: number;
  renderAddButton?: (asThumbnail: boolean) => React.ReactNode;
  supportsTextExample?: boolean;
}

export function MediaPreviewWithExamples({
  mediaUrl,
  title,
  type,
  promptId,
  currentUserId,
  isAdmin,
  refreshTrigger = 0,
  renderAddButton,
  supportsTextExample,
}: MediaPreviewWithExamplesProps) {
  const t = useTranslations("prompts");
  const [hasError, setHasError] = useState(false);
  const [selectedExample, setSelectedExample] = useState<UserExample | null>(null);

  const handleSelectExample = (example: UserExample | null) => {
    setSelectedExample(example);
    setHasError(false);
  };

  const displayUrl = selectedExample?.mediaUrl || mediaUrl;
  const displayContent = selectedExample?.content;
  const displayTitle = selectedExample?.comment || title;
  const isShowingExample = !!selectedExample;

  const supportsExamples =
    type === "IMAGE" || type === "VIDEO" || type === "SKILL" || Boolean(supportsTextExample);

  if (hasError && !isShowingExample) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{t("mediaLoadError")}</span>
        </div>
        <div className="rounded-lg overflow-hidden border bg-muted/30 h-48 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("mediaUnavailable")}</p>
          </div>
        </div>
        {supportsExamples && (
          <UserExamplesGallery
            promptId={promptId}
            promptType={type}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onSelectExample={handleSelectExample}
            refreshTrigger={refreshTrigger}
            renderAddButton={renderAddButton}
          />
        )}
      </div>
    );
  }

  const showTextPreview = Boolean(displayContent);
  const hasMediaPreview = Boolean(displayUrl) && !showTextPreview;

  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden border bg-muted/30 relative">
        {showTextPreview ? (
          <div className="p-6 prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed min-h-[250px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent || ""}</ReactMarkdown>
          </div>
        ) : type === "VIDEO" && hasMediaPreview ? (
          <video
            src={displayUrl || undefined}
            controls
            className="w-full max-h-[500px] object-contain block"
            onError={() => setHasError(true)}
          />
        ) : type === "AUDIO" && hasMediaPreview ? (
          <AudioPlayer
            src={displayUrl || undefined}
            onError={() => setHasError(true)}
          />
        ) : hasMediaPreview ? (
          <a
            href={displayUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative"
          >
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-110"
              style={{ backgroundImage: `url(${displayUrl})` }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl || undefined}
              alt={displayTitle}
              className="relative w-full max-h-[500px] object-contain block"
              onError={() => setHasError(true)}
            />
          </a>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="h-8 w-8 text-muted-foreground/70" />
            <span>{t("selectExampleToPreview")}</span>
          </div>
        )}
        {isShowingExample && selectedExample && (
          <div className="absolute bottom-2 left-2 right-2 px-3 py-2 rounded-lg bg-black/70 backdrop-blur-sm">
            <p className="text-xs text-white/90">
              <span className="font-medium">@{selectedExample.user.username}</span>
              {selectedExample.comment && (
                <span className="ml-2 text-white/70">{selectedExample.comment}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {supportsExamples && (
        <UserExamplesGallery
          promptId={promptId}
          promptType={type}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onSelectExample={handleSelectExample}
          refreshTrigger={refreshTrigger}
          renderAddButton={renderAddButton}
        />
      )}
    </div>
  );
}
