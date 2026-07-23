import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  uniqueIndex,
  decimal,
  json,
  tinyint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    passwordHash: text("passwordHash"), // email/password 登入用（OAuth 使用者為 null）
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── 媒材類別 ──────────────────────────────────────────────────────────────────
// CW = Canvas Work 畫布作品
// PW = Paper Work 紙質作品
// WW = Wood Work 木質作品
// MW = Metal Work 金屬作品
// TW = Textile Work 織品作品
// MM = Mixed Media 複合媒材
export const MEDIUM_CODES = {
  canvas: "CW",
  paper: "PW",
  wood: "WW",
  metal: "MW",
  textile: "TW",
  mixed: "MM",
} as const;

export type MediumType = keyof typeof MEDIUM_CODES;

// ── 作品狀態 ──────────────────────────────────────────────────────────────────
export const ARTWORK_STATUSES = ["在庫", "出庫", "暫放", "借展", "修護"] as const;
export type ArtworkStatus = (typeof ARTWORK_STATUSES)[number];

// ── 操作類型 ──────────────────────────────────────────────────────────────────
export const OPERATION_TYPES = ["入庫", "出庫", "暫放", "借展", "修護", "歸庫", "位置變更"] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];

// ── 庫房架位 ──────────────────────────────────────────────────────────────────
export const storageLocations = mysqlTable("storage_locations", {
  id: int("id").autoincrement().primaryKey(),
  warehouseNo: varchar("warehouseNo", { length: 16 }).notNull(),   // 庫房編號，如 305
  zone: varchar("zone", { length: 4 }).notNull(),                   // 分區，如 A
  shelfNo: varchar("shelfNo", { length: 4 }).notNull(),             // 層架編號，如 03
  levelNo: varchar("levelNo", { length: 4 }).notNull(),             // 層號，如 01
  locationCode: varchar("locationCode", { length: 32 }).notNull(),  // 自動組合，如 305-A-03-01
  description: text("description"),
  isOccupied: int("isOccupied").default(0).notNull(),               // 0=空置, 1=使用中
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StorageLocation = typeof storageLocations.$inferSelect;
export type InsertStorageLocation = typeof storageLocations.$inferInsert;

// ── 作品 ──────────────────────────────────────────────────────────────────────
export const artworks = mysqlTable("artworks", {
  id: int("id").autoincrement().primaryKey(),
  artworkNo: varchar("artworkNo", { length: 32 }).notNull().unique(), // AC-CW-20260520-001
  title: varchar("title", { length: 256 }).notNull(),
  titleNotProvided: tinyint("titleNotProvided").default(0).notNull(), // 1=未提供
  artist: varchar("artist", { length: 128 }).notNull(),
  collector: varchar("collector", { length: 128 }),
  medium: mysqlEnum("medium", ["canvas", "paper", "wood", "metal", "textile", "mixed"]).notNull(),
  mediumCode: varchar("mediumCode", { length: 4 }).notNull(),         // CW / PW / WW / MW / TW / MM
  status: mysqlEnum("status", ["在庫", "出庫", "暫放", "借展", "修護"]).default("在庫").notNull(),
  locationId: int("locationId"),                                       // FK → storage_locations.id
  locationCode: varchar("locationCode", { length: 32 }),              // 冗餘存一份方便顯示
  entryDate: date("entryDate").notNull(),                             // 入庫日期
  era: date("era"),                                                   // 作品年代
  registrar: varchar("registrar", { length: 128 }),                   // 檢視員
  receiveDate: date("receiveDate"),                                   // 收件日期
  registrationDate: date("registrationDate"),                         // 檢視日期
  dimensionLength: decimal("dimensionLength", { precision: 10, scale: 2 }),
  dimensionWidth: decimal("dimensionWidth", { precision: 10, scale: 2 }),
  dimensionHeight: decimal("dimensionHeight", { precision: 10, scale: 2 }),
  category: json("category"),                                          // 選中的類別陣列
  categoryOther: text("categoryOther"),                                // 其他類別文字
  support: text("support"),                                            // 基底材
  mediaDescription: text("mediaDescription"),                          // 媒材
  conditionData: json("conditionData"),                                // 典藏品現狀 JSON
  thumbnail: text("thumbnail"),                                        // 作品縮圖（base64 data URL）
  notes: text("notes"),
  // 借展相關
  loanStartDate: date("loanStartDate"),
  loanEndDate: date("loanEndDate"),
  loanOrganization: varchar("loanOrganization", { length: 256 }),
  // 修護相關
  conservationInstitution: varchar("conservationInstitution", { length: 256 }),
  conservationDueDate: date("conservationDueDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const artworkPhotos = mysqlTable("artwork_photos", {
  id: int("id").autoincrement().primaryKey(),
  artworkId: int("artworkId").notNull(),
  photoType: mysqlEnum("photoType", ["artwork", "condition"]).notNull(),
  dataUrl: text("dataUrl").notNull(),
  caption: text("caption"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ArtworkPhoto = typeof artworkPhotos.$inferSelect;
export type InsertArtworkPhoto = typeof artworkPhotos.$inferInsert;

export type Artwork = typeof artworks.$inferSelect;
export type InsertArtwork = typeof artworks.$inferInsert;

// ── 操作紀錄 ──────────────────────────────────────────────────────────────────
export const artworkOperations = mysqlTable("artwork_operations", {
  id: int("id").autoincrement().primaryKey(),
  artworkId: int("artworkId").notNull(),                              // FK → artworks.id
  artworkNo: varchar("artworkNo", { length: 32 }).notNull(),
  operationType: mysqlEnum("operationType", ["入庫", "出庫", "暫放", "借展", "修護", "歸庫", "位置變更"]).notNull(),
  operatorName: varchar("operatorName", { length: 128 }),
  operationDate: date("operationDate").notNull(),
  // 借展欄位
  loanStartDate: date("loanStartDate"),
  loanEndDate: date("loanEndDate"),
  loanOrganization: varchar("loanOrganization", { length: 256 }),
  // 修護欄位
  conservationInstitution: varchar("conservationInstitution", { length: 256 }),
  conservationDueDate: date("conservationDueDate"),
  // 出庫欄位
  outReason: varchar("outReason", { length: 512 }),
  // 位置相關
  fromLocationCode: varchar("fromLocationCode", { length: 32 }),
  toLocationCode: varchar("toLocationCode", { length: 32 }),
  toLocationId: int("toLocationId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ArtworkOperation = typeof artworkOperations.$inferSelect;
export type InsertArtworkOperation = typeof artworkOperations.$inferInsert;
