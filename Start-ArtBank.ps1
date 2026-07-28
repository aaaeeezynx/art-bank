#requires -Version 5.1
<#
.SYNOPSIS
    Art Bank 一鍵啟動腳本
.DESCRIPTION
    自動檢查/啟動 Docker Desktop、啟動 Art Bank 容器、等待健康檢查、開啟瀏覽器。
.PARAMETER ProjectPath
    Art Bank 專案資料夾路徑（預設：腳本所在目錄）
.PARAMETER Rebuild
    是否重新建置映像檔（docker compose up --build）
.PARAMETER NoBrowser
    不自動開啟瀏覽器
.EXAMPLE
    .\Start-ArtBank.ps1
.EXAMPLE
    .\Start-ArtBank.ps1 -ProjectPath "D:\Projects\artbank-collection" -Rebuild
.EXAMPLE
    .\Start-ArtBank.ps1 -ProjectPath "D:\Vibe Project\art bank\artbank-collection" -NoBrowser
#>

param (
    [Parameter(Mandatory=$false, Position=0)]
    [string]$ProjectPath = $PSScriptRoot,

    [Parameter(Mandatory=$false)]
    [switch]$Rebuild,

    [Parameter(Mandatory=$false)]
    [switch]$NoBrowser
)

# 設定編碼與錯誤處理
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$host.UI.RawUI.WindowTitle = "Art Bank - 一鍵啟動"

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

