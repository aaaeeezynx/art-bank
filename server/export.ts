import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { ArtworkWithPhotos } from "./db";

// ── 共用資料定義 ────────────────────────────────────────────────────────────

const CATEGORY_ITEMS = [
  { key: "orientalPaper", label: "東方紙質Oriental paper" },
  { key: "westernPaper", label: "西方紙質 Western paper" },
  { key: "oilPainting", label: "油畫Oil painting" },
  { key: "stone", label: "石材Stone" },
  { key: "metal", label: "金屬 Metal" },
  { key: "wood", label: "木製品Wood" },
  { key: "ceramic", label: "陶/瓷Ceramic/Porcelain" },
  { key: "others", label: "其他 Others" },
];

const CONDITION_SECTIONS = [
  {
    key: "supports",
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

// ── 工具函數 ────────────────────────────────────────────────────────────────

function fmtDate(val: unknown): string {
  if (!val) return "";
  try {
    const d = new Date(val as string);
    if (isNaN(d.getTime())) return String(val);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return String(val);
  }
}

function fmtDimension(val: unknown): string {
  if (val === null || val === undefined || val === "") return "";
  const num = Number(val);
  if (isNaN(num)) return String(val).trim();
  // 移除 trailing .00，保留有意義的小數
  return String(parseFloat(num.toFixed(6)));
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getConditionData(artwork: ArtworkWithPhotos): Record<string, { items: string[]; note: string }> {
  if (!artwork.conditionData) return {};
  return artwork.conditionData as unknown as Record<string, { items: string[]; note: string }>;
}

function getCategoryArray(artwork: ArtworkWithPhotos): string[] {
  if (!artwork.category) return [];
  const raw = artwork.category as unknown;
  return Array.isArray(raw) ? (raw as string[]) : [];
}

/**
 * 從 base64 dataUrl 讀取圖片實際寬高（像素）
 * 支援 JPEG (SOF0/SOF2 標記) 和 PNG (IHDR chunk)
 */
function getImageDimensions(dataUrl: string): { width: number; height: number } {
  try {
    const base64Data = dataUrl.split(",")[1];
    if (!base64Data) return { width: 0, height: 0 };
    const buffer = Buffer.from(base64Data, "base64");

    if (dataUrl.includes("image/png")) {
      // PNG: IHDR 在第 16 字節開始，前 4 字節寬度，後 4 字節高度
      if (buffer.length >= 24) {
        return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
      }
    } else if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) {
      // JPEG: 掃描 SOF0(0xC0) 或 SOF2(0xC2) 標記
      let offset = 2; // 跳過 SOI 標記 (0xFFD8)
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        }
        // 跳過當前區段到下一個標記
        if (marker >= 0xd0 && marker <= 0xd9) { offset += 2; continue; }
        const segLen = buffer.readUInt16BE(offset + 2);
        offset += 2 + segLen;
      }
    }
  } catch { /* 忽略錯誤 */ }
  return { width: 0, height: 0 };
}

/**
 * 根據圖片實際尺寸計算填滿欄位的 EMU 值（保持比例不拉伸）
 * @param dataUrl 圖片 base64
 * @param maxCellW 欄位最大寬度 (twips)，圖片寬度不超過此值
 */
function calculateImageEmu(dataUrl: string, maxCellW: number): { cx: number; cy: number } {
  // twips → EMU (1 twip = 635 EMU)，留 5% 邊距
  const maxW = Math.round(maxCellW * 635 * 0.95);
  const maxH = 4200000; // 最大高度約 11cm
  const { width: pxW, height: pxH } = getImageDimensions(dataUrl);
  if (pxW === 0 || pxH === 0) {
    // 無法讀取尺寸，使用預設 4:3 比例
    return { cx: maxW, cy: Math.round(maxW * 0.75) };
  }
  // 像素 → EMU (96 DPI: 1px = 9525 EMU)
  let emuW = pxW * 9525;
  let emuH = pxH * 9525;
  // 按比例縮放到欄位寬度內
  const ratio = Math.min(maxW / emuW, maxH / emuH, 1);
  return { cx: Math.round(emuW * ratio), cy: Math.round(emuH * ratio) };
}

/**
 * 在 XML 中尋找標籤文字的位置，支援跨 <w:t> 標籤的文字
 * 例如模板中 "檢視員" 可能被拆成 <w:t>檢視</w:t>...<w:t>員</w:t>
 */
function findLabelInXml(xml: string, label: string): number {
  // 先嘗試直接搜尋（標籤文字在同一個 <w:t> 中）
  const directIdx = xml.indexOf(label);
  if (directIdx !== -1) return directIdx;

  // 跨標籤搜尋：取前 2 字作為 prefix，逐個驗證
  const prefix = label.substring(0, 2);
  let searchFrom = 0;
  while (true) {
    const prefixIdx = xml.indexOf(prefix, searchFrom);
    if (prefixIdx === -1) return -1;

    // 取 prefix 後面 300 字元，去除 XML 標籤後檢查是否以 label 開頭
    const afterPrefix = xml.substring(prefixIdx, prefixIdx + 300);
    const stripped = afterPrefix.replace(/<[^>]+>/g, "");
    if (stripped.startsWith(label)) {
      return prefixIdx;
    }
    searchFrom = prefixIdx + 1;
  }
}

/**
 * 在 document.xml 中，找到某個標題文字之後的填寫區，替換為新文字。
 * 只在「緊接 label 所在 cell 的下一個 cell」中搜尋填寫區，避免跨越多個 cell 誤替換。
 * 支援三種填寫區：
 * 1. 有 <w:t xml:space="preserve">  </w:t> 的空白填寫區 → 替換內容
 * 2. 完全沒有 <w:t> 的空 cell → 在 <w:pPr> 後插入新的 run
 * 3. cell 有 <w:p> 但沒有 <w:pPr> → 在 <w:p> 後直接插入
 */
