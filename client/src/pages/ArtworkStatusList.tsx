import { trpc } from "@/lib/trpc";
import { StatusBadge, MEDIUM_LABELS } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowLeft, Search } from "lucide-react";
import { useLocation } from "wouter";

const VALID_STATUSES = ["在庫", "出庫", "暫放", "借展", "修護"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

const STATUS_DESC: Record<ValidStatus, string> = {
  在庫: "目前存放於庫房中的作品",
  出庫: "已出庫的作品",
  暫放: "暫時放置中的作品",
  借展: "外借展覽中的作品",
  修護: "修護處理中的作品",
};

export default function ArtworkStatusList({ status }: { status: string }) {
  const [, setLocation] = useLocation();
  const isValid = (VALID_STATUSES as readonly string[]).includes(status);

  const { data: artworks, isLoading } = trpc.artwork.list.useQuery({
    status: isValid ? status : undefined,
  });

  if (!isValid) {
    return (
      <div className="fade-in max-w-2xl mx-auto text-center py-16">
        <p className="text-muted-foreground">未知的作品狀態：{status}</p>
        <button
          onClick={() => setLocation("/")}
          className="mt-4 text-sm text-primary hover:underline"
        >
          返回儀表板
        </button>
      </div>
    );
  }

  const typedStatus = status as ValidStatus;

  return (
    <div className="fade-in space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="w-3 h-3" />
            返回儀表板
          </button>
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-1">
            Status Filter
          </p>
          <h1 className="page-title flex items-center gap-3">
            {typedStatus}
            <StatusBadge status={typedStatus} />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{STATUS_DESC[typedStatus]}</p>
        </div>
      </div>

      {/* 結果統計 */}
      {!isLoading && artworks && (
        <p className="text-xs text-muted-foreground">
          共 <span className="font-medium text-foreground">{artworks.length}</span> 件作品
        </p>
      )}

      {/* 作品列表 */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : !artworks?.length ? (
        <div className="elegant-card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">目前沒有「{typedStatus}」狀態的作品</p>
        </div>
      ) : (
        <div className="space-y-2">
          {artworks.map((aw, idx) => (
            <div
              key={aw.id}
              className="elegant-card px-4 py-3 cursor-pointer hover:border-border transition-all"
              style={{ animationDelay: `${idx * 30}ms` }}
              onClick={() => setLocation(`/artworks/${aw.id}`)}
            >
              <div className="flex items-start gap-3">
                {/* 縮圖 / 媒材代碼 */}
                {aw.thumbnail ? (
                  <img
                    src={aw.thumbnail}
                    alt={aw.title}
                    className="w-12 h-12 rounded-lg object-cover shrink-0 mt-0.5 bg-muted"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-mono font-medium text-secondary-foreground">
                      {aw.mediumCode}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" style={{ fontFamily: "var(--font-serif)" }}>
                        {aw.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{aw.artist}</p>
                    </div>
                    <StatusBadge status={aw.status as any} className="shrink-0" />
                  </div>

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                      {aw.artworkNo}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {MEDIUM_LABELS[aw.medium] ?? aw.medium}
                    </span>
                    {aw.locationCode && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {aw.locationCode}
                      </span>
                    )}
                    {aw.collector && (
                      <span className="text-[11px] text-muted-foreground">
                        藏家：{aw.collector}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
