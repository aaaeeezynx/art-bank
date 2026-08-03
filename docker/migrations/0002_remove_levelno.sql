-- Migration: 移除層號欄位(levelNo)、釋放架位狀態(isOccupied) 改為多對一
-- 說明：
--   1. 因 storage_locations 移除 levelNo，locationCode 由 305-A-03-01 變為 305-A-03
--   2. 為避免新 locationCode 與舊資料衝突，先重組 locationCode 並加 unique 索引
--   3. isOccupied 欄位移除（改以 artworks.locationId 關聯判斷）
-- 執行方式：對現有資料庫執行此 SQL；全新部署時 docker/init-db.sql 已套用

-- 1. 移除舊的 locationCode unique index（若是存在）
ALTER TABLE `storage_locations` DROP INDEX IF EXISTS `storage_locations_locationCode_unique`;
-- fallback：若上面語法在你的 MySQL 版本不支援，請手動執行：
-- SHOW INDEX FROM storage_locations WHERE Key_name LIKE '%locationCode%';
-- ALTER TABLE storage_locations DROP INDEX <index_name>;

-- 2. 重新組裝 locationCode（去掉層號部分：305-A-03-01 → 305-A-03）
UPDATE `storage_locations`
SET `locationCode` = CONCAT(
  `warehouseNo`, '-', UPPER(`zone`), '-', LPAD(`shelfNo`, 2, '0')
);

-- 3. 若有重複的 locationCode（例如 305-A-03-01 與 305-A-03-02 會變成兩個 305-A-03）
--    將較新建立的 id 之後加上 -DUP-<id> 避免衝突
UPDATE `storage_locations` sl
JOIN (
  SELECT id FROM (
    SELECT id, locationCode,
           ROW_NUMBER() OVER (PARTITION BY locationCode ORDER BY id) AS rn
    FROM `storage_locations`
  ) t WHERE rn > 1
) dup ON sl.id = dup.id
SET sl.locationCode = CONCAT(sl.locationCode, '-DUP-', sl.id);

-- 4. 移除 levelNo 欄位
ALTER TABLE `storage_locations` DROP COLUMN `levelNo`;

-- 5. 移除 isOccupied 欄位
ALTER TABLE `storage_locations` DROP COLUMN `isOccupied`;

-- 6. 加入 locationCode unique index
ALTER TABLE `storage_locations` ADD UNIQUE INDEX `storage_locations_locationCode_unique` (`locationCode`);
