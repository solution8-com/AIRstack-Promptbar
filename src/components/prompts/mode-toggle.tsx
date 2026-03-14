"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ModeToggleProps {
  currentMode: "prompt" | "internal-hack";
}

export function ModeToggle({ currentMode }: ModeToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("prompts");
  
  const handleToggle = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (checked) {
      params.set("mode", "internal-hack");
    } else {
      params.delete("mode");
    }
    
    const queryString = params.toString();
    router.push(`/prompts/new${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <div className="flex items-center justify-between mb-6 p-4 rounded-lg border bg-card">
      <div className="space-y-0.5">
        <Label htmlFor="mode-toggle" className="text-base font-semibold cursor-pointer">
          {currentMode === "internal-hack" ? t("createInternalHack") : t("create")}
        </Label>
        <p className="text-sm text-muted-foreground">
          {currentMode === "internal-hack" 
            ? t("createInternalHackDescription")
            : t("createPromptDescription")}
        </p>
      </div>
      <Switch
        id="mode-toggle"
        checked={currentMode === "internal-hack"}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}
