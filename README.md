# Art Bank 藝術典藏管理銀行

藝術銀行典藏管理系統，提供作品入庫、典藏管理、出庫借展修護追蹤、庫房位置管理、PDF/Word 登錄表匯出等功能。

## 主要功能

- **作品入庫**：完整登錄表單（一般資料、典藏品現狀、媒材描述、庫房位置、縮圖與照片）
- **典藏作品管理**：列表搜尋（關鍵字、狀態、媒材、收藏家、庫房編號）、編輯、詳情檢視
- **狀態操作**：出庫、暫放、借展、修護、歸庫、位置變更，自動追蹤歷史紀錄
- **庫房位置管理**：庫房編號、區、架位、層級，自動產生位置代碼
- **報表匯出**：
  - PDF 登錄表（藝術典藏管理銀行典藏品檢視登錄表，標楷中文字型）
  - Word 登錄表
  - 作品清單 PDF（勾選作品後匯出表格，含縮圖、名稱、作者、狀態、時間）
- **儀表板**：在庫/出庫統計、近期操作紀錄

## 技術棧

| 領域 | 技術 |
|------|------|
| 前端 | React 19、Vite、TypeScript、Tailwind CSS、Radix UI、wouter |
| 後端 | Node.js、Express、tRPC、Drizzle ORM |
| 資料庫 | MySQL 8.0 |
| PDF/Word | PDFKit、docx、JSZip |
| 認證 | JWT（cookie）、Email/密碼登入 |
| 部署 | Docker、docker-compose |

## 專案結構

```
artbank-collection/
├── client/                  # 前端
│   └── src/
│       ├── pages/           # 頁面元件
│       │   ├── ArtworkEntry.tsx     # 作品入庫
│       │   ├── ArtworkEdit.tsx      # 作品編輯
│       │   ├── ArtworkList.tsx      # 典藏作品列表
│       │   ├── ArtworkDetail.tsx    # 作品詳情
│       │   ├── StorageManagement.tsx # 庫房管理
│       │   └── Dashboard.tsx        # 儀表板
│       ├── components/ui/   # Radix UI 元件
│       └── lib/trpc.ts      # tRPC client
├── server/                  # 後端
│   ├── _core/               # tRPC、認證、express 核心
│   ├── routers.ts           # tRPC 路由（作品、庫房、操作）
│   ├── db.ts                # Drizzle ORM 資料庫操作
│   └── export.ts            # PDF/Word 匯出邏輯
├── drizzle/                 # DB schema 與 migrations
│   └── schema.ts
├── assets/fonts/            # 中文字型（標楷 kaiu.ttf）
├── docker/                  # Docker 相關
│   └── init-db.sql          # 資料庫初始化（含測試資料）
├── Dockerfile               # 多階段建置
├── docker-compose.yml       # 一鍵部署
└── package.json
```

## 快速開始

### 需求

- Node.js 22+
- pnpm 10+
- MySQL 8.0+

### 本地開發

1. 複製專案並安裝相依套件

```bash
git clone <repo-url>
cd artbank-collection
pnpm install
```

2. 設定環境變數

```bash
cp .env.example .env
# 編輯 .env 填入 DATABASE_URL 與 JWT_SECRET
```

3. 建立資料庫 schema

```bash
pnpm db:push
```

4. 啟動開發伺服器

```bash
pnpm dev
```

開啟 http://localhost:3000

### Docker 一鍵部署（推薦）

需要先安裝 Docker Desktop。

```bash
docker compose up -d --build
```

- 應用：http://localhost:3000
- MySQL：localhost:3306

首次啟動會自動匯入測試資料（`docker/init-db.sql`）。

常用指令：

```bash
docker compose ps          # 查看狀態
docker compose logs -f     # 查看日誌
docker compose down        # 停止
docker compose down -v     # 停止並清除資料
```

## 環境變數

| 變數 | 說明 | 範例 |
|------|------|------|
| `DATABASE_URL` | MySQL 連線字串（必填） | `mysql://root:密碼@localhost:3306/artbank` |
| `JWT_SECRET` | Session JWT 密鑰（必填） | 一段隨機長字串 |
| `VITE_APP_ID` | 應用 ID | `artbank-collection` |
| `OWNER_OPEN_ID` | 管理員 openId（自動取得 admin 角色） | - |

## 測試帳號

Docker 部署後可使用以下測試帳號登入：

- 帳號：`admin@artbank.test`
- 密碼：`admin123`

## 開發指令

```bash
pnpm dev        # 啟動開發伺服器（tsx watch）
pnpm build      # 建置前端（vite）+ 後端（esbuild）
pnpm start      # 啟動正式伺服器
pnpm check      # TypeScript 型別檢查
pnpm format     # Prettier 格式化
pnpm test       # 執行測試（vitest）
pnpm db:push    # 產生並執行 Drizzle migrations
```

## 授權

MIT License