function replaceValueAfterLabel(xml: string, labelPattern: string, newValue: string): string {
  // 找到標題文字的位置（支援跨 <w:t> 標籤）
  const labelIdx = findLabelInXml(xml, labelPattern);
  if (labelIdx === -1) return xml;

  // 從標題位置往後找，先跳過當前 cell（找到 </w:tc>）
  const afterLabel = xml.substring(labelIdx);
  const firstTcEndRel = afterLabel.indexOf("</w:tc>");
  if (firstTcEndRel === -1) return xml;
  const afterFirstTc = afterLabel.substring(firstTcEndRel + "</w:tc>".length);

  // 找緊接的下一個 <w:tc> 開始位置
  const nextTcStartMatch = afterFirstTc.match(/<w:tc[> ]/);
  if (!nextTcStartMatch) return xml;
  const nextTcStartRel = afterFirstTc.indexOf(nextTcStartMatch[0]);

  // 找該 cell 的 </w:tc> 結束位置
  const nextTcEndRel = afterFirstTc.indexOf("</w:tc>", nextTcStartRel);
  if (nextTcEndRel === -1) return xml;

  // 下一個 cell 的完整內容（相對於 afterFirstTc）
  const nextCellXml = afterFirstTc.substring(nextTcStartRel, nextTcEndRel + "</w:tc>".length);

  // 計算 nextCellXml 在原始 xml 中的絕對起點
  const cellAbsStart = labelIdx + firstTcEndRel + "</w:tc>".length + nextTcStartRel;

  const escapedValue = escapeXml(newValue);
  const newRun = `<w:r><w:rPr><w:rFonts w:eastAsia="標楷體" w:hint="eastAsia"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${escapedValue}</w:t></w:r>`;

  // 方法 1：找 <w:t xml:space="preserve">  </w:t>（有空白填寫區的 cell）
  const fillMatch = nextCellXml.match(/<w:t xml:space="preserve">\s+<\/w:t>/);
  if (fillMatch) {
    const fillIdx = nextCellXml.indexOf(fillMatch[0]);
    const absoluteIdx = cellAbsStart + fillIdx;
    const newT = `<w:t xml:space="preserve">${escapedValue}</w:t>`;
    return xml.substring(0, absoluteIdx) + newT + xml.substring(absoluteIdx + fillMatch[0].length);
  }

  // 方法 2：cell 是空的（沒有 <w:t>），在 <w:pPr> 之後插入新的 run
  const pPrEndIdx = nextCellXml.indexOf("</w:pPr>");
  if (pPrEndIdx !== -1) {
    const absoluteInsertPos = cellAbsStart + pPrEndIdx + "</w:pPr>".length;
    return xml.substring(0, absoluteInsertPos) + newRun + xml.substring(absoluteInsertPos);
  }

  // 方法 3：cell 有 <w:p> 但沒有 <w:pPr>，在 <w:p> 後直接插入
  const pStartMatch = nextCellXml.match(/<w:p[\s>]/);
  if (pStartMatch) {
    const pStartIdx = nextCellXml.indexOf(pStartMatch[0]);
    const pOpenEnd = nextCellXml.indexOf(">", pStartIdx);
    if (pOpenEnd !== -1) {
      const absoluteInsertPos = cellAbsStart + pOpenEnd + 1;
      return xml.substring(0, absoluteInsertPos) + newRun + xml.substring(absoluteInsertPos);
    }
  }

  return xml;
}

/**
 * 替換作品尺寸行：將整行替換為單段落「作品尺寸Dimension：尺寸值」
 * 移除「未裝裱/畫心without frame」和「裝裱/裱框frame」等文字，避免換行
 * 同時移除作品尺寸行後面多餘的空行（gridSpan=10、top=nil、只有空格的分隔行）
 */
function replaceDimensionRow(xml: string, dimensionText: string): string {
  const dimIdx = xml.indexOf("作品尺寸");
  if (dimIdx === -1) return xml;

  const trStart = xml.lastIndexOf("<w:tr ", dimIdx);
  const trEnd = xml.indexOf("</w:tr>", dimIdx) + "</w:tr>".length;
  if (trStart === -1 || trEnd === -1) return xml;

  // 檢查並移除作品尺寸行後面的空行
  const nextTrStart = xml.indexOf("<w:tr ", trEnd);
  const nextTrEnd = xml.indexOf("</w:tr>", nextTrStart) + "</w:tr>".length;
  let removeEnd = trEnd;
  if (nextTrStart !== -1 && nextTrEnd !== -1) {
    const nextTr = xml.substring(nextTrStart, nextTrEnd);
    // 判斷是否為空行：gridSpan=10、top=nil、內容只有空格
    const isEmptyRow = nextTr.includes('gridSpan w:val="10"') &&
      nextTr.includes('<w:top w:val="nil"/>') &&
      !nextTr.replace(/<[^>]+>/g, "").trim();
    if (isEmptyRow) {
      removeEnd = nextTrEnd;
    }
  }

  const dimValue = dimensionText || "";
  // 替換整行為單段落：作品尺寸Dimension：尺寸值
  const newTr = `<w:tr w:rsidR="00741368" w:rsidRPr="001F2D61" w:rsidTr="00505292"><w:trPr><w:trHeight w:val="567"/><w:jc w:val="center"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="9802" w:type="dxa"/><w:gridSpan w:val="10"/><w:vAlign w:val="center"/></w:tcPr><w:p w14:paraId="2C55D179" w14:textId="77777777" w:rsidR="00741368" w:rsidRPr="00A8132B" w:rsidRDefault="00741368" w:rsidP="00505292"><w:pPr><w:spacing w:line="240" w:lineRule="exact"/><w:jc w:val="both"/><w:rPr><w:rFonts w:eastAsia="標楷體"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:pPr><w:r w:rsidRPr="00A8132B"><w:rPr><w:rFonts w:eastAsia="標楷體"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>作品尺寸</w:t></w:r><w:r w:rsidRPr="00A8132B"><w:rPr><w:rFonts w:eastAsia="標楷體"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>Dimension</w:t></w:r><w:r w:rsidRPr="00A8132B"><w:rPr><w:rFonts w:eastAsia="標楷體"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>：</w:t></w:r><w:r><w:rPr><w:rFonts w:eastAsia="標楷體" w:hint="eastAsia"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${escapeXml(dimValue)}</w:t></w:r></w:p></w:tc></w:tr>`;

  return xml.substring(0, trStart) + newTr + xml.substring(removeEnd);
}

/**
 * 移除「裝裱/裝框形式」行，同時移除緊跟其後的空白分隔行
 * 模板中裝裱行後面有一個 gridSpan=10 的空白行，若不移除會導致空白頁
 */
function removeMountingRow(xml: string): string {
  // 找到「裝裱/裝框形式」或 "Type of Mounting" 所在的 <w:tr>
  const mountIdx = xml.indexOf("Type of Mounting");
  if (mountIdx === -1) return xml;

  const trStart = xml.lastIndexOf("<w:tr ", mountIdx);
  const trEnd = xml.indexOf("</w:tr>", mountIdx) + "</w:tr>".length;
  if (trStart === -1 || trEnd === -1) return xml;

  // 檢查並移除裝裱行後面的空白行（gridSpan=10、無文字無圖片）
  const nextTrStart = xml.indexOf("<w:tr ", trEnd);
  const nextTrEnd = xml.indexOf("</w:tr>", nextTrStart) + "</w:tr>".length;
  let removeEnd = trEnd;
  if (nextTrStart !== -1 && nextTrEnd !== -1) {
    const nextTr = xml.substring(nextTrStart, nextTrEnd);
    const isEmptyRow = nextTr.includes('gridSpan w:val="10"') &&
      !nextTr.includes("<w:drawing>") &&
      !nextTr.replace(/<[^>]+>/g, "").trim();
    if (isEmptyRow) {
      removeEnd = nextTrEnd;
    }
  }

  // 移除裝裱行（及後續空白行）
  return xml.substring(0, trStart) + xml.substring(removeEnd);
}

