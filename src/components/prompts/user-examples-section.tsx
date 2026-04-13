"use client";

import { useState, useCallback } from "react";
import { MediaPreviewWithExamples } from "./media-preview-with-examples";
import { AddExampleDialog } from "./add-example-dialog";

interface UserExamplesSectionProps {
  mediaUrl?: string | null;
  title: string;
  type: string;
  promptId: string;
  isLoggedIn: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  structuredFormat?: string | null;
}

export function UserExamplesSection({
  mediaUrl,
  title,
  type,
  promptId,
  isLoggedIn,
  currentUserId,
  isAdmin,
  structuredFormat,
}: UserExamplesSectionProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleExampleAdded = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const supportsExamples =
    type === "IMAGE" || type === "VIDEO" || type === "SKILL" || Boolean(structuredFormat);

  if (!supportsExamples) {
    return null;
  }

  const renderAddButton = useCallback((asThumbnail: boolean) => (
    <AddExampleDialog
      promptId={promptId}
      promptType={type}
      isLoggedIn={isLoggedIn}
      onExampleAdded={handleExampleAdded}
      asThumbnail={asThumbnail}
      supportsTextExample={Boolean(structuredFormat)}
    />
  ), [promptId, type, isLoggedIn, handleExampleAdded, structuredFormat]);

  return (
    <MediaPreviewWithExamples
      mediaUrl={mediaUrl}
      title={title}
      type={type}
      promptId={promptId}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      refreshTrigger={refreshTrigger}
      renderAddButton={supportsExamples ? renderAddButton : undefined}
      supportsTextExample={Boolean(structuredFormat)}
    />
  );
}
