import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  artworkOperations,
  artworkPhotos,
  artworks,
  storageLocations,
  type Artwork,
  type ArtworkPhoto,
  type InsertArtwork,
  type InsertArtworkOperation,
  type InsertArtworkPhoto,
  type InsertStorageLocation,
  type MediumType,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── 使用者 ────────────────────────────────────────────────────────────────────
import { users } from "../drizzle/schema";

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 建立以 email/password 註冊的使用者
 */
export async function createPasswordUser(input: {
  email: string;
  name: string;
  passwordHash: string;
  openId: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const values: InsertUser = {
    openId: input.openId,
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
  };
  if (input.openId === ENV.ownerOpenId) {
    values.role = "admin";
  }
  await db.insert(users).values(values);
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, input.openId))
    .limit(1);
  return result[0];
}

// ── 作品編號產生 ──────────────────────────────────────────────────────────────
const MEDIUM_CODES: Record<MediumType, string> = {
  canvas: "CW",
  paper: "PW",
  wood: "WW",
  metal: "MW",
  textile: "TW",
  ceramic: "CE",
  fiberglass: "FG",
  mixed: "MM",
};

export function formatDateCode(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export async function generateArtworkNo(medium: MediumType, entryDate: string): Promise<string> {
  const db = await getDb();
  const mediumCode = MEDIUM_CODES[medium];
  const dateCode = formatDateCode(entryDate);
  const prefix = `AC-${mediumCode}-${dateCode}-`;

  if (!db) return `${prefix}001`;

  // 查詢當天同媒材已有幾件
  const existing = await db
    .select({ artworkNo: artworks.artworkNo })
    .from(artworks)
    .where(like(artworks.artworkNo, `${prefix}%`));

  const seq = existing.length + 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

// ── 庫房位置 ──────────────────────────────────────────────────────────────────
export function buildLocationCode(warehouseNo: string, zone: string, shelfNo: string): string {
  const shelf = shelfNo.padStart(2, "0");
  return `${warehouseNo}-${zone.toUpperCase()}-${shelf}`;
}

export async function getStorageLocations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storageLocations).orderBy(storageLocations.locationCode);
}

export async function getStorageLocationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(storageLocations).where(eq(storageLocations.id, id)).limit(1);
  return result[0];
}

export async function createStorageLocation(data: InsertStorageLocation) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const locationCode = buildLocationCode(data.warehouseNo, data.zone, data.shelfNo);
  await db.insert(storageLocations).values({ ...data, locationCode });
  const result = await db
    .select()
    .from(storageLocations)
    .where(eq(storageLocations.locationCode, locationCode))
    .limit(1);
  return result[0];
}

export async function updateStorageLocation(id: number, data: Partial<InsertStorageLocation>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Partial<InsertStorageLocation> = { ...data };
  if (data.warehouseNo || data.zone || data.shelfNo) {
    const current = await getStorageLocationById(id);
    if (current) {
      const wNo = data.warehouseNo ?? current.warehouseNo;
      const z = data.zone ?? current.zone;
      const sh = data.shelfNo ?? current.shelfNo;
      updateData.locationCode = buildLocationCode(wNo, z, sh);
    }
  }
  await db.update(storageLocations).set(updateData).where(eq(storageLocations.id, id));
  return getStorageLocationById(id);
}

/**
 * 取得指定架位上所有作品（用於檢查刪除/編輯時是否安全）
 * @param locationId 架位 ID
 */
export async function getArtworksByLocationId(locationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(artworks).where(eq(artworks.locationId, locationId));
}

/**
 * 刪除庫房架位：若仍有作品指向此架位則不可刪除
 * @param id 架位 ID
 */
export async function deleteStorageLocation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const location = await getStorageLocationById(id);
  if (!location) throw new Error("架位不存在");

  const occupying = await getArtworksByLocationId(id);
  if (occupying.length > 0) {
    throw new Error(`此架位仍有 ${occupying.length} 件作品關聯，請先將作品移出再刪除`);
  }
  await db.delete(storageLocations).where(eq(storageLocations.id, id));
  return location;
}

