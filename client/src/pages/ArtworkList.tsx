import { trpc } from "@/lib/trpc";
import { StatusBadge, MediumBadge, MEDIUM_LABELS } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PackagePlus, Search, SlidersHorizontal, MapPin, FileDown, CheckSquare, Square } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { keepPreviousData } from "@tanstack/react-query";

const STATUS_OPTIONS = ["all", "在庫", "出庫", "暫放", "借展", "修護"];
const MEDIUM_OPTIONS = ["all", "canvas", "paper", "wood", "metal", "textile", "mixed"];

function formatDate(val: unknown): string {
  if (!val) return "—";
  try {
    const d = new Date(val as string);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return String(val);
  }
}

export default function ArtworkList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [medium, setMedium] = useState("all");
  const [collector, setCollector] = useState("");
  const [warehouseNo, setWarehouseNo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // debounce 文字輸入，避免每按一字就觸發查詢閃爍
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedCollector, setDebouncedCollector] = useState("");
  const [debouncedWarehouseNo, setDebouncedWarehouseNo] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCollector(collector), 300);
    return () => clearTimeout(t);
  }, [collector]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedWarehouseNo(warehouseNo), 300);
    return () => clearTimeout(t);
  }, [warehouseNo]);

  const { data: artworks, isLoading } = trpc.artwork.list.useQuery(
    {
      search: debouncedSearch || undefined,
      status: status !== "all" ? status : undefined,
      medium: medium !== "all" ? medium : undefined,
      collector: debouncedCollector || undefined,
      warehouseNo: debouncedWarehouseNo || undefined,
    },
    { placeholderData: keepPreviousData }
  );

  // 勾選功能
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const currentVisibleIds = useMemo(
    () => (artworks ?? []).map((aw) => aw.id),
    [artworks]
  );
  const allVisibleSelected = currentVisibleIds.length > 0 && currentVisibleIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 一鍵全部勾選：勾選目前搜尋結果所有作品
  const selectAllVisible = () => {
    if (allVisibleSelected) {
      // 取消勾選目前可見的
      setSelectedIds((prev) => {
        const next = new Set(prev);
        currentVisibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        currentVisibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // 匯出勾選作品為清單 PDF
  const handleExportList = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("請先勾選要匯出的作品");
      return;
    }
    setIsExporting(true);
    try {
      const res = await fetch("/api/export/list-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "匯出失敗");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "作品清單.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`已匯出 ${ids.length} 件作品清單`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "匯出失敗");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fade-in space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-1">Collection</p>
          <h1 className="page-title">典藏作品</h1>
        </div>
        <Button
          onClick={() => setLocation("/artworks/new")}
          size="sm"
          className="shrink-0 gap-2"
        >
          <PackagePlus className="w-4 h-4" />
          作品入庫
        </Button>
      </div>

      {/* 搜尋列 */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜尋作品編號、名稱、作者、藏家…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-accent" : "bg-card"}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="flex gap-2 flex-wrap slide-up">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-32 bg-card">
                <SelectValue placeholder="狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                {STATUS_OPTIONS.slice(1).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={medium} onValueChange={setMedium}>
              <SelectTrigger className="w-36 bg-card">
                <SelectValue placeholder="媒材" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部媒材</SelectItem>
                {MEDIUM_OPTIONS.slice(1).map((m) => (
                  <SelectItem key={m} value={m}>{MEDIUM_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="收藏家"
              value={collector}
              onChange={(e) => setCollector(e.target.value)}
              className="w-40 bg-card"
            />

            <Input
              placeholder="庫房編號"
              value={warehouseNo}
              onChange={(e) => setWarehouseNo(e.target.value)}
              className="w-32 bg-card"
            />

            {(status !== "all" || medium !== "all" || search || collector || warehouseNo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(""); setStatus("all"); setMedium("all"); setCollector(""); setWarehouseNo(""); }}
                className="text-muted-foreground"
              >
                清除篩選
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 結果統計 + 批次操作 */}
      {!isLoading && artworks && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">
            共 <span className="font-medium text-foreground">{artworks.length}</span> 件作品
            {selectedIds.size > 0 && (
              <span className="ml-2">· 已選 <span className="font-medium text-foreground">{selectedIds.size}</span> 件</span>
            )}
          </p>
          {artworks.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllVisible}
                className="gap-1.5"
              >
                {allVisibleSelected ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                {allVisibleSelected ? "取消全選" : "全選"}
              </Button>
              {selectedIds.size > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelection} className="text-muted-foreground">
                  清除選取
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleExportList}
                disabled={isExporting || selectedIds.size === 0}
                className="gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                {isExporting ? "匯出中…" : "匯出清單 PDF"}
              </Button>
            </div>
          )}
        </div>
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
          <p className="text-muted-foreground text-sm">
            {search || status !== "all" || medium !== "all" ? "找不到符合條件的作品" : "尚無典藏作品，請先進行入庫"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {artworks.map((aw, idx) => (
            <div
              key={aw.id}
              className={`elegant-card px-4 py-3 cursor-pointer hover:border-border transition-all ${selectedIds.has(aw.id) ? "border-primary bg-primary/5" : ""}`}
              style={{ animationDelay: `${idx * 30}ms` }}
              onClick={() => setLocation(`/artworks/${aw.id}`)}
            >
              <div className="flex items-start gap-3">
                {/* 勾選框 */}
                <div
                  className="shrink-0 cursor-pointer self-center"
                  onClick={(e) => { e.stopPropagation(); toggleSelect(aw.id); }}
                >
                  <Checkbox
                    checked={selectedIds.has(aw.id)}
                  />
                </div>

                {/* 作品縮圖 / 媒材代碼 */}
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
