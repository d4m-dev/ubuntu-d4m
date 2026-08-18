-- ============================================================
-- 🎯 D4M ECOSYSTEM — SEED DỮ LIỆU XÃ HỘI & NGƯỜI CHƠI
-- ============================================================
-- Nạp thêm người dùng demo, bài viết (posts) và hồ sơ người chơi (players)
-- để hệ sinh thái không bị trống.
-- Chạy:  mysql -u d4m -padmin123 social_hub < database/ecosystem_seed.sql
-- ============================================================

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- ============================================================
-- 👤 USERS — thêm vài người dùng demo (nếu chưa có)
-- ============================================================
INSERT INTO `users` (`username`, `full_name`, `email`, `password_hash`, `avatar_url`, `role`, `is_verified`, `active`) VALUES
('ngochuong', 'Ngọc Hương', 'ngochuong@d4m.local', '', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ngochuong', -1, 1, 1),
('minhkhoa', 'Minh Khoa', 'minhkhoa@d4m.local', '', 'https://api.dicebear.com/7.x/avataaars/svg?seed=minhkhoa', -1, 1, 1),
('thanhlam', 'Thanh Lam', 'thanhlam@d4m.local', '', 'https://api.dicebear.com/7.x/avataaars/svg?seed=thanhlam', -1, 1, 1),
('thuyduong', 'Thùy Dương', 'thuyduong@d4m.local', '', 'https://api.dicebear.com/7.x/avataaars/svg?seed=thuyduong', -1, 1, 1)
ON DUPLICATE KEY UPDATE username=username;

-- ============================================================
-- 📝 POSTS — bài viết mẫu (Social Hub)
-- ============================================================
INSERT INTO `posts` (`user_id`, `content`, `attached_media`, `media_type`) VALUES
(1, '🎧 Chào mừng mọi người đến với D4M Ecosystem! Hệ sinh thái Cloud Workspace của riêng chúng ta đã sẵn sàng. Hãy khám phá Music Pro, các công cụ và Social Hub nhé! 🚀', NULL, NULL),
(1, '🔥 Mình vừa cập nhật bản D4M Music Pro mới — nghe nhạc mượt hơn, thư viện cá nhân đầy đủ hơn. Mọi người thử ngay tại /music nhé!', NULL, NULL),
(2, 'Chào cả nhà! Mình là Ngọc Hương, rất vui được tham gia cộng đồng D4M. Có ai thích nghe nhạc trữ tình không ạ? 🎵', NULL, NULL),
(3, 'Hôm nay mình test thử YouTube Downloader tốc độ cao, tải phim về xem cực nhanh luôn. Đỉnh! 📺', NULL, NULL),
(4, 'Cảm ơn team D4M đã tạo ra môi trường làm việc hiện đại này. Google Drive Commander tiết kiệm cho mình cả buổi chiều! 📁', NULL, NULL),
(5, 'Numerology bói thần số học trên hệ thống khá hay đó mọi người ơi, thử xem vận mệnh của mình thế nào nhé! 🔮', NULL, NULL)
ON DUPLICATE KEY UPDATE id=id;

-- ============================================================
-- 🎮 PLAYERS — hồ sơ người chơi demo
-- ============================================================
INSERT INTO `players`
  (`user_id`, `last_online`, `is_online`, `xu`, `luong`, `xeng`, `star`,
   `items`, `gender`, `level_main`, `exp_main`, `friendly`, `happy`,
   `chest_slot`, `chest_home_slot`, `chests`, `wearing`) VALUES
(1, NOW(), 1, 50000, 120, 340, 3, '[]', 1, 12, 5400, 100, 100, 20, 15, '[]', '[]'),
(2, NOW() - INTERVAL 1 HOUR, 0, 32000, 60, 150, 1, '[]', 2, 8, 2100, 100, 95, 15, 12, '[]', '[]'),
(3, NOW() - INTERVAL 3 HOUR, 0, 21000, 40, 80, 0, '[]', 1, 5, 900, 95, 100, 12, 10, '[]', '[]'),
(4, NOW() - INTERVAL 1 DAY, 0, 45000, 90, 260, 2, '[]', 2, 10, 3200, 100, 90, 18, 15, '[]', '[]'),
(5, NOW() - INTERVAL 2 DAY, 0, 18000, 25, 60, 0, '[]', 2, 4, 700, 98, 100, 10, 10, '[]', '[]')
ON DUPLICATE KEY UPDATE user_id=user_id;

-- ============================================================
-- ⚙️ SETTINGS — cấu hình hệ thống
-- ============================================================
INSERT INTO `settings` (`name`, `value`) VALUES
('app_name', 'D4M Ecosystem'),
('app_version', '1.0.0'),
('maintenance_mode', '0')
ON DUPLICATE KEY UPDATE `value`=VALUES(`value`);

SET foreign_key_checks = 1;
