#requires -Version 5.1
<#
.SYNOPSIS
    建立 Art Bank 一鍵啟動桌面捷徑
.DESCRIPTION
    將 Start-ArtBank.ps1 的捷徑建立在桌面，支援自訂專案路徑與參數。
    使用方式：
      1. 將此腳本與 Start-ArtBank.ps1 放在同一資料夾
      2. 右鍵點擊 →「以 PowerShell 執行」
      3. 或在 PowerShell 執行：
         .\Create-Shortcut.ps1 -ProjectPath "D:\Vibe Project\art bank\artbank-collection"
         .\Create-Shortcut.ps1 -ProjectPath "D:\Vibe Project\art bank\artbank-collection" -Rebuild
         .\Create-Shortcut.ps1 -ProjectPath "D:\Vibe Project\art bank\artbank-collection" -ShortcutName "Art Bank 啟動器"
.PARAMETER ProjectPath
    Art Bank 專案資料夾完整路徑（必填）
.PARAMETER ShortcutName
    桌面捷徑名稱（預設：Art Bank 一鍵啟動）
.PARAMETER Rebuild
    捷徑加入 -Rebuild 參數（每次啟動都重新建置）
.PARAMETER NoBrowser
    捷徑加入 -NoBrowser 參數（不自動開啟瀏覽器）
#>

param (
    [Parameter(Mandatory=$false, Position=0)]
    [string]$ProjectPath = "C:\Users\user\Desktop\artbank-collection",

    [Parameter(Mandatory=$false)]
    [string]$ShortcutName = "Art Bank 一鍵啟動",

    [Parameter(Mandatory=$false)]
    [switch]$Rebuild,

    [Parameter(Mandatory=$false)]
    [switch]$NoBrowser
)

# 設定編碼
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN"  { "Yellow" }
        "OK"    { "Green" }
        default { "Cyan" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

# 驗證專案路徑（若使用預設路徑但不存在，提示使用者輸入）
if (-not (Test-Path $ProjectPath)) {
    Write-Log "專案路徑不存在: $ProjectPath" "WARN"
    Write-Log "請輸入正確的專案資料夾完整路徑（例如：C:\Users\user\Desktop\artbank-collection）：" "WARN"
    $inputPath = Read-Host "專案路徑"
    if ([string]::IsNullOrWhiteSpace($inputPath)) {
        Write-Log "未輸入路徑，結束" "ERROR"
        exit 1
    }
    $ProjectPath = $inputPath
    if (-not (Test-Path $ProjectPath)) {
        Write-Log "路徑仍然不存在: $ProjectPath" "ERROR"
        exit 1
    }
}

$scriptPath = Join-Path $ProjectPath "Start-ArtBank.ps1"
if (-not (Test-Path $scriptPath)) {
    Write-Log "找不到 Start-ArtBank.ps1: $scriptPath" "ERROR"
    exit 1
}

Write-Log "專案路徑: $ProjectPath"
Write-Log "啟動腳本: $scriptPath"

# 取得桌面路徑
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "$ShortcutName.lnk"

# 建立捷徑
Write-Log "建立桌面捷徑: $shortcutPath"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)

# 目標：PowerShell 執行 Start-ArtBank.ps1
$shortcut.TargetPath = "powershell.exe"

# 參數：-ExecutionPolicy Bypass -File "腳本路徑" [參數]
$args = "-ExecutionPolicy Bypass -NoExit -File `"$scriptPath`""
if ($Rebuild) { $args += " -Rebuild" }
if ($NoBrowser) { $args += " -NoBrowser" }

$shortcut.Arguments = $args
$shortcut.WorkingDirectory = $ProjectPath
$shortcut.Description = "Art Bank 一鍵啟動器 - 自動啟動 Docker Desktop + 容器 + 瀏覽器"
$shortcut.IconLocation = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe,0"

$shortcut.Save()

Write-Log "捷徑建立成功！" "OK"
Write-Log "位置: $shortcutPath" "OK"
Write-Log ""
Write-Log "使用方式："
Write-Log "  1. 前往桌面找到「$ShortcutName」"
Write-Log "  2. 右鍵 → 「以系統管理員身分執行」" "WARN"
Write-Log "  3. 或直接雙擊（若 Docker 需要管理員權限）"
Write-Log ""
Write-Log "提示："
Write-Log "  - 首次執行較久（需下載映像檔），請耐心等待"
Write-Log "  - 若 Docker Desktop 需要管理員權限，請以管理員身分執行捷徑"
Write-Log "  - 想修改參數請重新執行此腳本"

Read-Host "按 Enter 結束"
