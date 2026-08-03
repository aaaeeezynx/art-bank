import { trpc } from "@/lib/trpc";
import { StatusBadge, MediumBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  MapPin,
  PackageOpen,
  Pause,
  Archive,
  Wrench,
  PackageCheck,
  MoveRight,
  Clock,
  User,
  FileText,
  ImageIcon,
  FileType,
  FileDown,
  Pencil,
} from "lucide-react";
import { CATEGORY_OPTIONS, CONDITION_SECTIONS } from "./ArtworkEntry";

type OperationType = "出庫" | "暫放" | "借展" | "修護" | "歸庫" | "位置變更";

type ArtworkPhotoItem = {
  id: number;
  artworkId: number;
  photoType: "artwork" | "condition";
  dataUrl: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string | Date;
};

type ArtworkDetailData = {
  id: number;
  artworkNo: string;
  title: string;
  titleNotProvided: number;
  artist: string;
  medium: string;
  mediumCode: string;
  status: string;
  locationId: number | null;
  locationCode: string | null;
  entryDate: string | Date;
  era: string | Date | null;
  registrar: string | null;
  receiveDate: string | Date | null;
  registrationDate: string | Date | null;
  dimensionLength: string | null;
  dimensionWidth: string | null;
  dimensionHeight: string | null;
  category: unknown;
  categoryOther: string | null;
  support: string | null;
  mediaDescription: string | null;
  conditionData: Record<string, { items: string[]; note: string }> | null;
  thumbnail: string | null;
  notes: string | null;
  loanStartDate: string | Date | null;
  loanEndDate: string | Date | null;
  loanOrganization: string | null;
  conservationInstitution: string | null;
  conservationDueDate: string | Date | null;
  photos: ArtworkPhotoItem[];
};

const OP_BUTTONS: { type: OperationType; label: string; icon: React.ElementType; color: string; allowedStatus: string[] }[] = [
  { type: "出庫", label: "出庫", icon: PackageOpen, color: "text-red-500", allowedStatus: ["在庫", "暫放"] },
  { type: "暫放", label: "暫放", icon: Pause, color: "text-sky-500", allowedStatus: ["在庫"] },
  { type: "借展", label: "借展", icon: Archive, color: "text-violet-500", allowedStatus: ["在庫", "暫放"] },
  { type: "修護", label: "修護", icon: Wrench, color: "text-amber-500", allowedStatus: ["在庫", "暫放", "出庫"] },
  { type: "歸庫", label: "歸庫", icon: PackageCheck, color: "text-emerald-500", allowedStatus: ["出庫", "暫放", "借展", "修護"] },
  { type: "位置變更", label: "位置變更", icon: MoveRight, color: "text-primary", allowedStatus: ["在庫"] },
];

const OP_TYPE_COLORS: Record<string, string> = {
  入庫: "bg-emerald-100 text-emerald-700 border-emerald-200",
  出庫: "bg-red-100 text-red-700 border-red-200",
  暫放: "bg-sky-100 text-sky-700 border-sky-200",
  借展: "bg-violet-100 text-violet-700 border-violet-200",
  修護: "bg-amber-100 text-amber-700 border-amber-200",
  歸庫: "bg-teal-100 text-teal-700 border-teal-200",
  位置變更: "bg-gray-100 text-gray-700 border-gray-200",
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm flex-1">{value || "—"}</span>
    </div>
  );
}