/**
 * 將 document.xml 中特定選項前的 □ 替換為 ■（表示已勾選）
 * 模板中 □ 在獨立的 <w:t>□</w:t> 中，選項文字在後續的 <w:t> 中
 * 使用中文部分作為搜尋關鍵字，避免跨標籤文字無法匹配的問題
 */
function checkOption(xml: string, optionText: string): string {
  // 從選項文字中提取中文部分作為搜尋關鍵字
  // 例如 "曾修復Restored" → "曾修復"
  //      "未曾修復 Unrestored" → "未曾修復"
  //      "髒汙 Dirty" → "髒汙"
  const chineseMatch = optionText.match(/^([\u4e00-\u9fa5]+)/);
  const searchKey = chineseMatch ? chineseMatch[1] : optionText.split(" ")[0];

  // 搜尋所有 <w:t>□</w:t> 的位置
  const boxPattern = /<w:t[^>]*>□<\/w:t>/g;
  let match: RegExpExecArray | null;
  while ((match = boxPattern.exec(xml)) !== null) {
    // 只檢查這個 □ 到下一個 □ 之間的文字（避免跨選項誤匹配）
    // 並去除 XML 標籤後再 includes，支援中文被拆成跨 <w:t> 的情況（如「龜裂」）
    const nextBoxIdx = xml.indexOf("□", match.index + match[0].length);
    const segmentEnd = nextBoxIdx === -1 ? match.index + 500 : nextBoxIdx;
    const segment = xml.substring(match.index, segmentEnd);
    const stripped = segment.replace(/<[^>]+>/g, "");
    if (stripped.includes(searchKey)) {
      // 找到匹配，將這個 □ 替換為 ■
      const before = xml.substring(0, match.index);
      const replacement = match[0].replace("□", "■");
      const after = xml.substring(match.index + match[0].length);
      return before + replacement + after;
    }
  }
  return xml;
}

// ── 照片行 XML 生成 ────────────────────────────────────────────────────────

/**
 * 生成單張照片 cell 的 XML（含圖片，使用動態尺寸不拉伸）
 * 每個 cell 占表格 10 欄的一半（gridSpan=5），等寬
 */