// ── 作品 ──────────────────────────────────────────────────────────────────────
export async function getArtworks(filters?: {
  search?: string;
  status?: string;
  medium?: string;
  collector?: string;
  warehouseNo?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.search) {
    const s = `%${filters.search}%`;
    conditions.push(
      or(
        like(artworks.artworkNo, s),
        like(artworks.title, s),
        like(artworks.artist, s),
        like(artworks.collector, s),
        like(artworks.locationCode, s)
      )
    );
  }
  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(artworks.status, filters.status as any));
  }
  if (filters?.medium && filters.medium !== "all") {
    conditions.push(eq(artworks.medium, filters.medium as any));
  }
  // 收藏家精確欄位搜尋（不與一般搜尋的 OR 合併）
  if (filters?.collector) {
    conditions.push(like(artworks.collector, `%${filters.collector}%`));
  }
  // 庫房編號搜尋：只匹配 storage_locations.warehouseNo，不含 zone/shelf
  if (filters?.warehouseNo) {
    const whPattern = `%${filters.warehouseNo}%`;
    conditions.push(
      sql`${artworks.locationId} IN (SELECT id FROM storage_locations WHERE warehouseNo LIKE ${whPattern})`
    );
  }

  const query = db.select().from(artworks).orderBy(desc(artworks.createdAt));
  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

export async function getArtworkById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(artworks).where(eq(artworks.id, id)).limit(1);
  return result[0];
}

export async function createArtwork(data: Omit<InsertArtwork, "artworkNo" | "mediumCode">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const entryDateStr = typeof data.entryDate === 'string' ? data.entryDate : (data.entryDate as unknown as Date).toISOString().split('T')[0]!;
  const artworkNo = await generateArtworkNo(data.medium as MediumType, entryDateStr);
  const mediumCode = MEDIUM_CODES[data.medium as MediumType];
  await db.insert(artworks).values({ ...data, artworkNo, mediumCode });
  const result = await db.select().from(artworks).where(eq(artworks.artworkNo, artworkNo)).limit(1);
  return result[0];
}

export type ArtworkWithPhotos = Artwork & { photos: ArtworkPhoto[] };

export async function getArtworkWithPhotos(id: number): Promise<ArtworkWithPhotos | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const artwork = await getArtworkById(id);
  if (!artwork) return undefined;
  const photos = await db
    .select()
    .from(artworkPhotos)
    .where(eq(artworkPhotos.artworkId, id))
    .orderBy(artworkPhotos.sortOrder, artworkPhotos.createdAt);
  return { ...artwork, photos } as ArtworkWithPhotos;
}

export async function createArtworkPhotos(
  artworkId: number,
  photos: Omit<InsertArtworkPhoto, "artworkId">[]
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (photos.length === 0) return [];
  await db.insert(artworkPhotos).values(photos.map((p, i) => ({ ...p, artworkId, sortOrder: p.sortOrder ?? i })));
  return db
    .select()
    .from(artworkPhotos)
    .where(eq(artworkPhotos.artworkId, artworkId))
    .orderBy(artworkPhotos.sortOrder, artworkPhotos.createdAt);
}

export async function deleteArtworkPhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(artworkPhotos).where(eq(artworkPhotos.id, id));
}

/**
 * 取代作品的所有照片：先刪除舊照片，再批次插入新照片
 * @param artworkId 作品 ID
 * @param photos 新照片陣列（含 photoType, dataUrl, caption?）
 */
export async function replaceArtworkPhotos(
  artworkId: number,
  photos: { photoType: "artwork" | "condition"; dataUrl: string; caption?: string | null; sortOrder?: number }[]
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // 先刪除舊照片
  await db.delete(artworkPhotos).where(eq(artworkPhotos.artworkId, artworkId));
  // 再插入新照片
  if (photos.length > 0) {
    await db.insert(artworkPhotos).values(
      photos.map((p, i) => ({
        artworkId,
        photoType: p.photoType,
        dataUrl: p.dataUrl,
        caption: p.caption ?? null,
        sortOrder: p.sortOrder ?? i,
      }))
    );
  }
  return db
    .select()
    .from(artworkPhotos)
    .where(eq(artworkPhotos.artworkId, artworkId))
    .orderBy(artworkPhotos.sortOrder, artworkPhotos.createdAt);
}

