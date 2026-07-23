import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Sparkles, MapPin, ImagePlus, X } from "lucide-react";
import {
  MEDIUM_OPTIONS,
  CATEGORY_OPTIONS,
  CONDITION_SECTIONS,
  PhotoGrid,
  fileToCompressedDataUrl,
  type PhotoItem,
} from "./ArtworkEntry";

type ConditionData = Record<string, { items: string[]; note: string }>;

const defaultConditionData: ConditionData = Object.fromEntries(
  CONDITION_SECTIONS.map((s) => [s.key, { items: [], note: "" }])
);

function toDateInput(val: unknown): string {
  if (!val) return "";
  try {
    const d = new Date(val as string);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

export default function ArtworkEdit({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: rawArtwork, isLoading } = trpc.artwork.getById.useQuery({ id });
  const artwork = rawArtwork as any | undefined;
  const { data: locations } = trpc.storage.list.useQuery();

  const [form, setForm] = useState({
    title: "",
    titleNotProvided: false,
    artist: "",
    collector: "",
    medium: "",
    entryDate: new Date().toISOString().split("T")[0] ?? "",
    era: "",
    registrar: "",
    receiveDate: "",
    registrationDate: "",
    dimensionLength: "",
    dimensionWidth: "",
    dimensionHeight: "",
    category: [] as string[],
    categoryOther: "",
    support: "",
    mediaDescription: "",
    locationId: "",
    notes: "",
    conditionData: defaultConditionData,
  });

  const [thumbnail, setThumbnail] = useState<string>("");
  const [thumbnailName, setThumbnailName] = useState<string>("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoType, setPendingPhotoType] = useState<"artwork" | "condition">("artwork");

  // 載入既有資料回填表單
  useEffect(() => {
    if (!artwork || initialized) return;
    const conditionData: ConditionData = artwork.conditionData
      ? Object.fromEntries(
          CONDITION_SECTIONS.map((s) => [
            s.key,
            artwork.conditionData[s.key] ?? { items: [], note: "" },
          ])
        )
      : defaultConditionData;

    setForm({
      title: artwork.title ?? "",
      titleNotProvided: !!artwork.titleNotProvided,
      artist: artwork.artist ?? "",
      collector: artwork.collector ?? "",
      medium: artwork.medium ?? "",
      entryDate: toDateInput(artwork.entryDate) || new Date().toISOString().split("T")[0]!,
      era: toDateInput(artwork.era),
      registrar: artwork.registrar ?? "",
      receiveDate: toDateInput(artwork.receiveDate),
      registrationDate: toDateInput(artwork.registrationDate),
      dimensionLength: artwork.dimensionLength ?? "",
      dimensionWidth: artwork.dimensionWidth ?? "",
      dimensionHeight: artwork.dimensionHeight ?? "",
      category: Array.isArray(artwork.category) ? artwork.category : [],
      categoryOther: artwork.categoryOther ?? "",
      support: artwork.support ?? "",
      mediaDescription: artwork.mediaDescription ?? "",
      locationId: artwork.locationId ? String(artwork.locationId) : "",
      notes: artwork.notes ?? "",
      conditionData,
    });
    setThumbnail(artwork.thumbnail ?? "");
    setThumbnailName(artwork.thumbnail ? "既有縮圖" : "");

    // 載入既有照片
    if (Array.isArray(artwork.photos)) {
      setPhotos(
        artwork.photos.map((p: any) => ({
          tempId: `existing-${p.id}`,
          photoType: p.photoType,
          dataUrl: p.dataUrl,
          caption: p.caption ?? "",
          fileName: p.caption ?? `photo-${p.id}`,
        }))
      );
    }
    setInitialized(true);
  }, [artwork, initialized]);

  const updateArtwork = trpc.artwork.update.useMutation({
    onSuccess: (data) => {
      toast.success(`作品更新成功！編號：${data?.artworkNo}`);
      utils.artwork.getById.invalidate({ id });
      setLocation(`/artworks/${id}`);
    },
    onError: (err) => {
      toast.error(`更新失敗：${err.message}`);
    },
  });

  const selectedLocation = useMemo(
    () => locations?.find((l) => l.id === Number(form.locationId)),
    [locations, form.locationId]
  );

  const setValue = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleCategory = (key: string, checked: boolean) => {
    setForm((f) => {
      const next = checked ? [...f.category, key] : f.category.filter((c) => c !== key);
      return { ...f, category: next };
    });
  };

  const toggleCondition = (sectionKey: string, optionKey: string, checked: boolean) => {
    setForm((f) => {
      const section = f.conditionData[sectionKey] ?? { items: [], note: "" };
      const nextItems = checked
        ? [...section.items, optionKey]
        : section.items.filter((k) => k !== optionKey);
      return {
        ...f,
        conditionData: { ...f.conditionData, [sectionKey]: { ...section, items: nextItems } },
      };
    });
  };

  const setConditionNote = (sectionKey: string, note: string) => {
    setForm((f) => {
      const section = f.conditionData[sectionKey] ?? { items: [], note: "" };
      return { ...f, conditionData: { ...f.conditionData, [sectionKey]: { ...section, note } } };
    });
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setThumbnail(dataUrl);
      setThumbnailName(file.name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "圖片處理失敗");
    } finally {
      setIsProcessingImage(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    }
  };

  const handlePhotoUpload = (photoType: "artwork" | "condition") => () => {
    setPendingPhotoType(photoType);
    photoInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessingImage(true);
    try {
      const newPhotos: PhotoItem[] = [];
      for (const file of Array.from(files)) {
        const dataUrl = await fileToCompressedDataUrl(file);
        newPhotos.push({
          tempId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          photoType: pendingPhotoType,
          dataUrl,
          caption: "",
          fileName: file.name,
        });
      }
      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "圖片處理失敗");
    } finally {
      setIsProcessingImage(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const updatePhotoCaption = (tempId: string, caption: string) => {
    setPhotos((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, caption } : p)));
  };

  const removePhoto = (tempId: string) => {
    setPhotos((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateArtwork.mutate({
      id,
      title: form.title || undefined,
      titleNotProvided: form.titleNotProvided,
      artist: form.artist || undefined,
      collector: form.collector || undefined,
      medium: form.medium || undefined,
      entryDate: form.entryDate || undefined,
      era: form.era || undefined,
      registrar: form.registrar || undefined,
      receiveDate: form.receiveDate || undefined,
      registrationDate: form.registrationDate || undefined,
      dimensionLength: form.dimensionLength || undefined,
      dimensionWidth: form.dimensionWidth || undefined,
      dimensionHeight: form.dimensionHeight || undefined,
      category: form.category.length > 0 ? form.category : undefined,
      categoryOther: form.category.includes("others") ? form.categoryOther || undefined : undefined,
      support: form.support || undefined,
      mediaDescription: form.mediaDescription || undefined,
      conditionData: form.conditionData,
      locationId: form.locationId && form.locationId !== "none" ? Number(form.locationId) : undefined,
      locationCode: selectedLocation?.locationCode,
      notes: form.notes || undefined,
      thumbnail: thumbnail || undefined,
      photos: photos.map((p) => ({
        photoType: p.photoType,
        dataUrl: p.dataUrl,
        caption: p.caption || undefined,
      })),
    });
  };

  const artworkPhotosList = photos.filter((p) => p.photoType === "artwork");
  const conditionPhotosList = photos.filter((p) => p.photoType === "condition");

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
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

  return (
    <div className="fade-in max-w-3xl mx-auto space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation(`/artworks/${id}`)}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-0.5">Edit Artwork</p>
          <h1 className="page-title text-2xl">編輯藏品資料</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 作品編號 */}
        <div className="elegant-card p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-xs text-muted-foreground tracking-wider">作品編號 Registered No.</span>
          </div>
          <p className="font-mono text-lg font-medium text-primary tracking-widest">{artwork.artworkNo}</p>
          <p className="text-xs text-muted-foreground mt-1">狀態：{artwork.status}（編輯不會變更狀態與編號）</p>
        </div>

        {/* A. 一般資料 General Data */}
        <section className="elegant-card p-5 space-y-5">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">A. 一般資料 General Data</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 作品名稱 */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">作品名稱 Title</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="titleNotProvided"
                    checked={form.titleNotProvided}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, titleNotProvided: !!v }))}
                  />
                  <Label htmlFor="titleNotProvided" className="text-xs font-normal cursor-pointer">未提供</Label>
                </div>
              </div>
              <Input
                id="title"
                value={form.title}
                onChange={setValue("title")}
                placeholder={form.titleNotProvided ? "未提供" : "請輸入作品名稱"}
                disabled={form.titleNotProvided}
                className="bg-background"
              />
            </div>

            {/* 作者 */}
            <div className="space-y-1.5">
              <Label htmlFor="artist">作品作者 Author</Label>
              <Input id="artist" value={form.artist} onChange={setValue("artist")} placeholder="請輸入作者姓名" className="bg-background" />
            </div>

            {/* 收藏家 */}
            <div className="space-y-1.5">
              <Label htmlFor="collector">收藏家 Collector</Label>
              <Input id="collector" value={form.collector} onChange={setValue("collector")} placeholder="請輸入收藏家名稱" className="bg-background" />
            </div>

            {/* 作品年代 */}
            <div className="space-y-1.5">
              <Label htmlFor="era">作品年代 Era/Date of Collection</Label>
              <Input id="era" type="date" value={form.era} onChange={setValue("era")} className="bg-background" />
            </div>

            {/* 檢視員 */}
            <div className="space-y-1.5">
              <Label htmlFor="registrar">檢視員 Register</Label>
              <Input id="registrar" value={form.registrar} onChange={setValue("registrar")} placeholder="請輸入檢視員姓名" className="bg-background" />
            </div>

            {/* 媒材類別 */}
            <div className="space-y-1.5">
              <Label>媒材類別 Medium</Label>
              <Select value={form.medium} onValueChange={(v) => setForm((f) => ({ ...f, medium: v }))}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="選擇媒材類別" />
                </SelectTrigger>
                <SelectContent>
                  {MEDIUM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{opt.code}</span>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 入庫日期 */}
            <div className="space-y-1.5">
              <Label htmlFor="entryDate">入庫日期 Entry Date</Label>
              <Input id="entryDate" type="date" value={form.entryDate} onChange={setValue("entryDate")} className="bg-background" />
            </div>

            {/* 收件日期 */}
            <div className="space-y-1.5">
              <Label htmlFor="receiveDate">收件日期 Date of Receive</Label>
              <Input id="receiveDate" type="date" value={form.receiveDate} onChange={setValue("receiveDate")} className="bg-background" />
            </div>

            {/* 檢視日期 */}
            <div className="space-y-1.5">
              <Label htmlFor="registrationDate">檢視日期 Date of Registration</Label>
              <Input id="registrationDate" type="date" value={form.registrationDate} onChange={setValue("registrationDate")} className="bg-background" />
            </div>
          </div>

          {/* 作品尺寸 */}
          <div className="space-y-1.5">
            <Label>作品尺寸 Dimension（cm）</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" step="0.01" value={form.dimensionLength} onChange={setValue("dimensionLength")} placeholder="長" className="bg-background" />
              <span className="text-muted-foreground">×</span>
              <Input type="number" min="0" step="0.01" value={form.dimensionWidth} onChange={setValue("dimensionWidth")} placeholder="寬" className="bg-background" />
              <span className="text-muted-foreground">×</span>
              <Input type="number" min="0" step="0.01" value={form.dimensionHeight} onChange={setValue("dimensionHeight")} placeholder="高" className="bg-background" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">cm</span>
            </div>
          </div>

          {/* 類別 Category */}
          <div className="space-y-2">
            <Label>類別 Category</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <div key={cat.key} className="flex items-start gap-2">
                  <Checkbox
                    id={`cat-${cat.key}`}
                    checked={form.category.includes(cat.key)}
                    onCheckedChange={(v) => toggleCategory(cat.key, !!v)}
                    className="mt-0.5"
                  />
                  <Label htmlFor={`cat-${cat.key}`} className="text-sm font-normal cursor-pointer leading-tight">
                    {cat.label}
                  </Label>
                </div>
              ))}
            </div>
            {form.category.includes("others") && (
              <Input
                value={form.categoryOther}
                onChange={setValue("categoryOther")}
                placeholder="請填寫其他類別"
                className="bg-background mt-2"
              />
            )}
          </div>

          {/* 基底材 & 媒材 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="support">基底材 Support</Label>
              <Input id="support" value={form.support} onChange={setValue("support")} placeholder="請輸入基底材" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mediaDescription">媒材 Media</Label>
              <Input id="mediaDescription" value={form.mediaDescription} onChange={setValue("mediaDescription")} placeholder="請輸入媒材" className="bg-background" />
            </div>
          </div>
        </section>

        {/* 作品縮圖 */}
        <section className="elegant-card p-5 space-y-4">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">作品縮圖 Thumbnail</h2>
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden">
              {thumbnail ? (
                <img src={thumbnail} alt="縮圖預覽" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus className="w-6 h-6 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" id="thumbnail-input" />
              <Button type="button" variant="outline" size="sm" onClick={() => thumbnailInputRef.current?.click()} disabled={isProcessingImage} className="gap-2">
                <ImagePlus className="w-4 h-4" />
                {isProcessingImage ? "處理中…" : thumbnail ? "更換縮圖" : "上傳縮圖"}
              </Button>
              {thumbnailName && <p className="text-xs text-muted-foreground truncate">{thumbnailName}</p>}
              {thumbnail && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setThumbnail(""); setThumbnailName(""); }} className="gap-1 text-muted-foreground h-7">
                  <X className="w-3 h-3" /> 移除
                </Button>
              )}
              <p className="text-xs text-muted-foreground">建議正方形圖片，將自動壓縮至 400px 以內</p>
            </div>
          </div>
        </section>

        {/* 作品照片 Artwork Photos */}
        <section className="elegant-card p-5 space-y-4">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">作品照片 Artwork Photos</h2>
          <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
          <Button type="button" variant="outline" size="sm" onClick={handlePhotoUpload("artwork")} disabled={isProcessingImage} className="gap-2">
            <ImagePlus className="w-4 h-4" /> 上傳作品照片
          </Button>
          <PhotoGrid photos={artworkPhotosList} onCaptionChange={updatePhotoCaption} onRemove={removePhoto} placeholder="位置說明" />
        </section>

        {/* B. 典藏品現狀 Art Object Condition */}
        <section className="elegant-card p-5 space-y-6">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">B. 典藏品現狀 Art Object Condition</h2>

          {CONDITION_SECTIONS.map((section) => (
            <div key={section.key} className="space-y-3 border-b border-border/40 last:border-0 pb-5 last:pb-0">
              <h3 className="text-sm font-medium">{section.title}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {section.options.map((opt) => {
                  const checked = form.conditionData[section.key]?.items.includes(opt.key) ?? false;
                  return (
                    <div key={opt.key} className="flex items-start gap-2">
                      <Checkbox
                        id={`${section.key}-${opt.key}`}
                        checked={checked}
                        onCheckedChange={(v) => toggleCondition(section.key, opt.key, !!v)}
                        className="mt-0.5"
                      />
                      <Label htmlFor={`${section.key}-${opt.key}`} className="text-sm font-normal cursor-pointer leading-tight">
                        {opt.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${section.key}-note`} className="text-xs text-muted-foreground">備註 Note</Label>
                <Textarea
                  id={`${section.key}-note`}
                  value={form.conditionData[section.key]?.note ?? ""}
                  onChange={(e) => setConditionNote(section.key, e.target.value)}
                  placeholder="輸入備註…"
                  rows={2}
                  className="bg-background resize-none"
                />
              </div>
            </div>
          ))}
        </section>

        {/* 作品狀態照片 Condition Photos */}
        <section className="elegant-card p-5 space-y-4">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">作品狀態照片 Condition Photos</h2>
          <Button type="button" variant="outline" size="sm" onClick={handlePhotoUpload("condition")} disabled={isProcessingImage} className="gap-2">
            <ImagePlus className="w-4 h-4" /> 上傳狀態照片
          </Button>
          <PhotoGrid photos={conditionPhotosList} onCaptionChange={updatePhotoCaption} onRemove={removePhoto} placeholder="狀態說明" />
        </section>

        {/* 庫房位置 */}
        <section className="elegant-card p-5 space-y-4">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">庫房位置 Storage Location</h2>
          <div className="space-y-1.5">
            <Label>指定架位（選填）</Label>
            <Select value={form.locationId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, locationId: v === "none" ? "" : v }))}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="選擇庫房架位" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不指定位置</SelectItem>
                {locations?.map((loc) => {
                  // 編輯時：當前作品的位置可選，其他已佔用的位置不可選
                  const isCurrent = loc.id === artwork.locationId;
                  const disabled = loc.isOccupied === 1 && !isCurrent;
                  return (
                    <SelectItem key={loc.id} value={String(loc.id)} disabled={disabled}>
                      <span className="font-mono mr-2">{loc.locationCode}</span>
                      {loc.description && <span className="text-muted-foreground text-xs">{loc.description}</span>}
                      {isCurrent && <span className="text-muted-foreground text-xs ml-1">（當前位置）</span>}
                      {disabled && <span className="text-muted-foreground text-xs ml-1">（已佔用）</span>}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {selectedLocation && (
            <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-sm font-mono font-medium">{selectedLocation.locationCode}</p>
                <p className="text-xs text-muted-foreground">{selectedLocation.warehouseNo} 號庫房・{selectedLocation.zone} 區・第 {selectedLocation.shelfNo} 架・第 {selectedLocation.levelNo} 層</p>
              </div>
            </div>
          )}
        </section>

        {/* 備註 */}
        <section className="elegant-card p-5 space-y-4">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">備註 Notes</h2>
          <Textarea value={form.notes} onChange={setValue("notes")} placeholder="輸入備註說明…" rows={3} className="bg-background resize-none" />
        </section>

        {/* 提交 */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => setLocation(`/artworks/${id}`)}>取消</Button>
          <Button type="submit" disabled={updateArtwork.isPending} className="min-w-24">
            {updateArtwork.isPending ? "更新中…" : "儲存變更"}
          </Button>
        </div>
      </form>
    </div>
  );
}
