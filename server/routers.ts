import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { hashPassword, verifyPassword } from "./_core/password";
import { ENV } from "./_core/env";
import { nanoid } from "nanoid";
import {
  createArtwork,
  createArtworkPhotos,
  createOperation,
  createPasswordUser,
  createStorageLocation,
  deleteArtwork,
  deleteArtworkPhoto,
  deleteStorageLocation,
  getArtworkById,
  getArtworkWithPhotos,
  getArtworks,
  getDashboardStats,
  getExpiringLoans,
  getOperationsByArtworkId,
  getRecentOperations,
  getStorageLocationById,
  getStorageLocations,
  getUserByEmail,
  replaceArtworkPhotos,
  updateArtwork,
  updateStorageLocation,
} from "./db";

// ── 庫房路由 ──────────────────────────────────────────────────────────────────
const storageRouter = router({
  list: protectedProcedure.query(() => getStorageLocations()),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getStorageLocationById(input.id)),

  create: protectedProcedure
    .input(
      z.object({
        warehouseNo: z.string().min(1),
        zone: z.string().min(1).max(4),
        shelfNo: z.string().min(1).max(4),
        levelNo: z.string().min(1).max(4),
        description: z.string().optional(),
      })
    )
    .mutation(({ input }) =>
      createStorageLocation({
        warehouseNo: input.warehouseNo,
        zone: input.zone,
        shelfNo: input.shelfNo,
        levelNo: input.levelNo,
        locationCode: "",
        description: input.description ?? null,
        isOccupied: 0,
      })
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        warehouseNo: z.string().optional(),
        zone: z.string().optional(),
        shelfNo: z.string().optional(),
        levelNo: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateStorageLocation(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteStorageLocation(input.id)),
});

