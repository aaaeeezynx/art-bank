import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getArtworkById: vi.fn(),
    createOperation: vi.fn(),
    updateArtwork: vi.fn(),
    getStorageLocationById: vi.fn(),
    updateStorageLocation: vi.fn(),
    getOperationsByArtworkId: vi.fn(),
    getRecentOperations: vi.fn(),
    getDashboardStats: vi.fn(),
    getExpiringLoans: vi.fn(),
    getArtworks: vi.fn(),
    getStorageLocations: vi.fn(),
    createArtwork: vi.fn(),
    createStorageLocation: vi.fn(),
    getStorageLocationByCode: vi.fn(),
    formatDateCode: actual.formatDateCode,
    buildLocationCode: actual.buildLocationCode,
  };
});

import {
  getArtworkById,
  createOperation,
  updateArtwork,
  getOperationsByArtworkId,
  getDashboardStats,
  getExpiringLoans,
  getRecentOperations,
} from "./db";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "管理員",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("artwork.operate - 出庫操作", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("應成功執行出庫操作並更新作品狀態", async () => {
    const mockArtwork = {
      id: 1,
      artworkNo: "AC-CW-20260520-001",
      title: "測試作品",
      artist: "測試作者",
      status: "在庫",
      locationCode: "305-A-03",
      locationId: 1,
      medium: "canvas",
      mediumCode: "CW",
      collector: null,
      entryDate: "2026-05-20",
      notes: null,
      loanStartDate: null,
      loanEndDate: null,
      loanOrganization: null,
      conservationInstitution: null,
      conservationDueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(getArtworkById).mockResolvedValue(mockArtwork as any);
    vi.mocked(createOperation).mockResolvedValue({ id: 1 } as any);
    vi.mocked(updateArtwork).mockResolvedValue(undefined);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.artwork.operate({
      artworkId: 1,
      operationType: "出庫",
      operationDate: "2026-06-25",
      outReason: "展覽需求",
      notes: "測試備註",
    });

    expect(result).toMatchObject({ success: true });
    expect(createOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        artworkId: 1,
        operationType: "出庫",
        outReason: "展覽需求",
      })
    );
    expect(updateArtwork).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "出庫" })
    );
  });

  it("應拒絕對不存在的作品進行操作", async () => {
    vi.mocked(getArtworkById).mockResolvedValue(undefined as any);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.artwork.operate({
        artworkId: 999,
        operationType: "出庫",
        operationDate: "2026-06-25",
      })
    ).rejects.toThrow();
  });
});

describe("operation.listByArtwork - 查詢操作紀錄", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("應返回指定作品的操作紀錄列表", async () => {
    const mockOps = [
      {
        id: 1,
        artworkId: 1,
        artworkNo: "AC-CW-20260520-001",
        operationType: "入庫",
        operationDate: "2026-05-20",
        operatorName: "管理員",
        notes: null,
        createdAt: new Date(),
      },
    ];

    vi.mocked(getOperationsByArtworkId).mockResolvedValue(mockOps as any);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.operation.listByArtwork({ artworkId: 1 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ operationType: "入庫" });
  });
});

describe("dashboard.stats - 統計資料", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("應返回各狀態作品數量統計", async () => {
    const mockStats = {
      total: 10,
      在庫: 5,
      出庫: 2,
      暫放: 1,
      借展: 1,
      修護: 1,
    };

    vi.mocked(getDashboardStats).mockResolvedValue(mockStats as any);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.stats();

    expect(result).toMatchObject({ total: 10, 在庫: 5 });
  });
});
