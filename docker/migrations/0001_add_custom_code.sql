-- Migration: 新增藏家自訂編號欄位 (customCode)
-- 說明：於 artworks 表新增 customCode 欄位，供藏家自訂編號使用（選填，不匯出至 PDF/Word）
-- 執行方式：對現有資料庫執行此 SQL；全新部署時 docker/init-db.sql 已包含此欄位

ALTER TABLE `artworks`
  ADD COLUMN `customCode` varchar(64) DEFAULT NULL
  AFTER `artworkNo`;