// ── 作品路由 ──────────────────────────────────────────────────────────────────
const artworkRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        medium: z.string().optional(),
        collector: z.string().optional(),
        warehouseNo: z.string().optional(),
      }).optional()
    )
    .query(({ input }) => getArtworks(input ?? {})),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getArtworkWithPhotos(input.id)),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        titleNotProvided: z.boolean().optional(),
        artist: z.string().min(1),
        collector: z.string().optional(),
        customCode: z.string().optional(),
        medium: z.enum(["canvas", "paper", "wood", "metal", "textile", "mixed"]),
        entryDate: z.string(),
        era: z.string().optional(),
        registrar: z.string().optional(),
        receiveDate: z.string().optional(),
        registrationDate: z.string().optional(),
        dimensionLength: z.string().optional(),
        dimensionWidth: z.string().optional(),
        dimensionHeight: z.string().optional(),
        category: z.array(z.string()).optional(),
        categoryOther: z.string().optional(),
        support: z.string().optional(),
        mediaDescription: z.string().optional(),
        conditionData: z
          .object({
            supports: z.object({ items: z.array(z.string()), note: z.string().optional() }).optional(),
            paintLayers: z.object({ items: z.array(z.string()), note: z.string().optional() }).optional(),
            protectLayer: z.object({ items: z.array(z.string()), note: z.string().optional() }).optional(),
            stretcher: z.object({ items: z.array(z.string()), note: z.string().optional() }).optional(),
            frame: z.object({ items: z.array(z.string()), note: z.string().optional() }).optional(),
          })
          .optional(),
        locationId: z.number().optional(),
        locationCode: z.string().optional(),
        notes: z.string().optional(),
        thumbnail: z.string().optional(),
        photos: z.array(
          z.object({
            photoType: z.enum(["artwork", "condition"]),
            dataUrl: z.string(),
            caption: z.string().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const artwork = await createArtwork({
        title: input.title,
        titleNotProvided: input.titleNotProvided ? 1 : 0,
        artist: input.artist,
        collector: input.collector ?? null,
        customCode: input.customCode ?? null,
        medium: input.medium,
        entryDate: input.entryDate as any,
        era: (input.era ?? null) as any,
        registrar: input.registrar ?? null,
        receiveDate: (input.receiveDate ?? null) as any,
        registrationDate: (input.registrationDate ?? null) as any,
        dimensionLength: input.dimensionLength ?? null,
        dimensionWidth: input.dimensionWidth ?? null,
        dimensionHeight: input.dimensionHeight ?? null,
        category: input.category ?? null,
        categoryOther: input.categoryOther ?? null,
        support: input.support ?? null,
        mediaDescription: input.mediaDescription ?? null,
        conditionData: input.conditionData ?? null,
        locationId: input.locationId ?? null,
        locationCode: input.locationCode ?? null,
        notes: input.notes ?? null,
        thumbnail: input.thumbnail ?? null,
        status: "在庫",
        loanStartDate: null,
        loanEndDate: null,
        loanOrganization: null,
        conservationInstitution: null,
        conservationDueDate: null,
      });

      if (artwork) {
        // 記錄入庫操作
        await createOperation({
          artworkId: artwork.id,
          artworkNo: artwork.artworkNo,
          operationType: "入庫",
          operatorName: ctx.user?.name ?? "系統",
          operationDate: input.entryDate as any,
          toLocationCode: input.locationCode ?? null,
          toLocationId: input.locationId ?? null,
          notes: input.notes ?? null,
          loanStartDate: null,
          loanEndDate: null,
          loanOrganization: null,
          conservationInstitution: null,
          conservationDueDate: null,
          outReason: null,
          fromLocationCode: null,
        });

        // 標記架位為使用中
        if (input.locationId) {
          await updateStorageLocation(input.locationId, { isOccupied: 1 });
        }

        // 儲存作品照片與狀態照片
        if (input.photos && input.photos.length > 0) {
          await createArtworkPhotos(
            artwork.id,
            input.photos.map((p) => ({ ...p, caption: p.caption ?? null }))
          );
        }
      }

      return artwork;
    }),

  deletePhoto: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteArtworkPhoto(input.id)),

  // 刪除作品（含照片、操作紀錄一併刪除，並釋放架位）
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteArtwork(input.id)),

  // 編輯作品資料（不含 status、artworkNo 等不可改欄位）— 全部欄位非必填
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        titleNotProvided: z.boolean().optional(),
        artist: z.string().optional(),
        collector: z.string().optional(),
        customCode: z.string().optional(),
        medium: z.enum(["canvas", "paper", "wood", "metal", "textile", "mixed"]).optional(),
        entryDate: z.string().optional(),
        era: z.string().optional(),
        registrar: z.string().optional(),
        receiveDate: z.string().optional(),
        registrationDate: z.string().optional(),
        dimensionLength: z.string().optional(),
        dimensionWidth: z.string().optional(),
        dimensionHeight: z.string().optional(),
        category: z.array(z.string()).optional(),
        categoryOther: z.string().optional(),
        support: z.string().optional(),
        mediaDescription: z.string().optional(),
        conditionData: z
          .object({
            supports: z.object({ items: z.array(z.string()), note: z.string().optional() }).optional(),
            paintLayers: z.object({ items: z.array(z.string()), note: z.string().optional() }).optional(),
            protectLayer: z.object({ items: z.array(z.string()), note: z.string().optional() }).optional(),
            stretcher: z.object({ items: z.array(z.string()), note: z.string().optional() }).optional(),
            frame: z.object({ items: z.array(z.string()), note: z.string().optional() }).optional(),
          })
          .optional(),
        locationId: z.number().optional(),
        locationCode: z.string().optional(),
        notes: z.string().optional(),
        thumbnail: z.string().optional(),
        photos: z.array(
          z.object({
            photoType: z.enum(["artwork", "condition"]),
            dataUrl: z.string(),
            caption: z.string().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateArtwork(input.id, {
        title: input.title,
        titleNotProvided: input.titleNotProvided ? 1 : 0,
        artist: input.artist,
        collector: input.collector ?? null,
        customCode: input.customCode ?? null,
        medium: input.medium,
        entryDate: input.entryDate as any,
        era: (input.era ?? null) as any,
        registrar: input.registrar ?? null,
        receiveDate: (input.receiveDate ?? null) as any,
        registrationDate: (input.registrationDate ?? null) as any,
        dimensionLength: input.dimensionLength ?? null,
        dimensionWidth: input.dimensionWidth ?? null,
        dimensionHeight: input.dimensionHeight ?? null,
        category: input.category ?? null,
        categoryOther: input.categoryOther ?? null,
        support: input.support ?? null,
        mediaDescription: input.mediaDescription ?? null,
        conditionData: input.conditionData ?? null,
        locationId: input.locationId ?? null,
        locationCode: input.locationCode ?? null,
        notes: input.notes ?? null,
        thumbnail: input.thumbnail ?? null,
      });

      // 若有提供照片則取代所有照片
      if (input.photos) {
        await replaceArtworkPhotos(input.id, input.photos);
      }

      return getArtworkWithPhotos(input.id);
    }),

  // 狀態操作：出庫、暫放、借展、修護、歸庫
  operate: protectedProcedure
    .input(
      z.object({
        artworkId: z.number(),
        operationType: z.enum(["出庫", "暫放", "借展", "修護", "歸庫", "位置變更"]),
        operationDate: z.string(),
        notes: z.string().optional(),
        // 借展
        loanStartDate: z.string().optional(),
        loanEndDate: z.string().optional(),
        loanOrganization: z.string().optional(),
        // 修護
        conservationInstitution: z.string().optional(),
        conservationDueDate: z.string().optional(),
        // 出庫
        outReason: z.string().optional(),
        // 位置
        toLocationId: z.number().optional(),
        toLocationCode: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const artwork = await getArtworkById(input.artworkId);
      if (!artwork) throw new Error("作品不存在");

      const fromLocationCode = artwork.locationCode ?? null;

      // 決定新狀態
      const statusMap: Record<string, string> = {
        出庫: "出庫",
        暫放: "暫放",
        借展: "借展",
        修護: "修護",
        歸庫: "在庫",
        位置變更: artwork.status,
      };
      const newStatus = statusMap[input.operationType] as any;

      // 更新作品
      const updateData: Record<string, any> = {
        status: newStatus,
      };

      if (input.operationType === "借展") {
        updateData.loanStartDate = input.loanStartDate ?? null;
        updateData.loanEndDate = input.loanEndDate ?? null;
        updateData.loanOrganization = input.loanOrganization ?? null;
      }
      if (input.operationType === "修護") {
        updateData.conservationInstitution = input.conservationInstitution ?? null;
        updateData.conservationDueDate = input.conservationDueDate ?? null;
      }
      if (input.operationType === "歸庫" || input.operationType === "位置變更") {
        if (input.toLocationId) {
          updateData.locationId = input.toLocationId;
          updateData.locationCode = input.toLocationCode ?? null;
          // 釋放舊架位
          if (artwork.locationId) {
            await updateStorageLocation(artwork.locationId, { isOccupied: 0 });
          }
          // 佔用新架位
          await updateStorageLocation(input.toLocationId, { isOccupied: 1 });
        }
      }
      if (input.operationType === "出庫" || input.operationType === "暫放" || input.operationType === "借展" || input.operationType === "修護") {
        // 出庫時釋放架位
        if (artwork.locationId) {
          await updateStorageLocation(artwork.locationId, { isOccupied: 0 });
        }
        updateData.locationId = null;
        updateData.locationCode = null;
      }

      await updateArtwork(input.artworkId, updateData);

      // 記錄操作
      const op = await createOperation({
        artworkId: input.artworkId,
        artworkNo: artwork.artworkNo,
        operationType: input.operationType,
        operatorName: ctx.user?.name ?? "系統",
        operationDate: input.operationDate as any,
        fromLocationCode,
        toLocationCode: input.toLocationCode ?? null,
        toLocationId: input.toLocationId ?? null,
        loanStartDate: (input.loanStartDate ?? null) as any,
        loanEndDate: (input.loanEndDate ?? null) as any,
        loanOrganization: input.loanOrganization ?? null,
        conservationInstitution: input.conservationInstitution ?? null,
        conservationDueDate: (input.conservationDueDate ?? null) as any,
        outReason: input.outReason ?? null,
        notes: input.notes ?? null,
      });

      return { success: true, operationId: op.id };
    }),
});

