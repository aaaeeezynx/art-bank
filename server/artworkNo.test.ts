import { describe, expect, it } from "vitest";
import { formatDateCode, buildLocationCode } from "./db";

describe("作品編號產生邏輯", () => {
  it("formatDateCode 應將日期字串轉為 YYYYMMDD 格式", () => {
    expect(formatDateCode("2026-05-20")).toBe("20260520");
    expect(formatDateCode("2026-01-01")).toBe("20260101");
    expect(formatDateCode("2026-12-31")).toBe("20261231");
  });

  it("formatDateCode 應接受 Date 物件", () => {
    const d = new Date("2026-05-20T00:00:00Z");
    expect(formatDateCode(d)).toBe("20260520");
  });
});

describe("庫房位置編碼產生邏輯", () => {
  it("buildLocationCode 應正確組合位置編碼", () => {
    expect(buildLocationCode("305", "A", "3")).toBe("305-A-03");
    expect(buildLocationCode("305", "A", "03")).toBe("305-A-03");
    expect(buildLocationCode("101", "B", "12")).toBe("101-B-12");
  });

  it("buildLocationCode 應將分區轉為大寫", () => {
    expect(buildLocationCode("305", "a", "03")).toBe("305-A-03");
    expect(buildLocationCode("305", "b", "01")).toBe("305-B-01");
  });

  it("buildLocationCode 應補零至兩位數", () => {
    expect(buildLocationCode("305", "C", "1")).toBe("305-C-01");
    expect(buildLocationCode("305", "C", "9")).toBe("305-C-09");
  });
});
