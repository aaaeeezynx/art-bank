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
import { toast } from "sonner";
import { useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Sparkles, MapPin, ImagePlus, X, Trash2 } from "lucide-react";

export const MEDIUM_OPTIONS = [
  { value: "canvas", label: "畫布作品", code: "CW" },
  { value: "paper", label: "紙質作品", code: "PW" },
  { value: "wood", label: "木質作品", code: "WW" },
  { value: "metal", label: "金屬作品", code: "MW" },
  { value: "textile", label: "織品作品", code: "TW" },
  { value: "mixed", label: "複合媒材", code: "MM" },
];

const CATEGORY_OPTIONS = [
  { key: "orientalPaper", label: "東方紙質 Oriental paper" },
  { key: "westernPaper", label: "西方紙質 Western paper" },
  { key: "oilPainting", label: "油畫 Oil painting" },
  { key: "stone", label: "石材 Stone" },
  { key: "metal", label: "金屬 Metal" },
  { key: "wood", label: "木製品 Wood" },
  { key: "ceramic", label: "陶/瓷 Ceramic/Porcelain" },
  { key: "others", label: "其他 Others" },
];

const CONDITION_SECTIONS = [
  {
    key: "supports",
    title: "基底材 Supports",
    options: [
      { key: "dirty", label: "髒汙 Dirty" },
      { key: "yellowing", label: "黃化 Yellowing" },
      { key: "brittle", label: "脆化 Brittle" },
      { key: "deformation", label: "變形 Deformation" },
      { key: "fold", label: "皺摺痕 Fold" },
      { key: "abrasions", label: "磨損 Abrasions" },
      { key: "hole", label: "孔洞 Hole" },
      { key: "insectDamage", label: "蟲蛀 Insect Damage" },
      { key: "break", label: "破損 Break" },
      { key: "tear", label: "撕裂 Tear" },
      { key: "liquidStains", label: "水漬 Liquid Stains" },
      { key: "oilStains", label: "油漬 Oil Stains" },
      { key: "glueStains", label: "膠漬 Glue Stains" },
      { key: "unknownStains", label: "未知漬痕 Unknown Stains" },
      { key: "accretion", label: "異物沾附 Accretion" },
      { key: "foxing", label: "褐斑 Foxing" },
      { key: "mold", label: "霉斑 Mold" },
      { key: "insectExcrement", label: "昆蟲排遺 Insect Excrement" },
      { key: "restored", label: "曾修復 Restored" },
      { key: "unrestored", label: "未曾修復 Unrestored" },
    ],
  },
  {
    key: "paintLayers",
    title: "繪畫層 Paint layers",
    options: [
      { key: "dirty", label: "髒汙 Dirty" },
      { key: "yellowing", label: "黃化 Yellowing" },
      { key: "fading", label: "褪色 Fading" },
      { key: "abrasions", label: "磨損 Abrasions" },
      { key: "hole", label: "孔洞 Hole" },
      { key: "loss", label: "缺失 Loss" },
      { key: "flaking", label: "剝離 Flaking" },
      { key: "cracking", label: "龜裂 Cracking" },
      { key: "fold", label: "皺摺痕 Fold" },
      { key: "skinning", label: "起翹 Skinning" },
      { key: "tenting", label: "空鼓 Tenting" },
      { key: "accretion", label: "異物沾附 Accretion" },
      { key: "liquidStains", label: "水漬 Liquid Stains" },
      { key: "oilStains", label: "油漬 Oil Stains" },
      { key: "glueStains", label: "膠漬 Glue Stains" },
      { key: "unknownStains", label: "未知漬痕 Unknown Stains" },
      { key: "insectDamage", label: "蟲蛀 Insect Damage" },
      { key: "insectExcrement", label: "昆蟲排遺 Insect Excrement" },
      { key: "foxing", label: "褐斑 Foxing" },
      { key: "mold", label: "霉斑 Mold" },
      { key: "restored", label: "曾修復 Restored" },
      { key: "unrestored", label: "未曾修復 Unrestored" },
    ],
  },
  {
    key: "protectLayer",
    title: "保護層 Protect Layer",
    options: [
      { key: "dirty", label: "髒汙 Dirty" },
      { key: "yellowing", label: "黃化 Yellowing" },
      { key: "blanching", label: "白霧 Blanching/Blooming" },
      { key: "liquidStains", label: "水漬 Liquid Stains" },
      { key: "oilStains", label: "油漬 Oil Stains" },
      { key: "glueStains", label: "膠漬 Glue Stains" },
      { key: "unknownStains", label: "未知漬痕 Unknown Stains" },
      { key: "foxing", label: "褐斑 Foxing" },
      { key: "mold", label: "霉斑 Mold" },
      { key: "restored", label: "曾修復 Restored" },
      { key: "unrestored", label: "未曾修復 Unrestored" },
    ],
  },
  {
    key: "stretcher",
    title: "內框 Stretcher",
    options: [
      { key: "dirty", label: "髒汙 Dirty" },
      { key: "buckling", label: "變形 Buckling" },
      { key: "break", label: "破損 Break" },
      { key: "loss", label: "缺失 Loss" },
      { key: "abrasion", label: "磨損 Abrasion" },
      { key: "insectDamage", label: "蟲蛀 Insect Damage" },
      { key: "mold", label: "霉斑 Mold" },
      { key: "liquidStains", label: "水漬 Liquid Stains" },
      { key: "oilStains", label: "油漬 Oil Stains" },
      { key: "glueStains", label: "膠漬 Glue Stains" },
      { key: "unknownStains", label: "未知漬痕 Unknown Stains" },
      { key: "restored", label: "曾修復 Restored" },
      { key: "unrestored", label: "未曾修復 Unrestored" },
    ],
  },
  {
    key: "frame",
    title: "外框 Frame",
    options: [
      { key: "dirty", label: "髒汙 Dirty" },
      { key: "buckling", label: "變形 Buckling" },
      { key: "break", label: "破損 Break" },
      { key: "loss", label: "缺失 Loss" },
      { key: "abrasion", label: "磨損 Abrasion" },
      { key: "insectDamage", label: "蟲蛀 Insect Damage" },
      { key: "mold", label: "霉斑 Mold" },
      { key: "liquidStains", label: "水漬 Liquid Stains" },
      { key: "oilStains", label: "油漬 Oil Stains" },
      { key: "glueStains", label: "膠漬 Glue Stains" },
      { key: "unknownStains", label: "未知漬痕 Unknown Stains" },
      { key: "restored", label: "曾修復 Restored" },
      { key: "unrestored", label: "未曾修復 Unrestored" },
    ],
  },
];