// ── 操作紀錄路由 ──────────────────────────────────────────────────────────────
const operationRouter = router({
  listByArtwork: protectedProcedure
    .input(z.object({ artworkId: z.number() }))
    .query(({ input }) => getOperationsByArtworkId(input.artworkId)),

  recent: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(({ input }) => getRecentOperations(input?.limit ?? 10)),
});

// ── 儀表板路由 ────────────────────────────────────────────────────────────────
const dashboardRouter = router({
  stats: protectedProcedure.query(() => getDashboardStats()),
  expiringLoans: protectedProcedure
    .input(z.object({ days: z.number().optional() }).optional())
    .query(({ input }) => getExpiringLoans(input?.days ?? 30)),
});

// ── 主路由 ────────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // email/password 註冊
    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(64),
          email: z.string().email(),
          password: z.string().min(6).max(128),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await import("./db").then((m) => m.getDb());
        if (!db) throw new Error("資料庫無法連線");

        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new Error("此 Email 已被註冊");
        }

        const passwordHash = await hashPassword(input.password);
        const openId = `email:${nanoid(16)}`;
        const user = await createPasswordUser({
          email: input.email,
          name: input.name,
          passwordHash,
          openId,
        });
        if (!user) throw new Error("註冊失敗");

        const token = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, user: { id: user.id, name: user.name, email: user.email } };
      }),

    // email/password 登入
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new Error("帳號或密碼不正確");
        }

        const ok = await verifyPassword(input.password, user.passwordHash);
        if (!ok) {
          throw new Error("帳號或密碼不正確");
        }

        const token = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        await import("./db").then((m) =>
          m.upsertUser({ openId: user.openId, lastSignedIn: new Date() })
        );

        return { success: true, user: { id: user.id, name: user.name, email: user.email } };
      }),
  }),
  storage: storageRouter,
  artwork: artworkRouter,
  operation: operationRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