function generatePhotoCellXml(
  photo: { dataUrl: string; caption: string },
  rid: string | undefined,
  imgId: number
): string {
  const cellW = 4901;
  const gridSpan = 5;
  let xml = `<w:tc><w:tcPr><w:tcW w:w="${cellW}" w:type="dxa"/><w:gridSpan w:val="${gridSpan}"/>`;
  xml += '<w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tcBorders>';
  xml += '<w:vAlign w:val="center"/></w:tcPr>';
  xml += '<w:p><w:pPr><w:widowControl/><w:spacing w:beforeLines="50" w:before="180" w:afterLines="50" w:after="180"/><w:jc w:val="center"/><w:rPr><w:rFonts w:eastAsia="標楷體"/></w:rPr></w:pPr>';
  if (photo.dataUrl && rid) {
    const { cx, cy } = calculateImageEmu(photo.dataUrl, cellW);
    xml += '<w:r><w:rPr><w:rFonts w:eastAsia="標楷體"/><w:noProof/></w:rPr><w:drawing>';
    xml += '<wp:inline distT="0" distB="0" distL="0" distR="0">';
    xml += `<wp:extent cx="${cx}" cy="${cy}"/>`;
    xml += '<wp:effectExtent l="0" t="0" r="0" b="0"/>';
    xml += `<wp:docPr id="${imgId}" name="圖片 ${imgId}"/>`;
    xml += '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>';
    xml += '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">';
    xml += `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${imgId}" name="照片${imgId}.jpg"/><pic:cNvPicPr/></pic:nvPicPr>`;
    xml += `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`;
    xml += `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`;
    xml += '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  xml += '</w:p></w:tc>';
  return xml;
}

/**
 * 生成說明文字 cell 的 XML
 */
function generateCaptionCellXml(caption: string): string {
  const cellW = 4901;
  const gridSpan = 5;
  let xml = `<w:tc><w:tcPr><w:tcW w:w="${cellW}" w:type="dxa"/><w:gridSpan w:val="${gridSpan}"/>`;
  xml += '<w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr>';
  xml += '<w:p><w:pPr><w:widowControl/><w:spacing w:beforeLines="50" w:before="180" w:afterLines="50" w:after="180"/><w:jc w:val="both"/><w:rPr><w:rFonts w:eastAsia="標楷體"/><w:noProof/></w:rPr></w:pPr>';
  if (caption) {
    xml += '<w:r><w:rPr><w:rFonts w:eastAsia="標楷體" w:hint="eastAsia"/><w:noProof/></w:rPr><w:t>' + escapeXml(caption) + '</w:t></w:r>';
  }
  xml += '</w:p></w:tc>';
  return xml;
}

/**
 * 生成照片區的表格行 XML（插入到表格 1 的基底材/媒材行之後，或獨立表格）
 * 使用 gridSpan=5，每行最多 2 張照片，每頁最多 4 張照片
 * 不生成空圖格，每張照片下方必須有註釋欄
 */
function generatePhotoRowsXml(
  photos: { dataUrl: string; caption: string }[],
  imageRidMap: Map<number, string>,
  startIndex: number
): string {
  if (photos.length === 0) return "";

  // 按每頁 4 張分組
  const pages: { dataUrl: string; caption: string }[][] = [];
  for (let i = 0; i < photos.length; i += 4) {
    pages.push(photos.slice(i, i + 4));
  }

  let xml = "";
  let globalIndex = startIndex;

  for (const page of pages) {
    // 按每行 2 張分組
    for (let rowStart = 0; rowStart < page.length; rowStart += 2) {
      const rowPhotos = page.slice(rowStart, rowStart + 2);
      // 奇數張時補齊偶數格子，保持 2 欄排版
      while (rowPhotos.length < 2) {
        rowPhotos.push({ dataUrl: "", caption: "" });
      }

      // 圖片行
      xml += '<w:tr w:rsidR="00B21D61" w:rsidTr="00EF5901"><w:trPr><w:jc w:val="center"/></w:trPr>';
      for (let i = 0; i < rowPhotos.length; i++) {
        const photo = rowPhotos[i];
        const rid = photo.dataUrl ? imageRidMap.get(globalIndex + i) : undefined;
        xml += generatePhotoCellXml(photo, rid, globalIndex + i + 1);
      }
      xml += '</w:tr>';

      // 註釋行
      xml += '<w:tr w:rsidR="00B21D61" w:rsidTr="00EF5901"><w:trPr><w:trHeight w:val="563"/><w:jc w:val="center"/></w:trPr>';
      for (let i = 0; i < rowPhotos.length; i++) {
        xml += generateCaptionCellXml(rowPhotos[i].caption);
      }
      xml += '</w:tr>';

      globalIndex += rowPhotos.length;
    }
  }

  return xml;
}

/**
 * 生成獨立的照片表格 XML（用於狀態照片，放在典藏品現狀表格之後）
 * 包裹在 <w:tbl> 中，使用 10 欄結構
 */
function generatePhotoTableXml(
  photos: { dataUrl: string; caption: string }[],
  imageRidMap: Map<number, string>,
  startIndex: number
): string {
  const rows = generatePhotoRowsXml(photos, imageRidMap, startIndex);
  if (!rows) return "";
  // 10 欄表格定義，與表格 1 相同
  const gridCols = '<w:gridCol w:w="1140"/><w:gridCol w:w="164"/><w:gridCol w:w="316"/><w:gridCol w:w="855"/><w:gridCol w:w="2231"/><w:gridCol w:w="217"/><w:gridCol w:w="917"/><w:gridCol w:w="178"/><w:gridCol w:w="1240"/><w:gridCol w:w="2544"/>';
  return `<w:tbl><w:tblPr><w:tblW w:w="9802" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${gridCols}</w:tblGrid>${rows}</w:tbl>`;
}

// ── Word 匯出 ───────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
let templateCache: Buffer | null = null;

async function loadTemplate(): Promise<Buffer> {
  if (templateCache) return templateCache;
  const templatePath = join(__dirname, "templates", "blank-template.docx");
  templateCache = await readFile(templatePath);
  return templateCache;
}

export async function generateWord(artwork: ArtworkWithPhotos): Promise<Buffer> {
  const templateBuffer = await loadTemplate();
  const zip = await JSZip.loadAsync(templateBuffer);

  let documentXml = await zip.file("word/document.xml")!.async("string");
  let relsXml = await zip.file("word/_rels/document.xml.rels")!.async("string");
  let contentTypesXml = await zip.file("[Content_Types].xml")!.async("string");

  const cond = getConditionData(artwork);
  const cats = getCategoryArray(artwork);
  const titleText = artwork.titleNotProvided ? "未提供" : (artwork.title || "");
  const dimensionText = artwork.dimensionLength || artwork.dimensionWidth || artwork.dimensionHeight
    ? `${fmtDimension(artwork.dimensionLength)}×${fmtDimension(artwork.dimensionWidth)}×${fmtDimension(artwork.dimensionHeight)} cm`
    : "";

  // ── 替換 Table 1（一般資料）填寫區 ──
  // Row 1: 作品名稱
  documentXml = replaceValueAfterLabel(documentXml, "作品名稱", titleText);
  // Row 2: 作品作者
  documentXml = replaceValueAfterLabel(documentXml, "作品作者", artwork.artist || "");
  // Row 2: 作品年代
  documentXml = replaceValueAfterLabel(documentXml, "作品年代", fmtDate(artwork.era));
  // Row 3: 作品編號
  documentXml = replaceValueAfterLabel(documentXml, "作品編號", artwork.artworkNo || "");
  // Row 3: 檢視員
  documentXml = replaceValueAfterLabel(documentXml, "檢視員", artwork.registrar || "");
  // Row 4: 收件日期
  documentXml = replaceValueAfterLabel(documentXml, "收件日期", fmtDate(artwork.receiveDate));
  // Row 4: 檢視日期
  documentXml = replaceValueAfterLabel(documentXml, "檢視日期", fmtDate(artwork.registrationDate));

  // Row 5: 作品尺寸 - 只保留尺寸資訊，移除「未裝裱/畫心」「裝裱/裱框」等文字
  documentXml = replaceDimensionRow(documentXml, dimensionText);

  // Row 7: 類別 checkbox
  for (const cat of CATEGORY_ITEMS) {
    const checked = cats.includes(cat.key);
    if (checked) {
      documentXml = checkOption(documentXml, cat.label);
    }
  }

  // Row 8: 基底材
  documentXml = replaceValueAfterLabel(documentXml, "基底材", artwork.support || "");
  // Row 8: 媒材
  documentXml = replaceValueAfterLabel(documentXml, "媒材", artwork.mediaDescription || "");

  // 移除「裝裱/裝框形式 Type of Mounting or Frame」行
  documentXml = removeMountingRow(documentXml);

  // ── 替換 Table 2（典藏品現狀）checkbox ──
  // 按 section 範圍處理，避免同一選項（如 dirty）跨 section 誤勾選
  // section 邊界用下一個 section 的標題定位
  const sectionStartLabels: Record<string, string> = {
    supports: "典藏品現狀",
    paintLayers: "繪畫層",
    protectLayer: "保護層",
    stretcher: "內框",
    frame: "外框",
  };
  const sectionStarts: number[] = CONDITION_SECTIONS.map(
    (s) => findLabelInXml(documentXml, sectionStartLabels[s.key] ?? s.key)
  );

  for (let i = 0; i < CONDITION_SECTIONS.length; i++) {
    const section = CONDITION_SECTIONS[i];
    const sectionData = cond[section.key];
    const items = sectionData?.items ?? [];
    const note = sectionData?.note ?? "";

    const startIdx = sectionStarts[i];
    if (startIdx === -1) {
      // 找不到 section 標題，fallback 到全域處理
      for (const opt of section.options) {
        if (items.includes(opt.key)) {
          documentXml = checkOption(documentXml, opt.label);
        }
      }
      continue;
    }

    // section 結束位置 = 下一個 section 標題位置（或文檔結尾）
    const endIdx = i + 1 < sectionStarts.length && sectionStarts[i + 1] !== -1
      ? sectionStarts[i + 1]
      : documentXml.length;

    // 在 section 範圍內替換 □ 為 ■（□→■ 長度不變，位置不偏移）
    let sectionXml = documentXml.substring(startIdx, endIdx);
    for (const opt of section.options) {
      if (items.includes(opt.key)) {
        sectionXml = checkOption(sectionXml, opt.label);
      }
    }
    documentXml = documentXml.substring(0, startIdx) + sectionXml + documentXml.substring(endIdx);

    // 替換備註 Note（目前是空格）
    if (note) {
      // 找到 section 的備註行並填入
      // 備註行的 pattern: "備註Note：" 後面有空格的 cell
      // 這部分較難精確替換，暫時在備註後面找空格替換
    }
  }

  // ── 處理照片（分為作品照片和狀態照片）──
  const artworkPhotos = (artwork.photos?.filter((p) => p.photoType === "artwork") ?? [])
    .filter((p) => p.dataUrl && p.dataUrl.startsWith("data:image/"));
  const conditionPhotos = (artwork.photos?.filter((p) => p.photoType === "condition") ?? [])
    .filter((p) => p.dataUrl && p.dataUrl.startsWith("data:image/"));
  const allPhotos = [...artworkPhotos, ...conditionPhotos];

  if (allPhotos.length > 0) {
    // 為每張圖片創建關係和媒體檔案
    const imageRidMap = new Map<number, string>();
    let nextRid = 100;

    const ridRegex = /Id="rId(\d+)"/g;
    let ridMatch: RegExpExecArray | null;
    while ((ridMatch = ridRegex.exec(relsXml)) !== null) {
      const num = parseInt(ridMatch[1]);
      if (num >= nextRid) nextRid = num + 1;
    }

    for (let i = 0; i < allPhotos.length; i++) {
      const photo = allPhotos[i];
      const base64Data = photo.dataUrl.split(",")[1];
      if (!base64Data) continue;

      const imageBuffer = Buffer.from(base64Data, "base64");
      const rid = `rId${nextRid + i}`;
      imageRidMap.set(i, rid);

      const ext = photo.dataUrl.includes("image/png") ? "png" : "jpg";
      zip.file(`word/media/photo${i + 1}.${ext}`, imageBuffer);

      const relEntry = `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/photo${i + 1}.${ext}"/>`;
      relsXml = relsXml.replace("</Relationships>", relEntry + "</Relationships>");

      if (ext === "jpg" && !contentTypesXml.includes("Extension=\"jpg\"")) {
        contentTypesXml = contentTypesXml.replace("</Types>", '<Default Extension="jpg" ContentType="image/jpeg"/></Types>');
      }
      if (ext === "png" && !contentTypesXml.includes("Extension=\"png\"")) {
        contentTypesXml = contentTypesXml.replace("</Types>", '<Default Extension="png" ContentType="image/png"/></Types>');
      }
    }

    // 作品照片：插入到表格 1 的基底材/媒材行之後（使用行 XML，不包裹表格）
    if (artworkPhotos.length > 0) {
      const artworkData = artworkPhotos.map((p) => ({
        dataUrl: p.dataUrl,
        caption: p.caption || "",
      }));
      const artworkRowsXml = generatePhotoRowsXml(artworkData, imageRidMap, 0);
      if (artworkRowsXml) {
        const mediaIdx = documentXml.indexOf("媒材");
        if (mediaIdx !== -1) {
          const mediaTrEnd = documentXml.indexOf("</w:tr>", mediaIdx);
          if (mediaTrEnd !== -1) {
            const insertPos = mediaTrEnd + "</w:tr>".length;
            documentXml = documentXml.substring(0, insertPos) + artworkRowsXml + documentXml.substring(insertPos);
          }
        }
      }
    }

    // 狀態照片：放到典藏品現狀表格（最後一個 </w:tbl>）之後，作為獨立表格
    if (conditionPhotos.length > 0) {
      const conditionData = conditionPhotos.map((p) => ({
        dataUrl: p.dataUrl,
        caption: p.caption || "",
      }));
      const startIndex = artworkPhotos.length;
      const conditionTableXml = generatePhotoTableXml(conditionData, imageRidMap, startIndex);
      if (conditionTableXml) {
        const lastTblIdx = documentXml.lastIndexOf("</w:tbl>");
        if (lastTblIdx !== -1) {
          const insertPos = lastTblIdx + "</w:tbl>".length;
          documentXml = documentXml.substring(0, insertPos) + conditionTableXml + documentXml.substring(insertPos);
        }
      }
    }
  }

  // 寫回修改後的 XML
  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", relsXml);
  zip.file("[Content_Types].xml", contentTypesXml);

  const result = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return result;
}

// ── PDF 匯出 ────────────────────────────────────────────────────────────────

export async function generatePdf(artwork: ArtworkWithPhotos): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const fs = await import("node:fs");
  const path = await import("node:path");

  // 找中文字體：優先使用專案內建的標楷體（確保 Docker 容器可用），其次系統內建 Noto Sans CJK（Docker 已安裝 fonts-noto-cjk）
  const bundledFont = path.join(process.cwd(), "assets", "fonts", "kaiu.ttf");
  const fontPaths = [
    bundledFont,
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttf",
    "C:\\Windows\\Fonts\\kaiu.ttf",
  ];
  let fontPath = "";
  for (const fp of fontPaths) {
    try {
      if (fs.existsSync(fp)) {
        fontPath = fp;
        break;
      }
    } catch {
      // ignore
    }
  }

  // A4: 595.28 x 841.89 pt
  // 邊距：top/bottom=1440 twips=2.54cm=72pt, left/right=1080 twips=1.9cm=54pt
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginTop = 72;
  const marginBottom = 72;
  const marginLeft = 54;
  const marginRight = 54;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const doc = new PDFDocument({
    size: [pageWidth, pageHeight],
    margins: { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight },
    info: {
      Title: `藝術典藏管理銀行典藏品檢視登錄表-${artwork.title}-${artwork.artist}`,
    },
  });

  if (fontPath) {
    doc.font(fontPath);
  }

  const cond = getConditionData(artwork);
  const cats = getCategoryArray(artwork);
  const titleText = artwork.titleNotProvided ? "未提供" : (artwork.title || "");
  const dimensionText = artwork.dimensionLength || artwork.dimensionWidth || artwork.dimensionHeight
    ? `${fmtDimension(artwork.dimensionLength)}×${fmtDimension(artwork.dimensionWidth)}×${fmtDimension(artwork.dimensionHeight)} cm`
    : "";

  let yPos = marginTop;
  let pageNum = 1;

  // 安全的 text 函數：臨時清除底部邊界，避免 PDFKit 自動分頁
  function safeText(text: string, x: number, y: number, opts?: { width?: number; align?: "left" | "center" | "right" }) {
    const origBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.text(text, x, y, opts);
    doc.page.margins.bottom = origBottom;
  }

  // 頁首：地址文字（新細明體 8pt 灰色）
  function drawHeader() {
    doc.fontSize(8);
    doc.fillColor("808080");
    const headerText = "833高雄市鳥松區澄清路840號 Tel 886-7-735-8800 ext 6304,  Fax 886-7-735-8927  http://art.csu.edu.tw/atcrs/index.html";
    safeText(headerText, marginLeft, 28, { width: contentWidth, align: "center" });
    doc.fillColor("000000");
  }

  // 頁尾：登錄人員 + 頁碼（標楷體 12pt）
  function drawFooter() {
    doc.fontSize(10);
    const footerY = pageHeight - 40;
    const registrar = artwork.registrar || "";
    const footerText = `登錄人員：${registrar}      審查人員：          (第 ${pageNum}頁)`;
    safeText(footerText, marginLeft, footerY, { width: contentWidth, align: "left" });
  }

  function ensureSpace(needed: number) {
    if (yPos + needed > pageHeight - marginBottom - 20) {
      drawFooter();
      doc.addPage();
      pageNum++;
      drawHeader();
      yPos = marginTop + 15;
    }
  }

  // 照片網格繪製（2x2，每頁最多 4 張，上圖下文）
  // 直接存取外部閉包變數 yPos, pageNum 等
  function drawPhotosGrid(photos: { dataUrl: string; caption?: string | null }[]) {
    if (photos.length === 0) return;
    const photoColW = 490.1 / 2; // 與一般資料表格同寬
    const photoImgH = 120; // 與 Word 一致（Word 圖片高度≈118pt）
    const photoCaptionH = 25;

    for (let i = 0; i < photos.length; i += 4) {
      const pagePhotos = photos.slice(i, i + 4);
      const rowCount = Math.ceil(pagePhotos.length / 2); // 1 或 2 行
      const gridHeight = rowCount * (photoImgH + photoCaptionH);
      // 換頁檢查
      if (yPos + gridHeight > pageHeight - marginBottom - 20) {
        drawFooter();
        doc.addPage();
        pageNum++;
        drawHeader();
        yPos = marginTop + 15;
      }

      for (let row = 0; row < rowCount; row++) {
        for (let col = 0; col < 2; col++) {
          const idx = row * 2 + col;
          const photo = pagePhotos[idx];
          if (!photo) break; // 不補齊，只畫實際照片
          const x = tableLeft + col * photoColW;
          const y = yPos + row * (photoImgH + photoCaptionH);

          // 圖片
          doc.rect(x, y, photoColW, photoImgH).stroke();
          if (photo.dataUrl && photo.dataUrl.startsWith("data:image/")) {
            try {
              const base64Data = photo.dataUrl.split(",")[1];
              if (base64Data) {
                const imgBuffer = Buffer.from(base64Data, "base64");
                doc.image(imgBuffer, x + 5, y + 5, {
                  fit: [photoColW - 10, photoImgH - 10],
                  align: "center",
                  valign: "center",
                });
              }
            } catch {
              // 圖片載入失敗
            }
          }

          // 說明
          doc.rect(x, y + photoImgH, photoColW, photoCaptionH).stroke();
          doc.fontSize(10);
          if (photo.caption) {
            safeText(photo.caption, x + 3, y + photoImgH + 5, { width: photoColW - 6, align: "center" });
          }
        }
      }
      yPos += gridHeight + 10;
    }
  }

  // 第一頁頁首
  drawHeader();
  yPos = marginTop + 15;

  // 標題（標楷體 14pt，置中）
  doc.fontSize(14);
  safeText("藝術典藏管理銀行典藏品檢視登錄表", marginLeft, yPos, { width: contentWidth, align: "center" });
  yPos += 22;
  safeText("Art Collections Management Bank— Condition Report", marginLeft, yPos, { width: contentWidth, align: "center" });
  yPos += 22;

  // A. 一般資料（標楷體 14pt bold）
  doc.fontSize(14);
  doc.font(fontPath ? fontPath : "Helvetica");
  // 模擬粗體
  safeText("一般資料 General Data", marginLeft, yPos, { width: contentWidth });
  yPos += 24;

  // Table 1: 一般資料（手繪表格）
  // 欄寬（twips → pt）：1 twip = 1/20 pt
  // GridCols: 1140, 164, 316, 855, 2231, 217, 917, 178, 1240, 2544
  // 表格總寬 9802 twips = 490.1pt
  const colWidths = [1140, 164, 316, 855, 2231, 217, 917, 178, 1240, 2544].map(w => w / 20);
  const tableLeft = (pageWidth - 490.1) / 2; // 置中

  function drawCell(x: number, y: number, w: number, h: number, text: string, opts?: { bold?: boolean; size?: number; align?: string }) {
    doc.rect(x, y, w, h).stroke();
    const fontSize = opts?.size ?? 10;
    const align = (opts?.align ?? "center") as "left" | "center" | "right";
    doc.fontSize(fontSize);
    const lines = text.split("\n");
    const lineHeight = fontSize * 1.2;
    const startY = y + (h - lines.length * lineHeight) / 2;
    lines.forEach((line, i) => {
      safeText(line, x + 2, startY + i * lineHeight, { width: w - 4, align });
    });
  }

  const cellH = 22;

  // Row 1: 作品名稱 Title | 填寫區 (gridSpan 2+8)
  let xPos = tableLeft;
  const r1c1w = colWidths[0] + colWidths[1]; // 1304 twips
  const r1c2w = colWidths.slice(2).reduce((s, w) => s + w, 0); // 8498 twips
  drawCell(xPos, yPos, r1c1w, cellH, "作品名稱\nTitle", { size: 10 });
  drawCell(xPos + r1c1w, yPos, r1c2w, cellH, titleText, { size: 10 });
  yPos += cellH;

  // Row 2: 作品作者Author | 填寫區 | 作品年代Era/Date of Collection | 填寫區
  xPos = tableLeft;
  const r2c1w = colWidths[0] + colWidths[1]; // 1304
  const r2c2w = colWidths[2] + colWidths[3] + colWidths[4]; // 3402
  const r2c3w = colWidths[5] + colWidths[6] + colWidths[7] + colWidths[8]; // 2552
  const r2c4w = colWidths[9]; // 2544
  drawCell(xPos, yPos, r2c1w, cellH, "作品作者\nAuthor", { size: 10 });
  drawCell(xPos + r2c1w, yPos, r2c2w, cellH, artwork.artist || "", { size: 10 });
  drawCell(xPos + r2c1w + r2c2w, yPos, r2c3w, cellH, "作品年代\nEra/Date", { size: 10 });
  drawCell(xPos + r2c1w + r2c2w + r2c3w, yPos, r2c4w, cellH, fmtDate(artwork.era), { size: 10 });
  yPos += cellH;

  // Row 3: 作品編號Registered No. | 填寫區 | 檢視員Register | 填寫區
  xPos = tableLeft;
  const r3c1w = colWidths[0] + colWidths[1] + colWidths[2]; // 1620
  const r3c2w = colWidths[3] + colWidths[4]; // 3086
  const r3c3w = colWidths[5] + colWidths[6]; // 1134
  const r3c4w = colWidths[7] + colWidths[8] + colWidths[9]; // 3962
  drawCell(xPos, yPos, r3c1w, cellH, "作品編號\nRegistered No.", { size: 9 });
  drawCell(xPos + r3c1w, yPos, r3c2w, cellH, artwork.artworkNo || "", { size: 10 });
  drawCell(xPos + r3c1w + r3c2w, yPos, r3c3w, cellH, "檢視員\nRegister", { size: 9 });
  drawCell(xPos + r3c1w + r3c2w + r3c3w, yPos, r3c4w, cellH, artwork.registrar || "", { size: 10 });
  yPos += cellH;

  // Row 4: 收件日期 | 填寫區 | 檢視日期 | 填寫區
  xPos = tableLeft;
  const r4c1w = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]; // 2475
  const r4c2w = colWidths[4]; // 2231
  const r4c3w = colWidths[5] + colWidths[6] + colWidths[7] + colWidths[8]; // 2552
  const r4c4w = colWidths[9]; // 2544
  drawCell(xPos, yPos, r4c1w, cellH, "收件日期(yyyy/mm/dd)\nDate of Receive", { size: 8 });
  drawCell(xPos + r4c1w, yPos, r4c2w, cellH, fmtDate(artwork.receiveDate), { size: 10 });
  drawCell(xPos + r4c1w + r4c2w, yPos, r4c3w, cellH, "檢視日期(yyyy/mm/dd)\nDate of Registration", { size: 8 });
  drawCell(xPos + r4c1w + r4c2w + r4c3w, yPos, r4c4w, cellH, fmtDate(artwork.registrationDate), { size: 10 });
  yPos += cellH;

  // Row 5: 作品尺寸（整行，只保留尺寸資訊，與 Word 一致）
  xPos = tableLeft;
  drawCell(xPos, yPos, 490.1, cellH, `作品尺寸Dimension：${dimensionText}`, { size: 10, align: "left" });
  yPos += cellH;

  // Row 7: 類別
  xPos = tableLeft;
  const catLine1 = CATEGORY_ITEMS.map((c) => {
    const checked = cats.includes(c.key);
    let label = c.label;
    if (c.key === "others" && artwork.categoryOther) {
      label = `${c.label} ${artwork.categoryOther}`;
    }
    return `${checked ? "■" : "□"}${label}`;
  });
  const catText = `類別Category：${catLine1.join("   ")}`;
  doc.rect(xPos, yPos, 490.1, cellH * 2).stroke();
  doc.fontSize(9);
  safeText(catText, xPos + 3, yPos + 5, { width: 490.1 - 6 });
  yPos += cellH * 2;

  // Row 8: 基底材 + 媒材
  xPos = tableLeft;
  const r8c1w = colWidths[0]; // 1140
  const r8c2w = colWidths.slice(1, 6).reduce((s, w) => s + w, 0); // 3783
  const r8c3w = colWidths[6] + colWidths[7]; // 1095
  const r8c4w = colWidths[8] + colWidths[9]; // 3784
  drawCell(xPos, yPos, r8c1w, cellH, "基底材\nSupport", { size: 9 });
  drawCell(xPos + r8c1w, yPos, r8c2w, cellH, artwork.support || "", { size: 10 });
  drawCell(xPos + r8c1w + r8c2w, yPos, r8c3w, cellH, "媒材\nMedia", { size: 9 });
  drawCell(xPos + r8c1w + r8c2w + r8c3w, yPos, r8c4w, cellH, artwork.mediaDescription || "", { size: 10 });
  yPos += cellH;

  // 作品照片：插入到基底材/媒材行之後（與 Word 一致）
  const artworkPhotos = (artwork.photos?.filter((p) => p.photoType === "artwork") ?? [])
    .filter((p) => p.dataUrl && p.dataUrl.startsWith("data:image/"));
  if (artworkPhotos.length > 0) {
    drawPhotosGrid(artworkPhotos);
    yPos += 10;
  }

  // B. 典藏品現狀（強制分頁，與 Word 一致）
  drawFooter();
  doc.addPage();
  pageNum++;
  drawHeader();
  yPos = marginTop + 15;
  doc.fontSize(14);
  safeText("典藏品現狀 Art Object Condition", marginLeft, yPos, { width: contentWidth });
  yPos += 24;

  // Table 2: 典藏品現狀
  // GridCols: 1302, 1234, 19, 1424, 2679, 2776 (總 9434 twips = 471.7pt)
  const t2Width = 471.7;
  const t2Left = (pageWidth - t2Width) / 2;
  const t2ColWidths = [1302, 1234, 19, 1424, 2679, 2776].map(w => w / 20);

  for (const section of CONDITION_SECTIONS) {
    const sectionData = cond[section.key];
    const items = sectionData?.items ?? [];
    const note = sectionData?.note ?? "";

    const sectionTitle = section.key === "supports" ? "基底材 Supports" :
      section.key === "paintLayers" ? "繪畫層 Paint layers" :
      section.key === "protectLayer" ? "保護層 Protect Layer" :
      section.key === "stretcher" ? "內框 Stretcher" :
      section.key === "frame" ? "外框 Frame" : "";

    // 計算需要多少行
    const rowH = 18; // 降低行高，讓 5 個 section 都在同一頁
    const optionRows = Math.ceil(section.options.length / 3);
    const totalRows = optionRows + 1; // +1 for note row
    const sectionHeight = totalRows * rowH;
    const titleColWidth = t2ColWidths[0]; // 1302/20 = 65.1pt

    ensureSpace(sectionHeight);

    // 繪製 section
    xPos = t2Left;
    const titleHeight = totalRows * rowH;

    // 標題欄（垂直合併）
    doc.rect(xPos, yPos, titleColWidth, titleHeight).stroke();
    doc.fontSize(9);
    const titleLines = sectionTitle.split(" ");
    safeText(titleLines[0] || "", xPos + 2, yPos + 4, { width: titleColWidth - 4, align: "center" });
    if (titleLines[1]) {
      safeText(titleLines[1], xPos + 2, yPos + 16, { width: titleColWidth - 4, align: "center" });
    }

    // 選項行（每行3個）
    for (let i = 0; i < section.options.length; i += 3) {
      const rowOpts = section.options.slice(i, i + 3);
      const rowY = yPos + (i / 3) * rowH;
      let optX = xPos + titleColWidth;

      for (let j = 0; j < 3; j++) {
        const opt = rowOpts[j];
        // 計算欄寬（模擬 gridSpan）
        let cellW;
        if (j === 0) {
          cellW = t2ColWidths[1] + t2ColWidths[2] + t2ColWidths[3]; // 1234+19+1424=2677
        } else if (j === 1) {
          cellW = t2ColWidths[4]; // 2679
        } else {
          cellW = t2ColWidths[5]; // 2776
        }

        if (opt) {
          const isChecked = items.includes(opt.key);
          const checkMark = isChecked ? "■" : "□";
          drawCell(optX, rowY, cellW, rowH, `${checkMark}${opt.label}`, { size: 9, align: "left" });
        } else {
          doc.rect(optX, rowY, cellW, rowH).stroke();
        }
        optX += cellW;
      }
    }

    // 備註行
    const noteRowY = yPos + optionRows * rowH;
    const noteLabelW = t2ColWidths[1] + t2ColWidths[2]; // 1234+19=1253
    const noteValueW = t2ColWidths[3] + t2ColWidths[4] + t2ColWidths[5]; // 1424+2679+2776=6879

    doc.rect(xPos + titleColWidth, noteRowY, noteLabelW, rowH).stroke();
    doc.fontSize(9);
    safeText("備註Note：", xPos + titleColWidth + 3, noteRowY + 4, { width: noteLabelW - 6 });

    doc.rect(xPos + titleColWidth + noteLabelW, noteRowY, noteValueW, rowH).stroke();
    safeText(note, xPos + titleColWidth + noteLabelW + 3, noteRowY + 4, { width: noteValueW - 6 });

    yPos = noteRowY + rowH; // 不再加間隔
  }

  // 狀態照片：放到典藏品現狀表格之後（與 Word 一致，強制分頁）
  const conditionPhotos = (artwork.photos?.filter((p) => p.photoType === "condition") ?? [])
    .filter((p) => p.dataUrl && p.dataUrl.startsWith("data:image/"));
  if (conditionPhotos.length > 0) {
    drawFooter();
    doc.addPage();
    pageNum++;
    drawHeader();
    yPos = marginTop + 15;
    drawPhotosGrid(conditionPhotos);
  }

  drawFooter();

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