const THUMBNAIL_MAX_SIZE = 400; // px
const THUMBNAIL_MAX_BYTES = 600 * 1024; // 600KB 上限（data URL）

function formatDateCode(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function previewArtworkNo(medium: string, entryDate: string): string {
  if (!medium || !entryDate) return "AC-??-????????-???";
  const m = MEDIUM_OPTIONS.find((o) => o.value === medium);
  if (!m) return "AC-??-????????-???";
  const dateCode = formatDateCode(entryDate);
  return `AC-${m.code}-${dateCode}-???`;
}

export function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("請選擇圖片檔案"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("讀取檔案失敗"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("無法載入圖片"));
      img.onload = () => {
        let { width, height } = img;
        if (width > THUMBNAIL_MAX_SIZE || height > THUMBNAIL_MAX_SIZE) {
          const ratio = Math.min(THUMBNAIL_MAX_SIZE / width, THUMBNAIL_MAX_SIZE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("無法建立繪圖環境"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > THUMBNAIL_MAX_BYTES && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type ConditionData = Record<string, { items: string[]; note: string }>;

export type PhotoItem = {
  tempId: string;
  photoType: "artwork" | "condition";
  dataUrl: string;
  caption: string;
  fileName: string;
};

const defaultConditionData: ConditionData = Object.fromEntries(
  CONDITION_SECTIONS.map((s) => [s.key, { items: [], note: "" }])
);

export default function ArtworkEntry() {
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({
    title: "",
    titleNotProvided: false,
    artist: "",
    collector: "",
    customCode: "",
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
    selectedWarehouseNo: "",
    selectedZone: "",
    selectedShelfId: "",
    notes: "",
    conditionData: defaultConditionData,
  });

  const [thumbnail, setThumbnail] = useState<string>("");
  const [thumbnailName, setThumbnailName] = useState<string>("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoType, setPendingPhotoType] = useState<"artwork" | "condition">("artwork");

  const { data: locations } = trpc.storage.list.useQuery();
  const createArtwork = trpc.artwork.create.useMutation({
    onSuccess: (data) => {
      toast.success(`作品入庫成功！編號：${data?.artworkNo}`);
      setLocation(`/artworks/${data?.id}`);
    },
    onError: (err) => {
      toast.error(`入庫失敗：${err.message}`);
    },
  });

  const selectedLocation = useMemo(
    () => locations?.find((l) => l.id === Number(form.selectedShelfId)),
    [locations, form.selectedShelfId]
  );

  // 三階下拉：可用的庫房編號 / 分區 / 層架編號（可重複選，無「已佔用」限制）
  const warehouseOptions = useMemo(() => {
    const set = new Set<string>();
    locations?.forEach((l) => set.add(l.warehouseNo));
    return Array.from(set).sort();
  }, [locations]);

  const zoneOptions = useMemo(() => {
    if (!form.selectedWarehouseNo) return [];
    const set = new Set<string>();
    locations
      ?.filter((l) => l.warehouseNo === form.selectedWarehouseNo)
      .forEach((l) => set.add(l.zone));
    return Array.from(set).sort();
  }, [locations, form.selectedWarehouseNo]);

  const shelfOptions = useMemo(() => {
    if (!form.selectedWarehouseNo || !form.selectedZone) return [];
    return locations
      ?.filter((l) => l.warehouseNo === form.selectedWarehouseNo && l.zone === form.selectedZone)
      .sort((a, b) => a.shelfNo.localeCompare(b.shelfNo)) ?? [];
  }, [locations, form.selectedWarehouseNo, form.selectedZone]);

  const artworkNoPreview = previewArtworkNo(form.medium, form.entryDate);

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
    if (!form.title || !form.artist || !form.medium || !form.entryDate) {
      toast.error("請填寫必填欄位：作品名稱、作者、媒材類別、入庫日期");
      return;
    }
    createArtwork.mutate({
      title: form.title,
      titleNotProvided: form.titleNotProvided,
      artist: form.artist,
      collector: form.collector || undefined,
      customCode: form.customCode || undefined,
      medium: form.medium as any,
      entryDate: form.entryDate,
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
      locationId: form.selectedShelfId ? Number(form.selectedShelfId) : undefined,
      locationCode: selectedLocation?.locationCode,
      notes: form.notes || undefined,
      thumbnail: thumbnail || undefined,
      photos: photos.length > 0 ? photos : undefined,
    });
  };

  const artworkPhotosList = photos.filter((p) => p.photoType === "artwork");
  const conditionPhotosList = photos.filter((p) => p.photoType === "condition");

  return (
    <div className="fade-in max-w-3xl mx-auto space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation("/artworks")}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-0.5">Condition Report</p>
          <h1 className="page-title text-2xl">藏品檢視登錄表</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 作品編號預覽 + 藏家自訂編號 */}
        <div className="elegant-card p-4 bg-primary/5 border-primary/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* 左：系統自動產生作品編號 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-primary/70" />
                <span className="text-xs text-muted-foreground tracking-wider">系統自動產生作品編號 Registered No.</span>
              </div>
              <p className="font-mono text-lg font-medium text-primary tracking-widest">{artworkNoPreview}</p>
              <p className="text-xs text-muted-foreground mt-1">格式：藝術銀行縮寫 - 媒材代碼 - 入庫日期 - 流水號</p>
            </div>

            {/* 右：藏家自訂編號 */}
            <div className="space-y-1.5">
              <Label htmlFor="customCode">藏家自訂編號 Custom Code（選填）</Label>
              <Input id="customCode" value={form.customCode} onChange={setValue("customCode")} placeholder="如：C-2024-001（不會出現在匯出檔）" className="bg-background" />
              <p className="text-xs text-muted-foreground">系統仍會自動產生作品編號，此欄位僅供內部辨識使用</p>
            </div>
          </div>
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
          <div className="space-y-3">
            <Label>指定架位（選填，可重複選擇）</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 第 1 階：庫房編號 */}
              <Select
                value={form.selectedWarehouseNo || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, selectedWarehouseNo: v === "none" ? "" : v, selectedZone: "", selectedShelfId: "" }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="庫房編號" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不指定</SelectItem>
                  {warehouseOptions.map((w) => (
                    <SelectItem key={w} value={w}>
                      <span className="font-mono">{w}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 第 2 階：分區 */}
              <Select
                value={form.selectedZone || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, selectedZone: v === "none" ? "" : v, selectedShelfId: "" }))}
                disabled={!form.selectedWarehouseNo}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="分區" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不指定</SelectItem>
                  {zoneOptions.map((z) => (
                    <SelectItem key={z} value={z}>
                      <span className="font-mono">{z} 區</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 第 3 階：層架編號 */}
              <Select
                value={form.selectedShelfId || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, selectedShelfId: v === "none" ? "" : v }))}
                disabled={!form.selectedWarehouseNo || !form.selectedZone}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="層架編號" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不指定</SelectItem>
                  {shelfOptions.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      <span className="font-mono mr-2">{loc.shelfNo.padStart(2, "0")}</span>
                      {loc.description && <span className="text-muted-foreground text-xs">{loc.description}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">同一架位可被多件作品指定，無「已佔用」限制。</p>
          </div>
          {selectedLocation && (
            <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-sm font-mono font-medium">{selectedLocation.locationCode}</p>
                <p className="text-xs text-muted-foreground">{selectedLocation.warehouseNo} 號庫房・{selectedLocation.zone} 區・第 {selectedLocation.shelfNo} 架</p>
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
          <Button type="button" variant="outline" onClick={() => setLocation("/artworks")}>取消</Button>
          <Button type="submit" disabled={createArtwork.isPending} className="min-w-24">
            {createArtwork.isPending ? "登錄中…" : "確認登錄"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export { CONDITION_SECTIONS, CATEGORY_OPTIONS };

export function PhotoGrid({
  photos,
  onCaptionChange,
  onRemove,
  placeholder = "位置說明",
}: {
  photos: PhotoItem[];
  onCaptionChange: (tempId: string, caption: string) => void;
  onRemove: (tempId: string) => void;
  placeholder?: string;
}) {
  if (photos.length === 0) {
    return <p className="text-sm text-muted-foreground">尚無照片</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <div key={photo.tempId} className="space-y-2">
          <div className="relative aspect-square rounded-lg border border-border overflow-hidden bg-muted">
            <img src={photo.dataUrl} alt={photo.fileName} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(photo.tempId)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <Input
            value={photo.caption}
            onChange={(e) => onCaptionChange(photo.tempId, e.target.value)}
            placeholder={placeholder}
            className="bg-background text-xs h-8"
          />
        </div>
      ))}
    </div>
  );
}