export async function updateArtwork(id: number, data: Partial<InsertArtwork>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(artworks).set(data).where(eq(artworks.id, id));
  return getArtworkById(id);
}

/**
 * 刪除作品：一併刪除照片與操作紀錄
 * （架位為多對一關係，一個架位可被多件作品指定）
 * @param artworkId 作品 ID
 */
export async function deleteArtwork(artworkId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const artwork = await getArtworkById(artworkId);
  if (!artwork) throw new Error("作品不存在");

  // 刪除照片
  await db.delete(artworkPhotos).where(eq(artworkPhotos.artworkId, artworkId));
  // 刪除操作紀錄
  await db.delete(artworkOperations).where(eq(artworkOperations.artworkId, artworkId));
  // 刪除作品本體
  await db.delete(artworks).where(eq(artworks.id, artworkId));
  return artwork;
}

// ── 操作紀錄 ──────────────────────────────────────────────────────────────────
export async function getOperationsByArtworkId(artworkId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(artworkOperations)
    .where(eq(artworkOperations.artworkId, artworkId))
    .orderBy(desc(artworkOperations.createdAt));
}

/**
 * 批次查詢多個作品的最新出庫日期（operationType='出庫'，取最新一筆）
 * 回傳 Map<artworkId, outDate(string)>
 */
export async function getLatestOutDatesByArtworkIds(
  artworkIds: number[]
): Promise<Map<number, string>> {
  const db = await getDb();
  const result = new Map<number, string>();
  if (!db || artworkIds.length === 0) return result;
  const rows = await db
    .select({
      artworkId: artworkOperations.artworkId,
      outDate: sql<string>`MAX(${artworkOperations.operationDate})`,
    })
    .from(artworkOperations)
    .where(
      and(
        inArray(artworkOperations.artworkId, artworkIds),
        eq(artworkOperations.operationType, "出庫")
      )
    )
    .groupBy(artworkOperations.artworkId);
  for (const row of rows) {
    const d = new Date(row.outDate);
    if (!isNaN(d.getTime())) {
      result.set(row.artworkId, `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`);
    }
  }
  return result;
}

/**
 * 批次取得多個作品基本資料（含縮圖、入庫時間）
 */
export async function getArtworksByIds(artworkIds: number[]): Promise<Artwork[]> {
  const db = await getDb();
  if (!db || artworkIds.length === 0) return [];
  return db
    .select()
    .from(artworks)
    .where(inArray(artworks.id, artworkIds))
    .orderBy(desc(artworks.createdAt));
}

export async function createOperation(data: InsertArtworkOperation) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(artworkOperations).values(data);
  const result = await db
    .select()
    .from(artworkOperations)
    .where(eq(artworkOperations.artworkId, data.artworkId))
    .orderBy(desc(artworkOperations.createdAt))
    .limit(1);
  return result[0];
}

export async function getRecentOperations(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(artworkOperations).orderBy(desc(artworkOperations.createdAt)).limit(limit);
}

// ── 儀表板統計 ────────────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { total: 0, 在庫: 0, 出庫: 0, 暫放: 0, 借展: 0, 修護: 0 };

  const rows = await db
    .select({ status: artworks.status, count: sql<number>`count(*)` })
    .from(artworks)
    .groupBy(artworks.status);

  const stats: Record<string, number> = { total: 0, 在庫: 0, 出庫: 0, 暫放: 0, 借展: 0, 修護: 0 };
  for (const row of rows) {
    stats[row.status] = Number(row.count);
    stats.total += Number(row.count);
  }
  return stats;
}

export async function getExpiringLoans(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const futureDateStr = futureDate.toISOString().split("T")[0] as string;
  const todayStr = new Date().toISOString().split("T")[0] as string;

  return db
    .select()
    .from(artworks)
    .where(
      and(
        eq(artworks.status, "借展"),
        sql`${artworks.loanEndDate} IS NOT NULL`,
        sql`${artworks.loanEndDate} >= ${todayStr}`,
        sql`${artworks.loanEndDate} <= ${futureDateStr}`
      )
    )
    .orderBy(artworks.loanEndDate);
}
