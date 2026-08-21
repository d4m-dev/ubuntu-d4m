-- ============================================================
-- 🐉💎 LINH THÚ & LINH BẢO (Social Hub) — Migration cho DB ĐÃ TỒN TẠI
--   mysql -u d4m -padmin123 social_hub < database/spirit_items.sql
--
-- Lưu ý: KHÔNG cần seed vật phẩm ở đây — khi backend khởi động,
-- danh mục 165 mục trong backend/assets/spirit_items.json được
-- tự động đồng bộ vào bảng spirit_items (UPSERT).
-- DB mới hoàn toàn cũng không cần file này (backend tự tạo bảng).
-- ============================================================
SET NAMES utf8mb4;

-- 1️⃣ Cột trang bị trên bảng users (idempotent trên MariaDB)
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `equipped_pet` varchar(50) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `equipped_treasure` varchar(50) DEFAULT NULL;

-- 2️⃣ Danh mục Linh thú / Linh bảo (catalog)
CREATE TABLE IF NOT EXISTS `spirit_items` (
    `id`          varchar(50)  NOT NULL,
    `kind`        enum('pet','treasure') NOT NULL,
    `name`        varchar(150) NOT NULL,
    `description` varchar(255) DEFAULT NULL,
    `image`       varchar(255) NOT NULL,
    `rarity`      varchar(20)  NOT NULL DEFAULT 'common',
    `price_xu`    int(11)      NOT NULL DEFAULT 0,
    `zorder`      int(11)      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_kind` (`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3️⃣ Kho đồ: vật phẩm người dùng đã sở hữu
CREATE TABLE IF NOT EXISTS `user_spirit_items` (
    `user_id`     int(11)     NOT NULL,
    `item_id`     varchar(50) NOT NULL,
    `acquired_at` timestamp   NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`user_id`, `item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4️⃣ Tặng mỗi user hiện tại 1 Linh thú + 1 Linh bảo phổ thông để trải nghiệm
INSERT IGNORE INTO `user_spirit_items` (`user_id`, `item_id`)
SELECT u.`id`, 'tieu-bach-cuu' FROM `users` u WHERE u.`id` > 0;
INSERT IGNORE INTO `user_spirit_items` (`user_id`, `item_id`)
SELECT u.`id`, 'ban-co' FROM `users` u WHERE u.`id` > 0;
