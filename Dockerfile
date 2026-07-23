# ============================================================
# Art Bank - 多階段 Dockerfile
# ============================================================

# ── Stage 1: 建置階段 ──────────────────────────────────────
FROM node:22-slim AS builder

# 啟用 corepack 以使用 pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# 先複製依賴相關檔案（利用 Docker layer cache）
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# 安裝所有依賴（含 devDependencies，用於建置）
RUN pnpm install --no-frozen-lockfile

# 複製專案原始碼
COPY . .

# 建置前端 + 後端
RUN pnpm run build

# 手動複製 Word 範本到 dist（esbuild 不會自動處理非 JS 檔案）
RUN cp -r server/templates dist/templates

# ── Stage 2: 執行階段 ──────────────────────────────────────
FROM node:22-slim AS runtime

# 安裝 dumb-init（正確處理 PID 1 信號）+ 中文字型（PDF 備用）
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 從 builder 複製建置產物
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/assets/ ./assets/

# 複製啟動腳本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# 使用 dumb-init 處理信號
ENTRYPOINT ["dumb-init", "--"]
CMD ["/docker-entrypoint.sh"]
