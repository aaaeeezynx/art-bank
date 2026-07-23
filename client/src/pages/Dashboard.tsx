import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Archive,
  ArrowUpRight,
  CalendarClock,
  PackageCheck,
  PackageOpen,
  Pause,
  Wrench,
} from "lucide-react";
import { useLocation } from "wouter";

const STAT_CARDS = [
  { key: "在庫", label: "在庫", icon: PackageCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "出庫", label: "出庫", icon: PackageOpen, color: "text-red-500", bg: "bg-red-50" },
  { key: "暫放", label: "暫放", icon: Pause, color: "text-sky-500", bg: "bg-sky-50" },
  { key: "借展", label: "借展", icon: Archive, color: "text-violet-500", bg: "bg-violet-50" },
  { key: "修護", label: "修護", icon: Wrench, color: "text-amber-500", bg: "bg-amber-50" },
];

const OP_TYPE_COLORS: Record<string, string> = {
  入庫: "bg-emerald-100 text-emerald-700",
  出庫: "bg-red-100 text-red-700",
  暫放: "bg-sky-100 text-sky-700",
  借展: "bg-violet-100 text-violet-700",
  修護: "bg-amber-100 text-amber-700",
  歸庫: "bg-teal-100 text-teal-700",
  位置變更: "bg-gray-100 text-gray-700",
};

function formatDate(val: unknown): string {
  if (!val) return "—";
  try {
    const d = new Date(val as string);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return String(val);
  }
}

function daysUntil(val: unknown): number {
  if (!val) return 999;
  const d = new Date(val as string);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: recentOps, isLoading: opsLoading } = trpc.operation.recent.useQuery({ limit: 8 });
  const { data: expiringLoans, isLoading: loansLoading } = trpc.dashboard.expiringLoans.useQuery({ days: 30 });

  return (
    <div className="fade-in space-y-8">
      {/* 頁面標題 */}
      <div>
        <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-1">Art Bank Collection</p>
        <h1 className="page-title">典藏總覽</h1>
      </div>

      {/* 統計卡片 */}
      <div>
        <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">作品狀態統計</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 總件數 */}
          <button
            type="button"
            onClick={() => setLocation("/artworks")}
            className="elegant-card p-4 col-span-2 sm:col-span-3 lg:col-span-1 flex items-center gap-4 text-left cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Archive className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">典藏總件數</p>
              {statsLoading ? (
                <Skeleton className="h-7 w-12 mt-1" />
              ) : (
                <p className="text-2xl font-light" style={{ fontFamily: "var(--font-serif)" }}>
                  {stats?.total ?? 0}
                </p>
              )}
            </div>
          </button>

          {STAT_CARDS.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => setLocation(`/artworks/status/${card.key}`)}
              className="elegant-card p-4 flex items-center gap-3 text-left cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className={`w-9 h-9 rounded-full ${card.bg} flex items-center justify-center shrink-0`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-8 mt-1" />
                ) : (
                  <p className="text-xl font-light" style={{ fontFamily: "var(--font-serif)" }}>
                    {(stats as any)?.[card.key] ?? 0}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 近期操作 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground">近期操作紀錄</h2>
            <button
              onClick={() => setLocation("/artworks")}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              查看全部 <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="elegant-card overflow-hidden">
            {opsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !recentOps?.length ? (
              <div className="p-8 text-center text-muted-foreground text-sm">尚無操作紀錄</div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentOps.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/artworks/${op.artworkId}`)}
                  >
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${OP_TYPE_COLORS[op.operationType] ?? "bg-gray-100 text-gray-700"}`}>
                      {op.operationType}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{op.artworkNo}</p>
                      {op.operatorName && (
                        <p className="text-xs text-muted-foreground">{op.operatorName}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(op.operationDate)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 借展到期提醒 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
            <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground">借展即將到期</h2>
          </div>
          <div className="elegant-card overflow-hidden">
            {loansLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !expiringLoans?.length ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>30 天內無到期借展件</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {expiringLoans.map((aw) => {
                  const days = daysUntil(aw.loanEndDate);
                  const urgent = days <= 7;
                  return (
                    <div
                      key={aw.id}
                      className="px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/artworks/${aw.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{aw.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{aw.loanOrganization ?? "—"}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${urgent ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                          {days} 天
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        到期：{formatDate(aw.loanEndDate)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
