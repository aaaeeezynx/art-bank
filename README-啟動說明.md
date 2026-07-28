# Art Bank 一鍵啟動說明

## 概述
本專案提供三個檔案，讓你能在任何 Windows 電腦上「一鍵」啟動 Art Bank（包含資料庫 + 前端網頁）：

| 檔案 | 用途 |
|------|------|
| `Start-ArtBank.ps1` | 主啟動腳本（自動啟動 Docker Desktop、啟動容器、開啟瀏覽器） |
| `Create-Shortcut.ps1` | 建立桌面捷徑（雙擊即可啟動） |
| `README-啟動說明.md` | 本說明文件 |

---

## 快速開始（三步驟）

### 1. 複製專案資料夾
將整個 `artbank-collection` 資料夾複製到目標電腦的任意位置（如桌面、D 槽等）。
**預設路徑：`C:\Users\user\Desktop\artbank-collection`**

### 2. 建立桌面捷徑（只需做一次）
1. 開啟 `artbank-collection` 資料夾
2. 右鍵點擊 `Create-Shortcut.ps1` → 選擇 **「以 PowerShell 執行」**
3. 桌面會出現「Art Bank 啟動器」捷徑

> **注意**：若專案不在預設路徑 `C:\Users\user\Desktop\artbank-collection`，腳本會提示您輸入正確路徑。

### 3. 一鍵啟動
雙擊桌面上的 **「Art Bank 啟動器」** 捷徑，腳本會自動：
1. ✅ 檢查並啟動 Docker Desktop（若未開啟）
2. ✅ 清理舊容器
3. ✅ 啟動 MySQL 資料庫 + Art Bank 應用容器
4. ✅ 等待健康檢查通過
5. ✅ 自動開啟瀏覽器至 `http://localhost:3000`

---

## 進階用法（命令列參數）

直接在 PowerShell 中執行 `Start-ArtBank.ps1` 可帶參數：

```powershell
# 使用預設路徑（C:\Users\user\Desktop\artbank-collection）
.\Start-ArtBank.ps1

# 指定專案路徑（專案不在預設位置時使用）
.\Start-ArtBank.ps1 -ProjectPath "D:\我的專案\artbank-collection"

# 強制重新建置 Docker 映像檔（修改程式碼後使用）
.\Start-ArtBank.ps1 -ProjectPath "D:\我的專案\artbank-collection" -Rebuild

# 不自動開啟瀏覽器
.\Start-ArtBank.ps1 -NoBrowser

# 組合使用
.\Start-ArtBank.ps1 -ProjectPath "D:\專案\artbank-collection" -Rebuild -NoBrowser
```

---

## 系統需求

| 需求 | 版本 | 備註 |
|------|------|------|
| Windows | 10/11 | 需支援 PowerShell 5.1+ |
| Docker Desktop | 最新版 | 必須已安裝並登入 |
| 記憶體 | 4 GB 以上 | 建議 8 GB |
| 硬碟空間 | 5 GB 以上 | 含資料庫與映像檔 |

---

## 常見問題

### Q: 點擊捷徑沒反應 / 跳出紅字錯誤？
A: 
1. 確認已安裝 **Docker Desktop** 並登入
2. 確認專案資料夾裡有 `docker-compose.yml` 和 `Dockerfile`
3. 若 PowerShell 限制執行腳本，請以「系統管理員」開啟 PowerShell 執行：
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### Q: Docker Desktop 啟動很久？
A: 首次啟動需下載映像檔（約 2-5 分鐘），請耐心等待。視窗會顯示進度點 `......`。

### Q: 瀏覽器開啟但顯示無法連線？
A: 容器可能尚未完全就緒。請等待 10-20 秒後重新整理，或查看視窗是否顯示「所有服務健康檢查通過」。

### Q: 要如何停止服務？
A: 在 PowerShell 中進入專案資料夾執行：
```powershell
docker compose down
```
若要連資料一起刪除：
```powershell
docker compose down -v
```

### Q: 想修改資料庫密碼或設定？
A: 
1. 複製 `.env.example` 為 `.env`
2. 編輯 `.env` 中的 `DATABASE_URL`、`JWT_SECRET` 等
3. 執行 `.\Start-ArtBank.ps1 -Rebuild` 重新建置

### Q: 移動專案資料夾後捷徑失效？
A: 重新執行 `Create-Shortcut.ps1` 即可更新捷徑路徑。

---

## 手動啟動（不使用捷徑）

若不想用捷徑，可直接在 PowerShell 中執行：

```powershell
# 進入專案資料夾
cd "D:\你的路徑\artbank-collection"

# 啟動（首次加 --build）
docker compose up -d --build

# 查看狀態
docker compose ps

# 查看日誌
docker compose logs -f

# 開啟瀏覽器
start http://localhost:3000
```

---

## 專案結構說明

```
artbank-collection/
├── Start-ArtBank.ps1          # 主啟動腳本
├── Create-Shortcut.ps1        # 建立捷徑腳本
├── README-啟動說明.md         # 本檔案
├── docker-compose.yml         # Docker 編排設定
├── Dockerfile                 # 應用映像檔建置
├── docker-entrypoint.sh       # 容器啟動腳本
├── docker/
│   └── init-db.sql            # 初始化資料庫（含測試資料）
├── client/                    # 前端原始碼
├── server/                    # 後端原始碼
└── shared/                    # 共用型別
```

---

## 服務資訊

| 服務 | 位址 | 說明 |
|------|------|------|
| 前端網頁 | http://localhost:3000 | 主介面 |
| API 伺服器 | http://localhost:3000/api | tRPC API |
| MySQL 資料庫 | localhost:3306 | root / artbank123 |

---

## 更新專案

當專案有程式碼更新時：

1. 取得最新程式碼（Git pull 或重新下載）
2. 執行 `.\Start-ArtBank.ps1 -Rebuild` 重新建置映像檔
3. 或手動執行：`docker compose up -d --build`

---

## 授權
MIT License
