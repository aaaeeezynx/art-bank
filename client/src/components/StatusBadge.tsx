import { cn } from "@/lib/utils";

export type ArtworkStatus = "在庫" | "出庫" | "暫放" | "借展" | "修護";

const STATUS_DOTS: Record<ArtworkStatus, string> = {
  在庫: "bg-emerald-500",
  出庫: "bg-red-400",
  暫放: "bg-sky-400",
  借展: "bg-violet-400",
  修護: "bg-amber-400",
};

interface StatusBadgeProps {
  status: ArtworkStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn("status-badge", `status-${status}`, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOTS[status])} />
      {status}
    </span>
  );
}

export const MEDIUM_LABELS: Record<string, string> = {
  canvas: "畫布作品",
  paper: "紙質作品",
  wood: "木質作品",
  metal: "金屬作品",
  textile: "織品作品",
  mixed: "複合媒材",
};

export const MEDIUM_CODES: Record<string, string> = {
  canvas: "CW",
  paper: "PW",
  wood: "WW",
  metal: "MW",
  textile: "TW",
  mixed: "MM",
};

interface MediumBadgeProps {
  medium: string;
  className?: string;
}

export function MediumBadge({ medium, className }: MediumBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border border-border/50",
        className
      )}
    >
      <span className="text-muted-foreground mr-1 font-mono text-[10px]">{MEDIUM_CODES[medium]}</span>
      {MEDIUM_LABELS[medium] ?? medium}
    </span>
  );
}