export default function ArtworkDetail({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const [opType, setOpType] = useState<OperationType | null>(null);
  const [opForm, setOpForm] = useState({
    operationDate: new Date().toISOString().split("T")[0] ?? "",
    notes: "",
    loanStartDate: "",
    loanEndDate: "",
    loanOrganization: "",
    conservationInstitution: "",
    conservationDueDate: "",
    outReason: "",
    toLocationId: "",
  });

  const utils = trpc.useUtils();
  const { data: rawArtwork, isLoading } = trpc.artwork.getById.useQuery({ id });
  const artwork = rawArtwork as ArtworkDetailData | undefined;
  const { data: operations, isLoading: opsLoading } = trpc.operation.listByArtwork.useQuery({ artworkId: id });
  const { data: locations } = trpc.storage.list.useQuery();

  const operate = trpc.artwork.operate.useMutation({
    onSuccess: () => {
      toast.success("操作成功");
      setOpType(null);
      utils.artwork.getById.invalidate({ id });
      utils.operation.listByArtwork.invalidate({ artworkId: id });
      utils.dashboard.stats.invalidate();
    },
    onError: (err) => toast.error(`操作失敗：${err.message}`),
  });

  const selectedLocation = locations?.find((l) => l.id === Number(opForm.toLocationId));

  const handleOpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opType) return;
    if ((opType === "歸庫" || opType === "位置變更") && !opForm.toLocationId) {
      toast.error("請選擇目標架位");
      return;
    }
    operate.mutate({
      artworkId: id,
      operationType: opType,
      operationDate: opForm.operationDate,
      notes: opForm.notes || undefined,
      loanStartDate: opForm.loanStartDate || undefined,
      loanEndDate: opForm.loanEndDate || undefined,
      loanOrganization: opForm.loanOrganization || undefined,
      conservationInstitution: opForm.conservationInstitution || undefined,
      conservationDueDate: opForm.conservationDueDate || undefined,
      outReason: opForm.outReason || undefined,
      toLocationId: opForm.toLocationId ? Number(opForm.toLocationId) : undefined,
      toLocationCode: selectedLocation?.locationCode,
    });
  };

  const setOp = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setOpForm((f) => ({ ...f, [key]: e.target.value }));

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-muted-foreground">找不到此作品</p>
        <Button variant="ghost" onClick={() => setLocation("/artworks")} className="mt-4">
          返回列表
        </Button>
      </div>
    );
  }

  const availableOps = OP_BUTTONS.filter((op) => op.allowedStatus.includes(artwork.status));

  return (
    <div className="fade-in max-w-2xl mx-auto space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation("/artworks")}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-0.5">Artwork Detail</p>
          <h1 className="page-title text-xl truncate">{artwork.title}</h1>
        </div>
        <StatusBadge status={artwork.status as any} />
      </div>

      {/* 編輯與匯出按鈕 */}
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          className="gap-2 flex-1"
          onClick={() => setLocation(`/artworks/${id}/edit`)}
        >
          <Pencil className="w-4 h-4" />
          編輯藏品
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 flex-1"
          onClick={() => {
            window.location.href = `/api/export/word/${id}`;
          }}
        >
          <FileType className="w-4 h-4" />
          輸出 Word 檔
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 flex-1"
          onClick={() => {
            window.location.href = `/api/export/pdf/${id}`;
          }}
        >
          <FileDown className="w-4 h-4" />
          輸出 PDF 檔
        </Button>
      </div>

      {/* 作品編號與位置 */}
      <div className="elegant-card p-4 flex items-center gap-4">
        {artwork.thumbnail ? (
          <img
            src={artwork.thumbnail}
            alt={artwork.title}
            className="w-14 h-14 rounded-xl object-cover shrink-0 bg-muted"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <span className="text-sm font-mono font-semibold text-secondary-foreground">
              {artwork.mediumCode}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-mono text-base font-medium tracking-wider">{artwork.artworkNo}</p>
          {artwork.locationCode ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {artwork.locationCode}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">尚未指定位置</p>
          )}
        </div>
        <MediumBadge medium={artwork.medium} />
      </div>

      {/* 作品資訊 */}
      <div className="elegant-card p-5">
        <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3">作品資訊</h2>
        <InfoRow label="作品名稱" value={<span className="font-medium" style={{ fontFamily: "var(--font-serif)" }}>{artwork.title as string}</span>} />
        <InfoRow label="作者" value={artwork.artist} />
        <InfoRow label="入庫日期" value={formatDate(artwork.entryDate)} />
        {artwork.notes && <InfoRow label="備註" value={artwork.notes} />}

        {/* 借展資訊 */}
        {artwork.status === "借展" && (
          <>
            <div className="mt-3 pt-3 border-t border-border/40">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">借展資訊</p>
            </div>
            <InfoRow label="借展單位" value={artwork.loanOrganization} />
            <InfoRow label="借展起日" value={formatDate(artwork.loanStartDate)} />
            <InfoRow label="借展迄日" value={formatDate(artwork.loanEndDate)} />
          </>
        )}

        {/* 修護資訊 */}
        {artwork.status === "修護" && (
          <>
            <div className="mt-3 pt-3 border-t border-border/40">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">修護資訊</p>
            </div>
            <InfoRow label="修護機構" value={artwork.conservationInstitution} />
            <InfoRow label="預計完成" value={formatDate(artwork.conservationDueDate)} />
          </>
        )}
      </div>

      {/* 一般資料 General Data */}
      <div className="elegant-card p-5">
        <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3">A. 一般資料 General Data</h2>
        <InfoRow label="作品年代" value={formatDate(artwork.era)} />
        <InfoRow label="檢視員" value={artwork.registrar} />
        <InfoRow label="收件日期" value={formatDate(artwork.receiveDate)} />
        <InfoRow label="檢視日期" value={formatDate(artwork.registrationDate)} />
        <InfoRow
          label="作品尺寸"
          value={
            artwork.dimensionLength || artwork.dimensionWidth || artwork.dimensionHeight
              ? `${artwork.dimensionLength ?? "—"} × ${artwork.dimensionWidth ?? "—"} × ${artwork.dimensionHeight ?? "—"} cm`
              : "—"
          }
        />
        <InfoRow label="類別" value={<CategoryValue artwork={artwork} />} />
        <InfoRow label="基底材" value={artwork.support} />
        <InfoRow label="媒材" value={artwork.mediaDescription} />
      </div>

      {/* 典藏品現狀 Art Object Condition */}
      {artwork.conditionData && (
        <div className="elegant-card p-5">
          <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3">B. 典藏品現狀 Art Object Condition</h2>
          <ConditionValue conditionData={artwork.conditionData as Record<string, { items: string[]; note: string }>} />
        </div>
      )}

      {/* 照片 Photos */}
      {artwork.photos && artwork.photos.length > 0 && (
        <div className="elegant-card p-5">
          <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3 flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5" /> 照片 Photos
          </h2>
          <PhotoSection photos={artwork.photos.filter((p) => p.photoType === "artwork")} title="作品照片" />
          <PhotoSection photos={artwork.photos.filter((p) => p.photoType === "condition")} title="狀態照片" />
        </div>
      )}

      {/* 操作按鈕 */}
      {availableOps.length > 0 && (
        <div className="elegant-card p-5">
          <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3">作品操作</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {availableOps.map((op) => (
              <button
                key={op.type}
                onClick={() => {
                  setOpType(op.type);
                  setOpForm({
                    operationDate: new Date().toISOString().split("T")[0] ?? "",
                    notes: "",
                    loanStartDate: "",
                    loanEndDate: "",
                    loanOrganization: "",
                    conservationInstitution: "",
                    conservationDueDate: "",
                    outReason: "",
                    toLocationId: "",
                  });
                }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border/60 hover:bg-accent/50 hover:border-border transition-all"
              >
                <op.icon className={`w-5 h-5 ${op.color}`} />
                <span className="text-xs font-medium">{op.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 操作歷史時間軸 */}
      <div className="elegant-card p-5">
        <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">操作歷史</h2>
        {opsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !operations?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">尚無操作紀錄</p>
        ) : (
          <div className="space-y-0">
            {operations.map((op, idx) => (
              <div key={op.id} className="timeline-item pb-4">
                {/* 時間軸節點 */}
                <div className={`timeline-dot ${OP_TYPE_COLORS[op.operationType] ?? "bg-muted"} border`}>
                  <span className="text-[8px] font-bold leading-none">
                    {op.operationType.charAt(0)}
                  </span>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 ml-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${OP_TYPE_COLORS[op.operationType] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                      {op.operationType}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(op.operationDate)}
                    </span>
                  </div>

                  {op.operatorName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <User className="w-3 h-3" />
                      {op.operatorName}
                    </p>
                  )}

                  {/* 詳細資訊 */}
                  <div className="space-y-0.5">
                    {op.loanOrganization && (
                      <p className="text-xs text-foreground/80">借展單位：{op.loanOrganization}</p>
                    )}
                    {op.loanStartDate && op.loanEndDate && (
                      <p className="text-xs text-foreground/80">
                        借展期間：{formatDate(op.loanStartDate)} ～ {formatDate(op.loanEndDate)}
                      </p>
                    )}
                    {op.conservationInstitution && (
                      <p className="text-xs text-foreground/80">修護機構：{op.conservationInstitution}</p>
                    )}
                    {op.conservationDueDate && (
                      <p className="text-xs text-foreground/80">預計完成：{formatDate(op.conservationDueDate)}</p>
                    )}
                    {op.outReason && (
                      <p className="text-xs text-foreground/80">出庫原因：{op.outReason}</p>
                    )}
                    {(op.fromLocationCode || op.toLocationCode) && (
                      <p className="text-xs text-foreground/80 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {op.fromLocationCode && <span>{op.fromLocationCode}</span>}
                        {op.fromLocationCode && op.toLocationCode && <span>→</span>}
                        {op.toLocationCode && <span>{op.toLocationCode}</span>}
                      </p>
                    )}
                    {op.notes && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                        <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                        {op.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 操作 Dialog */}
      <Dialog open={!!opType} onOpenChange={(open) => !open && setOpType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-serif)" }}>
              {opType} 操作
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleOpSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>操作日期 <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={opForm.operationDate}
                onChange={setOp("operationDate")}
                className="bg-background"
              />
            </div>

            {/* 出庫 */}
            {opType === "出庫" && (
              <div className="space-y-1.5">
                <Label>出庫原因</Label>
                <Input
                  value={opForm.outReason}
                  onChange={setOp("outReason")}
                  placeholder="請輸入出庫原因"
                  className="bg-background"
                />
              </div>
            )}

            {/* 借展 */}
            {opType === "借展" && (
              <>
                <div className="space-y-1.5">
                  <Label>借展單位 <span className="text-destructive">*</span></Label>
                  <Input
                    value={opForm.loanOrganization}
                    onChange={setOp("loanOrganization")}
                    placeholder="請輸入借展單位"
                    className="bg-background"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>借展起日</Label>
                    <Input type="date" value={opForm.loanStartDate} onChange={setOp("loanStartDate")} className="bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>借展迄日</Label>
                    <Input type="date" value={opForm.loanEndDate} onChange={setOp("loanEndDate")} className="bg-background" />
                  </div>
                </div>
              </>
            )}

            {/* 修護 */}
            {opType === "修護" && (
              <>
                <div className="space-y-1.5">
                  <Label>修護機構</Label>
                  <Input
                    value={opForm.conservationInstitution}
                    onChange={setOp("conservationInstitution")}
                    placeholder="請輸入修護機構名稱"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>預計完成日</Label>
                  <Input type="date" value={opForm.conservationDueDate} onChange={setOp("conservationDueDate")} className="bg-background" />
                </div>
              </>
            )}

            {/* 歸庫 / 位置變更 */}
            {(opType === "歸庫" || opType === "位置變更") && (
              <div className="space-y-1.5">
                <Label>目標架位 <span className="text-destructive">*</span></Label>
                <Select
                  value={opForm.toLocationId}
                  onValueChange={(v) => setOpForm((f) => ({ ...f, toLocationId: v }))}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="選擇目標架位" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        <span className="font-mono mr-2">{loc.locationCode}</span>
                        {loc.description && <span className="text-muted-foreground text-xs">{loc.description}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLocation && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedLocation.warehouseNo} 號庫房・{selectedLocation.zone} 區・第 {selectedLocation.shelfNo} 架
                  </p>
                )}
              </div>
            )}

            {/* 備註 */}
            <div className="space-y-1.5">
              <Label>備註</Label>
              <Textarea
                value={opForm.notes}
                onChange={setOp("notes")}
                placeholder="輸入備註說明…"
                rows={2}
                className="bg-background resize-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpType(null)}>
                取消
              </Button>
              <Button type="submit" disabled={operate.isPending}>
                {operate.isPending ? "處理中…" : "確認"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryValue({ artwork }: { artwork: { category: unknown; categoryOther: string | null } }) {
  const cats = Array.isArray(artwork.category) ? (artwork.category as string[]) : [];
  if (cats.length === 0) return "—";
  const labels = cats.map((key) => {
    if (key === "others") {
      return artwork.categoryOther ? `其他 Others（${artwork.categoryOther}）` : "其他 Others";
    }
    return CATEGORY_OPTIONS.find((c) => c.key === key)?.label ?? key;
  });
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label, i) => (
        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border/60">
          {label}
        </span>
      ))}
    </div>
  );
}

function ConditionValue({ conditionData }: { conditionData: Record<string, { items: string[]; note: string }> }) {
  return (
    <div className="space-y-4">
      {CONDITION_SECTIONS.map((section) => {
        const data = conditionData[section.key];
        if (!data || (data.items.length === 0 && !data.note)) return null;
        const optionMap = Object.fromEntries(section.options.map((o) => [o.key, o.label]));
        return (
          <div key={section.key} className="border-b border-border/40 last:border-0 pb-3 last:pb-0">
            <p className="text-sm font-medium mb-1.5">{section.title}</p>
            {data.items.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {data.items.map((key) => (
                  <span key={key} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {optionMap[key] ?? key}
                  </span>
                ))}
              </div>
            )}
            {data.note && <p className="text-xs text-muted-foreground">備註：{data.note}</p>}
          </div>
        );
      })}
    </div>
  );
}

function PhotoSection({ photos, title }: { photos: { id: number; dataUrl: string; caption: string | null }[]; title: string }) {
  if (photos.length === 0) return null;
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs text-muted-foreground mb-2">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="space-y-1">
            <div className="aspect-square rounded-lg border border-border overflow-hidden bg-muted">
              <img src={photo.dataUrl} alt={photo.caption ?? ""} className="w-full h-full object-cover" />
            </div>
            {photo.caption && <p className="text-xs text-muted-foreground truncate">{photo.caption}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
