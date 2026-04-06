"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface TagData {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface AdminTagBadgeProps {
  tag: TagData;
  isAdmin: boolean;
  onDelete?: (tagId: string) => void;
  variant: "card-link" | "filter-button";
  isSelected?: boolean;
  onClick?: () => void;
}

export function AdminTagBadge({
  tag,
  isAdmin,
  onDelete,
  variant,
  isSelected = false,
  onClick,
}: AdminTagBadgeProps) {
  const t = useTranslations("admin.tags");
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (!isAdmin) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setShowDelete(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (!isAdmin) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowDelete(false);
  };

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/tags/${tag.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete tag");
      }

      onDelete?.(tag.id);
      setShowDelete(false);
      toast.success(t("deleted"));
    } catch {
      toast.error(t("deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {variant === "card-link" ? (
        <Link
          href={`/tags/${tag.slug}`}
          prefetch={false}
          className="px-1.5 py-0.5 rounded text-[10px] hover:opacity-80 transition-opacity"
          style={{ backgroundColor: tag.color + "15", color: tag.color }}
        >
          {tag.name}
        </Link>
      ) : (
        <button
          type="button"
          className="px-2 py-0.5 text-[11px] rounded border transition-colors"
          style={
            isSelected
              ? { backgroundColor: tag.color, color: "white", borderColor: tag.color }
              : { borderColor: tag.color + "40", color: tag.color }
          }
          onClick={onClick}
        >
          {tag.name}
        </button>
      )}

      {isAdmin && showDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={t("deleteHoverHint")}
          title={t("deleteHoverHint")}
          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:opacity-90 disabled:opacity-70"
        >
          {isDeleting ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <X className="h-2.5 w-2.5" />}
        </button>
      )}
    </div>
  );
}
