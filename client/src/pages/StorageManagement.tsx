import { trpc } from "@/lib/trpc";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Warehouse, MapPin, Pencil, CheckCircle, Circle } from "lucide-react";

type LocationForm = {
  warehouseNo: string;
  zone: string;
  shelfNo: string;
  levelNo: string;
  description: string;
};

const EMPTY_FORM: LocationForm = {
  warehouseNo: "",
  zone: "",
  shelfNo: "",
  levelNo: "",
  description: "",
};

function buildPreviewCode(f: LocationForm): string {
  if (!f.warehouseNo || !f.zone || !f.shelfNo || !f.levelNo) return "???-?-??-??";
  const shelf = f.shelfNo.padStart(2, "0");
  const level = f.levelNo.padStart(2, "0");
  return `${f.warehouseNo}-${f.zone.toUpperCase()}-${shelf}-${level}`;
}

export default function StorageManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<LocationForm>(EMPTY_FORM);

  const utils = trpc.useUtils();
  const { data: locations, isLoading } = trpc.storage.list.useQuery();

  const createLocation = trpc.storage.create.useMutation({
    onSuccess: () => {
      toast.success("架位建立成功");
      setShowDialog(false);
      utils.storage.list.invalidate();
    },
    onError: (err) => toast.error(`建立失敗：${err.message}`),
  });

  const updateLocation = trpc.storage.update.useMutation({
    onSuccess: () => {
      toast.success("架位更新成功");
      setShowDialog(false);
      utils.storage.list.invalidate();
    },
    onError: (err) => toast.error(`更新失敗：${err.message}`),
  });

  type LocationItem = NonNullable<typeof locations>[number];
  const handleOpen = (loc?: LocationItem) => {
    if (loc) {
      setEditId(loc.id);
      setForm({
        warehouseNo: loc.warehouseNo,
        zone: loc.zone,
        shelfNo: loc.shelfNo,
        levelNo: loc.levelNo,
        description: loc.description ?? "",
      });
    } else {
      setEditId(null);
      setForm(EMPTY_FORM);
    }
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.warehouseNo || !form.zone || !form.shelfNo || !form.levelNo) {
      toast.error("請填寫所有必填欄位");
      return;
    }
    if (editId) {
      updateLocation.mutate({ id: editId, ...form });
    } else {
      createLocation.mutate(form);
    }
  };

  const set = (key: keyof LocationForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // 按庫房分組
  const grouped = (locations ?? []).reduce<Record<string, typeof locations>>((acc, loc) => {
    const key = loc!.warehouseNo;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(loc);
    return acc;
  }, {});

  const previewCode = buildPreviewCode(form);

  return (
    <div className="fade-in space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-1">Storage</p>
          <h1 className="page-title">庫房管理</h1>
        </div>
        <Button size="sm" onClick={() => handleOpen()} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          新增架位
        </Button>
      </div>

      {/* 統計 */}
      {!isLoading && locations && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="elegant-card p-4">
            <p className="text-xs text-muted-foreground">架位總數</p>
            <p className="text-2xl font-light mt-1" style={{ fontFamily: "var(--font-serif)" }}>
              {locations.length}
            </p>
          </div>
          <div className="elegant-card p-4">
            <p className="text-xs text-muted-foreground">使用中</p>
            <p className="text-2xl font-light mt-1 text-amber-600" style={{ fontFamily: "var(--font-serif)" }}>
              {locations.filter((l) => l.isOccupied === 1).length}
            </p>
          </div>
          <div className="elegant-card p-4">
            <p className="text-xs text-muted-foreground">空置</p>
            <p className="text-2xl font-light mt-1 text-emerald-600" style={{ fontFamily: "var(--font-serif)" }}>
              {locations.filter((l) => l.isOccupied === 0).length}
            </p>
          </div>
          <div className="elegant-card p-4">
            <p className="text-xs text-muted-foreground">庫房數</p>
            <p className="text-2xl font-light mt-1" style={{ fontFamily: "var(--font-serif)" }}>
              {Object.keys(grouped).length}
            </p>
          </div>
        </div>
      )}

      {/* 架位列表（按庫房分組） */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : !locations?.length ? (
        <div className="elegant-card p-12 text-center">
          <Warehouse className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">尚無庫房架位，請先新增</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort().map(([warehouseNo, locs]) => (
            <div key={warehouseNo} className="elegant-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 bg-muted/30 flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{warehouseNo} 號庫房</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {locs?.length} 個架位
                </span>
              </div>
              <div className="divide-y divide-border/40">
                {locs?.sort((a, b) => a!.locationCode.localeCompare(b!.locationCode)).map((loc) => (
                  <div
                    key={loc!.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    {loc!.isOccupied === 1 ? (
                      <CheckCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{loc!.locationCode}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${loc!.isOccupied === 1 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {loc!.isOccupied === 1 ? "使用中" : "空置"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {loc!.zone} 區・第 {loc!.shelfNo} 架・第 {loc!.levelNo} 層
                        {loc!.description && ` · ${loc!.description}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpen(loc as any)}
                      className="w-7 h-7 rounded flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新增/編輯 Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && setShowDialog(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-serif)" }}>
              {editId ? "編輯架位" : "新增架位"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 位置編碼預覽 */}
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                位置編碼預覽
              </p>
              <p className="font-mono text-base font-medium text-primary">{previewCode}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>庫房編號 <span className="text-destructive">*</span></Label>
                <Input
                  value={form.warehouseNo}
                  onChange={set("warehouseNo")}
                  placeholder="如：305"
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label>分區 <span className="text-destructive">*</span></Label>
                <Input
                  value={form.zone}
                  onChange={set("zone")}
                  placeholder="如：A"
                  maxLength={4}
                  className="bg-background uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label>層架編號 <span className="text-destructive">*</span></Label>
                <Input
                  value={form.shelfNo}
                  onChange={set("shelfNo")}
                  placeholder="如：03"
                  maxLength={4}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label>層號 <span className="text-destructive">*</span></Label>
                <Input
                  value={form.levelNo}
                  onChange={set("levelNo")}
                  placeholder="如：01"
                  maxLength={4}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>說明（選填）</Label>
              <Input
                value={form.description}
                onChange={set("description")}
                placeholder="架位說明"
                className="bg-background"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button
                type="submit"
                disabled={createLocation.isPending || updateLocation.isPending}
              >
                {createLocation.isPending || updateLocation.isPending ? "儲存中…" : "儲存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