function Check-AdminRights {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Start-DockerDesktop {
    Write-Log "檢查 Docker Desktop 狀態..."
    
    # 檢查 Docker 是否已在運行
    try {
        $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
        if ($dockerVersion) {
            Write-Log "Docker Desktop 已在運行 (版本: $dockerVersion)" "OK"
            return $true
        }
    } catch { }
    
    Write-Log "Docker Desktop 未運行，嘗試啟動..." "WARN"
    
    # 嘗試常見的 Docker Desktop 安裝路徑
    $dockerPaths = @(
        "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "${env:LocalAppData}\Docker\Docker\Docker Desktop.exe"
    )
    
    $dockerExe = $null
    foreach ($path in $dockerPaths) {
        if (Test-Path $path) {
            $dockerExe = $path
            break
        }
    }
    
    if (-not $dockerExe) {
        Write-Log "找不到 Docker Desktop 執行檔，請手動啟動 Docker Desktop" "ERROR"
        Write-Log "常見路徑：" "WARN"
        $dockerPaths | ForEach-Object { Write-Log "  $_" "WARN" }
        return $false
    }
    
    Write-Log "啟動 Docker Desktop: $dockerExe"
    Start-Process -FilePath $dockerExe -WindowStyle Minimized
    
    # 等待 Docker 就緒（最多 120 秒）
    Write-Log "等待 Docker 引擎就緒..."
    $maxWait = 120
    $elapsed = 0
    while ($elapsed -lt $maxWait) {
        try {
            $version = docker version --format '{{.Server.Version}}' 2>$null
            if ($version) {
                Write-Log "Docker Desktop 已就緒 (版本: $version)" "OK"
                return $true
            }
        } catch { }
        Start-Sleep -Seconds 3
        $elapsed += 3
        Write-Host "." -NoNewline -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Log "等待 Docker 就緒逾時，請手動確認 Docker Desktop 是否已啟動" "ERROR"
    return $false
}

function Check-DockerCompose {
    Write-Log "檢查 docker compose..."
    try {
        $version = docker compose version --short 2>$null
        if ($version) {
            Write-Log "docker compose 可用 (版本: $version)" "OK"
            return $true
        }
        # 嘗試舊版 docker-compose
        $version = docker-compose version --short 2>$null
        if ($version) {
            Write-Log "docker-compose 可用 (版本: $version)" "OK"
            return $true
        }
    } catch { }
    Write-Log "docker compose 不可用，請確認已安裝 Docker Desktop" "ERROR"
    return $false
}

function Check-ProjectPath {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        Write-Log "專案路徑不存在: $Path" "ERROR"
        return $false
    }
    
    $composeFile = Join-Path $Path "docker-compose.yml"
    if (-not (Test-Path $composeFile)) {
        Write-Log "找不到 docker-compose.yml: $composeFile" "ERROR"
        return $false
    }
    
    $dockerfile = Join-Path $Path "Dockerfile"
    if (-not (Test-Path $dockerfile)) {
        Write-Log "找不到 Dockerfile: $dockerfile" "ERROR"
        return $false
    }
    
    Write-Log "專案路徑驗證通過: $Path" "OK"
    return $true
}

function Stop-ExistingContainers {
    Write-Log "檢查現有容器..."
    $containers = @("artbank-app", "artbank-mysql")
    foreach ($name in $containers) {
        try {
            $container = docker ps -a --filter "name=$name" --format "{{.Names}}" 2>$null
            if ($container) {
                Write-Log "移除現有容器: $name"
                docker rm -f $name 2>$null | Out-Null
            }
        } catch { }
    }
}

function Start-Containers {
    param([string]$ProjectPath, [switch]$Rebuild)
    
    Write-Log "切換到專案目錄: $ProjectPath"
    Set-Location $ProjectPath
    
    $buildArg = if ($Rebuild) { "--build" } else { "" }
    
    Write-Log "啟動容器 (docker compose up -d $buildArg)..."
    try {
        $result = docker compose up -d $buildArg 2>&1
        Write-Log $result
    } catch {
        Write-Log "啟動容器失敗: $_" "ERROR"
        return $false
    }
    return $true
}

function Wait-ForHealthy {
    Write-Log "等待服務健康檢查通過..."
    $maxWait = 180  # 3 分鐘
    $elapsed = 0
    $services = @("artbank-mysql", "artbank-app")
    
    while ($elapsed -lt $maxWait) {
        $allHealthy = $true
        foreach ($svc in $services) {
            try {
                $health = docker inspect --format '{{.State.Health.Status}}' $svc 2>$null
                if (-not $health -or $health -ne "healthy") {
                    $allHealthy = $false
                    break
                }
            } catch {
                $allHealthy = $false
                break
            }
        }
        
        if ($allHealthy) {
            Write-Log "所有服務健康檢查通過！" "OK"
            return $true
        }
        
        Start-Sleep -Seconds 5
        $elapsed += 5
        Write-Host "." -NoNewline -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Log "等待健康檢查逾時，請檢查容器日誌：docker compose logs" "WARN"
    return $false
}

function Open-Browser {
    if ($NoBrowser) {
        Write-Log "已略過開啟瀏覽器 (-NoBrowser 參數)" "WARN"
        return
    }
    
    Write-Log "開啟瀏覽器: http://localhost:3000"
    try {
        Start-Process "http://localhost:3000"
    } catch {
        Write-Log "無法自動開啟瀏覽器，請手動開啟 http://localhost:3000" "WARN"
    }
}

function Show-Summary {
    Write-Log "==========================================" "OK"
    Write-Log "Art Bank 已成功啟動！" "OK"
    Write-Log "==========================================" "OK"
    Write-Log "前端網頁: http://localhost:3000"
    Write-Log "API 伺服器: http://localhost:3000/api"
    Write-Log "資料庫: localhost:3306 (root/artbank123)"
    Write-Log ""
    Write-Log "常用指令："
    Write-Log "  查看狀態:  docker compose ps"
    Write-Log "  查看日誌:  docker compose logs -f"
    Write-Log "  停止服務:  docker compose down"
    Write-Log "  清除資料:  docker compose down -v"
    Write-Log "==========================================" "OK"
}

# ===== 主程式 =====
try {
    Write-Log "=== Art Bank 一鍵啟動腳本 ==="
    Write-Log "專案路徑: $ProjectPath"
    
    # 1. 驗證專案路徑
    if (-not (Check-ProjectPath $ProjectPath)) {
        exit 1
    }
    
    # 2. 啟動 Docker Desktop
    if (-not (Start-DockerDesktop)) {
        exit 1
    }
    
    # 3. 檢查 docker compose
    if (-not (Check-DockerCompose)) {
        exit 1
    }
    
    # 4. 清理現有容器
    Stop-ExistingContainers
    
    # 5. 啟動容器
    if (-not (Start-Containers $ProjectPath $Rebuild)) {
        exit 1
    }
    
    # 6. 等待健康檢查
    Wait-ForHealthy
    
    # 7. 開啟瀏覽器
    Open-Browser
    
    # 8. 顯示摘要
    Show-Summary
    
} catch {
    Write-Log "發生錯誤: $_" "ERROR"
    Write-Log "腳本執行失敗，按 Enter 鍵結束..." "ERROR"
    Read-Host
    exit 1
}

Write-Log "按 Enter 鍵結束視窗..."
Read-Host