// ── 檔名產生 ─────────────────────────────────────────────────────────────────

export function getExportFilename(artwork: ArtworkWithPhotos): string {
  const title = artwork.title || "未命名";
  const artist = artwork.artist || "未知作者";
  const entryDate = fmtDate(artwork.entryDate).replace(/\//g, "");
  return `藝術典藏管理銀行典藏品檢視登錄表-${title}-${artist}-${entryDate}`;
}

// ── 作品清單 PDF 匯出 ────────────────────────────────────────────────────────

export interface ListPdfItem {
  id: number;
  artworkNo: string;
  title: string;
  titleNotProvided?: number | boolean;
  artist: string;
  status: string;
  thumbnail: string | null;
  entryDate: string | Date;
  outDate?: string | null; // 已格式化的出庫日期字串
}

/**
 * 產生作品清單 PDF：表格含 作品縮圖 / 作品名稱 / 時間（在庫=入庫時間，出庫=出庫時間）
 */
export async function generateListPdf(items: ListPdfItem[]): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const fs = await import("node:fs");
  const path = await import("node:path");

  // 載入中文字型
  // 載入中文字型：優先專案內建標楷體，其次系統 Noto Sans CJK（Docker 已安裝 fonts-noto-cjk）
  const bundledFont = path.join(process.cwd(), "assets", "fonts", "kaiu.ttf");
  const fontPaths = [
    bundledFont,
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttf",
    "C:\\Windows\\Fonts\\kaiu.ttf",
  ];
  let fontPath = "";
  for (const fp of fontPaths) {
    try {
      if (fs.existsSync(fp)) {
        fontPath = fp;
        break;
      }
    } catch {
      // ignore
    }
  }

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginLeft = 40;
  const marginRight = 40;
  const marginTop = 50;
  const marginBottom = 40;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const doc = new PDFDocument({
    size: [pageWidth, pageHeight],
    margins: { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight },
    info: { Title: "作品清單" },
  });

  if (fontPath) {
    doc.font(fontPath);
  }

  // 安全 text：避免 PDFKit 自動分頁
  function safeText(text: string, x: number, y: number, opts?: { width?: number; align?: "left" | "center" | "right"; size?: number; color?: string }) {
    const origBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fontSize(opts?.size ?? 9);
    if (opts?.color) {
      doc.fillColor(opts.color);
    }
    doc.text(text, x, y, opts ? { width: opts.width, align: opts.align } : undefined);
    if (opts?.color) {
      doc.fillColor("000000");
    }
    doc.page.margins.bottom = origBottom;
  }

  // 表格欄位定義
  // 縮圖 | 作品名稱 / 編號 | 作者 | 狀態 | 時間
  const colThumb = 60;
  const colStatus = 55;
  const colDate = 80;
  const colArtist = 100;
  const colTitle = contentWidth - colThumb - colStatus - colDate - colArtist;
  const rowH = 60;
  const headerH = 24;

  let yPos = marginTop;

  // 標題
  safeText("作品清單", marginLeft, yPos, { width: contentWidth, align: "center", size: 16 });
  yPos += 28;

  function drawHeaderRow() {
    // 表頭：透明底色、格線、內容置中
    doc.fillColor("000000");
    // 畫外框與分隔線
    doc.rect(marginLeft, yPos, contentWidth, headerH).stroke();
    let x = marginLeft;
    // 縮圖
    doc.rect(x, yPos, colThumb, headerH).stroke();
    safeText("縮圖", x, yPos + 6, { width: colThumb, align: "center" });
    x += colThumb;
    // 名稱
    doc.rect(x, yPos, colTitle, headerH).stroke();
    safeText("名稱", x, yPos + 6, { width: colTitle, align: "center" });
    x += colTitle;
    // 作者
    doc.rect(x, yPos, colArtist, headerH).stroke();
    safeText("作者", x, yPos + 6, { width: colArtist, align: "center" });
    x += colArtist;
    // 狀態
    doc.rect(x, yPos, colStatus, headerH).stroke();
    safeText("狀態", x, yPos + 6, { width: colStatus, align: "center" });
    x += colStatus;
    // 時間
    doc.rect(x, yPos, colDate, headerH).stroke();
    safeText("時間", x, yPos + 6, { width: colDate, align: "center" });
    yPos += headerH;
  }

  drawHeaderRow();

  for (const item of items) {
    // 分頁檢查：剩餘空間不足一列時換頁
    if (yPos + rowH > pageHeight - marginBottom) {
      doc.addPage();
      yPos = marginTop;
      drawHeaderRow();
    }

    // 列框線
    doc.rect(marginLeft, yPos, contentWidth, rowH).stroke();

    // 縮圖
    let x = marginLeft;
    doc.rect(x, yPos, colThumb, rowH).stroke();
    if (item.thumbnail && item.thumbnail.startsWith("data:image")) {
      try {
        doc.image(item.thumbnail, x + 4, yPos + 4, { width: colThumb - 8, height: rowH - 8, fit: [colThumb - 8, rowH - 8], align: "center", valign: "center" });
      } catch {
        safeText("（圖）", x, yPos + rowH / 2 - 5, { width: colThumb, align: "center" });
      }
    } else {
      safeText("—", x, yPos + rowH / 2 - 5, { width: colThumb, align: "center" });
    }
    x += colThumb;

    // 作品名稱（不含編號）
    doc.rect(x, yPos, colTitle, rowH).stroke();
    const titleText = item.titleNotProvided ? "未提供" : (item.title || "");
    safeText(titleText, x + 4, yPos + rowH / 2 - 5, { width: colTitle - 8, align: "center", size: 10 });
    x += colTitle;

    // 作者
    doc.rect(x, yPos, colArtist, rowH).stroke();
    safeText(item.artist || "", x + 4, yPos + rowH / 2 - 5, { width: colArtist - 8, align: "center", size: 9 });
    x += colArtist;

    // 狀態：在庫綠色、出庫紅色、其他黑色
    doc.rect(x, yPos, colStatus, rowH).stroke();
    let statusColor = "000000";
    if (item.status === "在庫") {
      statusColor = "1a7a3a";
    } else if (item.status === "出庫") {
      statusColor = "c0392b";
    }
    safeText(item.status || "", x, yPos + rowH / 2 - 5, { width: colStatus, align: "center", size: 9, color: statusColor });
    x += colStatus;

    // 時間：在庫顯示入庫時間，出庫顯示出庫時間
    doc.rect(x, yPos, colDate, rowH).stroke();
    let dateText = "";
    if (item.status === "出庫" && item.outDate) {
      dateText = item.outDate;
    } else {
      try {
        const d = new Date(item.entryDate);
        dateText = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
      } catch {
        dateText = "";
      }
    }
    safeText(dateText, x, yPos + rowH / 2 - 5, { width: colDate, align: "center", size: 9 });

    yPos += rowH;
  }

  // 統計列
  yPos += 8;
  safeText(`共 ${items.length} 件作品`, marginLeft, yPos, { width: contentWidth, align: "right", size: 9 });

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
  return buffer;
}
