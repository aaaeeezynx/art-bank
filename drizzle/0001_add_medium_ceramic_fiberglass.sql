-- 新增媒材類別：陶瓷(ceramic)、玻璃纖維(fiberglass)
ALTER TABLE `artworks`
  MODIFY COLUMN `medium` enum('canvas','paper','wood','metal','textile','ceramic','fiberglass','mixed') NOT NULL;
