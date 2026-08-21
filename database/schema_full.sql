-- D4M ECOSYSTEM FULL INIT SCHEMA
SET NAMES utf8mb4;
SET foreign_key_checks=0;

CREATE TABLE IF NOT EXISTS `users` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `username` varchar(50) NOT NULL UNIQUE,
            `fullname` varchar(100) DEFAULT NULL,
            `avatar_url` varchar(255) DEFAULT '',
            `created_at` timestamp NULL DEFAULT current_timestamp(),
            `email` varchar(100) UNIQUE DEFAULT NULL,
            `password_hash` varchar(255) NOT NULL,
            `full_name` varchar(100) DEFAULT NULL,
            `cccd` varchar(20) UNIQUE DEFAULT NULL,
            `phone` varchar(20) DEFAULT NULL,
            `dob` date DEFAULT NULL,
            `address` text DEFAULT NULL,
            `is_verified` tinyint(1) DEFAULT 0,
            `otp_code` varchar(10) DEFAULT NULL,
            `role` smallint(6) NOT NULL DEFAULT -1,
            `ban` varchar(500) DEFAULT NULL,
            `active` int(11) NOT NULL DEFAULT 0,
            `avatar_frame` varchar(255) DEFAULT NULL,
            `name_effect` varchar(50) DEFAULT 'default',
            `chat_theme` varchar(50) DEFAULT 'default',
            `equipped_pet` varchar(50) DEFAULT NULL,
            `equipped_treasure` varchar(50) DEFAULT NULL,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `items` (
            `id` int(11) NOT NULL PRIMARY KEY,
            `coin` int(11) NOT NULL DEFAULT 0,
            `gold` smallint(6) NOT NULL DEFAULT 0,
            `type` smallint(6) NOT NULL,
            `icon` smallint(6) NOT NULL,
            `name` varchar(200) NOT NULL DEFAULT '',
            `sell` tinyint(4) DEFAULT NULL,
            `expired_day` tinyint(4) NOT NULL DEFAULT 0,
            `zorder` tinyint(4) DEFAULT NULL,
            `gender` tinyint(4) DEFAULT NULL,
            `level` tinyint(4) DEFAULT NULL,
            `animation` text DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `players` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user_id` int(11) NOT NULL UNIQUE,
            `last_online` datetime NOT NULL DEFAULT '2000-01-01 00:00:00',
            `is_online` tinyint(1) NOT NULL DEFAULT 0,
            `client_id` int(11) NOT NULL DEFAULT 0,
            `xu` int(11) NOT NULL DEFAULT 20000,
            `luong` int(11) NOT NULL DEFAULT 0,
            `luong_khoa` int(11) NOT NULL DEFAULT 0,
            `xeng` int(11) NOT NULL DEFAULT 0,
            `clan_id` int(11) NOT NULL DEFAULT 0,
            `star` int(11) NOT NULL DEFAULT -1,
            `items` varchar(5000) NOT NULL DEFAULT '[]',
            `gender` tinyint(1) NOT NULL DEFAULT 0,
            `level_main` int(11) NOT NULL DEFAULT 1,
            `exp_main` int(11) NOT NULL DEFAULT 0,
            `exp_farm` int(11) NOT NULL DEFAULT 0,
            `friendly` tinyint(4) NOT NULL DEFAULT 100,
            `crazy` tinyint(4) NOT NULL DEFAULT 0,
            `stylish` tinyint(4) NOT NULL DEFAULT 0,
            `happy` tinyint(4) NOT NULL DEFAULT 100,
            `hunger` tinyint(4) NOT NULL DEFAULT 0,
            `chest_slot` int(11) NOT NULL DEFAULT 10,
            `chest_home_slot` int(11) NOT NULL DEFAULT 10,
            `chests` text NOT NULL,
            `wearing` text NOT NULL,
            CONSTRAINT `players_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `posts` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user_id` int(11) DEFAULT NULL,
            `content` text DEFAULT NULL,
            `created_at` timestamp NULL DEFAULT current_timestamp(),
            `attached_media` varchar(255) DEFAULT NULL,
            `media_type` varchar(50) DEFAULT NULL,
            CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `media` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `post_id` int(11) DEFAULT NULL,
            `file_url` varchar(255) NOT NULL,
            `media_type` varchar(50) DEFAULT 'image',
            CONSTRAINT `media_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chests` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user_id` int(11) NOT NULL,
            `item_id` int(11) NOT NULL,
            `is_use` tinyint(1) NOT NULL DEFAULT 0,
            `is_show` int(11) NOT NULL DEFAULT 1,
            `date_expired` datetime NOT NULL DEFAULT '2000-01-01 00:00:00',
            CONSTRAINT `chests_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `chests_ibfk_3` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dial_lucky` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `item_id` int(11) NOT NULL,
            `xu` tinyint(4) NOT NULL DEFAULT 0,
            `luong` tinyint(4) NOT NULL DEFAULT 0,
            `free` tinyint(4) NOT NULL DEFAULT 0,
            `ratio` tinyint(4) NOT NULL DEFAULT 100,
            CONSTRAINT `dial_lucky_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `settings` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `name` varchar(50) NOT NULL UNIQUE,
            `value` text DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `giaodich_logs` (
            `id` int(10) unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user` int(11) NOT NULL DEFAULT 0,
            `transID` varchar(50) DEFAULT NULL,
            `type` varchar(20) NOT NULL DEFAULT '0',
            `amount` int(11) NOT NULL DEFAULT 0,
            `log` text NOT NULL,
            `status` varchar(20) DEFAULT 'SUCCESS',
            `time` varchar(50) NOT NULL DEFAULT '0',
            KEY `user_index` (`user`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `giftcode` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `code` varchar(50) NOT NULL UNIQUE,
            `message` varchar(255) DEFAULT NULL,
            `data` text NOT NULL,
            `start_time` timestamp NOT NULL DEFAULT current_timestamp(),
            `end_time` timestamp NOT NULL DEFAULT current_timestamp(),
            `num` int(11) NOT NULL DEFAULT 1,
            `create_by` int(11) NOT NULL DEFAULT 0,
            `create_time` timestamp NOT NULL DEFAULT current_timestamp()
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `giftcode_use` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user` int(11) NOT NULL,
            `giftcode_id` int(11) NOT NULL,
            `time` timestamp NOT NULL DEFAULT current_timestamp(),
            CONSTRAINT `fk_giftcode_use_code` FOREIGN KEY (`giftcode_id`) REFERENCES `giftcode` (`id`) ON DELETE CASCADE,
            CONSTRAINT `fk_giftcode_use_user` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `gioithieu` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user` int(11) NOT NULL,
            `user_ref` int(11) NOT NULL,
            `ip` varchar(50) NOT NULL DEFAULT '0.0.0.0',
            `date` datetime NOT NULL DEFAULT current_timestamp(),
            CONSTRAINT `fk_gioithieu_ref` FOREIGN KEY (`user_ref`) REFERENCES `users` (`id`) ON DELETE CASCADE,
            CONSTRAINT `fk_gioithieu_user` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `map_item_type` (
            `id` int(11) NOT NULL PRIMARY KEY,
            `name` varchar(100) NOT NULL,
            `description` varchar(255) DEFAULT '',
            `image` smallint(6) NOT NULL,
            `icon` tinyint(4) NOT NULL,
            `price_coin` int(11) NOT NULL DEFAULT 0,
            `price_gold` int(11) NOT NULL DEFAULT 0,
            `buy` int(11) NOT NULL DEFAULT 1,
            `dx` smallint(6) NOT NULL DEFAULT 0,
            `dy` smallint(6) NOT NULL DEFAULT 0,
            `position` text NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `map_item` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `type_id` int(11) NOT NULL,
            `type` int(11) NOT NULL DEFAULT 0,
            `x` int(11) NOT NULL,
            `y` int(11) NOT NULL,
            `map_id` int(11) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `npc` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `name` varchar(50) NOT NULL,
            `items` text NOT NULL,
            `map` int(11) NOT NULL,
            `x` int(11) NOT NULL DEFAULT 0,
            `y` int(11) NOT NULL DEFAULT 0,
            `star` int(11) NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `foods` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `name` varchar(100) NOT NULL,
            `description` varchar(255) NOT NULL,
            `img` int(11) NOT NULL,
            `shop` int(11) NOT NULL,
            `percent_health` int(11) NOT NULL DEFAULT 0,
            `price` int(11) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `image_data` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `item_id` int(11) NOT NULL,
            `image_id` int(11) NOT NULL,
            `x` int(11) NOT NULL,
            `y` int(11) NOT NULL,
            `w` int(11) NOT NULL,
            `h` int(11) NOT NULL,
            KEY `idx_item` (`item_id`),
            KEY `idx_image` (`image_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `item_image_data` (
            `id` int(11) NOT NULL PRIMARY KEY,
            `image_id` int(11) DEFAULT NULL,
            `x` int(11) DEFAULT NULL,
            `y` int(11) DEFAULT NULL,
            `w` int(11) DEFAULT NULL,
            `h` int(11) DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `farm_image_data` (
            `id` int(11) NOT NULL PRIMARY KEY,
            `image_id` int(11) DEFAULT NULL,
            `x` int(11) DEFAULT NULL,
            `y` int(11) DEFAULT NULL,
            `w` int(11) DEFAULT NULL,
            `h` int(11) DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `work_schedules` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user_id` int(11) NOT NULL,
            `work_date` date NOT NULL,
            `shift_name` varchar(50) NOT NULL,
            `start_time` time DEFAULT NULL,
            `end_time` time DEFAULT NULL,
            `is_off` tinyint(1) NOT NULL DEFAULT 0,
            `gcal_event_id` varchar(255) DEFAULT NULL,
            `created_at` timestamp NULL DEFAULT current_timestamp(),
            CONSTRAINT `fk_work_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `songs` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `folder_name` varchar(150) NOT NULL UNIQUE,
            `title` varchar(255) NOT NULL,
            `artist` varchar(255) DEFAULT 'Unknown',
            `cover_image` varchar(255) DEFAULT NULL,
            `audio_file` varchar(255) NOT NULL,
            `beat_file` varchar(255) DEFAULT NULL,
            `video_file` varchar(255) DEFAULT NULL,
            `lyric_file` varchar(255) DEFAULT NULL,
            `duration` int(11) DEFAULT 0,
            `total_views` int(11) NOT NULL DEFAULT 0,
            `total_likes` int(11) NOT NULL DEFAULT 0,
            `total_downloads` int(11) NOT NULL DEFAULT 0,
            `status` tinyint(1) NOT NULL DEFAULT 1,
            `created_at` timestamp NOT NULL DEFAULT current_timestamp()
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `playlists` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user_id` int(11) NOT NULL,
            `name` varchar(255) NOT NULL,
            `description` text DEFAULT NULL,
            `cover_image` varchar(255) DEFAULT NULL,
            `is_public` tinyint(1) NOT NULL DEFAULT 0,
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            CONSTRAINT `fk_pl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `playlist_songs` (
            `playlist_id` int(11) NOT NULL,
            `song_id` int(11) NOT NULL,
            `added_at` timestamp NOT NULL DEFAULT current_timestamp(),
            `sort_order` int(11) NOT NULL DEFAULT 0,
            PRIMARY KEY (`playlist_id`, `song_id`),
            CONSTRAINT `fk_ps_pl` FOREIGN KEY (`playlist_id`) REFERENCES `playlists` (`id`) ON DELETE CASCADE,
            CONSTRAINT `fk_ps_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `song_likes` (
            `user_id` int(11) NOT NULL,
            `song_id` int(11) NOT NULL,
            `liked_at` timestamp NOT NULL DEFAULT current_timestamp(),
            PRIMARY KEY (`user_id`, `song_id`),
            CONSTRAINT `fk_sl_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE,
            CONSTRAINT `fk_sl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `song_views` (
            `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `song_id` int(11) NOT NULL,
            `user_id` int(11) DEFAULT NULL,
            `ip_address` varchar(45) DEFAULT NULL,
            `listened_at` timestamp NOT NULL DEFAULT current_timestamp(),
            CONSTRAINT `fk_sv_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `song_downloads` (
            `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `song_id` int(11) NOT NULL,
            `user_id` int(11) DEFAULT NULL,
            `file_type` varchar(20) NOT NULL,
            `ip_address` varchar(45) DEFAULT NULL,
            `downloaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
            CONSTRAINT `fk_sd_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

SET foreign_key_checks=1;


-- ===== MUSIC SEED =====

-- D4M Music seed (dùng chung DB social_hub với hệ sinh thái D4M)

SET NAMES utf8mb4;
SET foreign_key_checks=0;

DROP TABLE IF EXISTS `song_downloads`;
DROP TABLE IF EXISTS `song_views`;
DROP TABLE IF EXISTS `song_likes`;
DROP TABLE IF EXISTS `playlist_songs`;
DROP TABLE IF EXISTS `playlists`;
DROP TABLE IF EXISTS `songs`;

CREATE TABLE IF NOT EXISTS `songs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `folder_name` varchar(150) NOT NULL COMMENT 'Tên thư mục gốc (vd: alanwalkerfaded)',
  `title` varchar(255) NOT NULL COMMENT 'Tên bài hát hiển thị',
  `artist` varchar(255) DEFAULT 'Unknown' COMMENT 'Ca sĩ / Tác giả',
  `cover_image` varchar(255) DEFAULT NULL COMMENT 'File ảnh bìa (vd: alanwalkerfaded.jpg)',
  `audio_file` varchar(255) NOT NULL COMMENT 'File audio gốc (vd: alanwalkerfaded.mp3)',
  `beat_file` varchar(255) DEFAULT NULL COMMENT 'File nhạc beat',
  `video_file` varchar(255) DEFAULT NULL COMMENT 'File video',
  `lyric_file` varchar(255) DEFAULT NULL COMMENT 'File lời bài hát (.lrc)',
  `duration` int(11) DEFAULT 0 COMMENT 'Thời lượng (giây)',
  `total_views` int(11) NOT NULL DEFAULT 0,
  `total_likes` int(11) NOT NULL DEFAULT 0,
  `total_downloads` int(11) NOT NULL DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1: Hiển thị, 0: Ẩn',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_folder` (`folder_name`),
  KEY `idx_title_artist` (`title`,`artist`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC COMMENT='Kho lưu trữ bài hát';

CREATE TABLE IF NOT EXISTS `playlists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'Chủ nhân playlist',
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `cover_image` varchar(255) DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1: Công khai, 0: Riêng tư',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_playlist_user` (`user_id`),
  CONSTRAINT `fk_playlist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC COMMENT='Bộ sưu tập danh sách phát';

CREATE TABLE IF NOT EXISTS `playlist_songs` (
  `playlist_id` int(11) NOT NULL,
  `song_id` int(11) NOT NULL,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`playlist_id`,`song_id`),
  KEY `idx_ps_song` (`song_id`),
  CONSTRAINT `fk_ps_playlist` FOREIGN KEY (`playlist_id`) REFERENCES `playlists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ps_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `song_likes` (
  `user_id` int(11) NOT NULL,
  `song_id` int(11) NOT NULL,
  `liked_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`,`song_id`),
  KEY `idx_song_like` (`song_id`),
  CONSTRAINT `fk_like_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_like_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `song_views` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `song_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL COMMENT 'NULL nếu là khách chưa đăng nhập',
  `ip_address` varchar(45) DEFAULT NULL,
  `listened_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_song_id` (`song_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_view_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_view_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `song_downloads` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `song_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `file_type` varchar(20) NOT NULL COMMENT 'mp3, beat, mp4, lrc',
  `ip_address` varchar(45) DEFAULT NULL,
  `downloaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_download_song` (`song_id`),
  KEY `fk_download_user` (`user_id`),
  CONSTRAINT `fk_download_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_download_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- ===== Seed users =====
INSERT INTO users (id,username,full_name,password_hash,avatar_url,role,is_verified,active,created_at) VALUES
(1,'admin','Lý Thừa Ân','$2b$12$a5husdWpPIs8ug2iYuSnIOb0ardk/RrQVnIn41oPACVYO4vN3KPxG','',1,1,1,NOW())
ON DUPLICATE KEY UPDATE username=username;


INSERT INTO `songs` (`id`,`folder_name`,`title`,`artist`,`cover_image`,`audio_file`,`beat_file`,`video_file`,`lyric_file`,`duration`,`total_views`,`total_likes`,`total_downloads`,`status`,`created_at`) VALUES
(1,'10mat1con0','10 Mất 1 Còn 0','Lê Gia Bảo','10mat1con0.jpg','10mat1con0.mp3','10mat1con0_beat.mp3','10mat1con0.mp4','10mat1con0.lrc',215,45000,1200,350,1,'2026-07-30 01:00:00'),
(2,'aihongnhan','Ải Hồng Nhan','Cần Vinh xx Lee Ken','aihongnhan.jpg','aihongnhan.mp3','aihongnhan_beat.mp3','aihongnhan.mp4','aihongnhan.lrc',245,1250003,45002,8900,1,'2026-07-30 01:01:00'),
(3,'alanwalkerfaded','Faded','Alan Walker','alanwalkerfaded.jpg','alanwalkerfaded.mp3','alanwalkerfaded_beat.mp3','alanwalkerfaded.mp4','alanwalkerfaded.lrc',212,5500004,250000,95000,1,'2026-07-30 01:02:00'),
(4,'anhdautulucemdi','Anh Đau Từ Lúc Em Đi','Trần Mạnh Cường','anhdautulucemdi.jpg','anhdautulucemdi.mp3','anhdautulucemdi_beat.mp3','anhdautulucemdi.mp4','anhdautulucemdi.lrc',230,82000,3100,650,1,'2026-07-30 01:03:00'),
(5,'anhthoinhannhuong','Anh Thôi Nhân Nhượng','Mochiii','anhthoinhannhuong.jpg','anhthoinhannhuong.mp3','anhthoinhannhuong_beat.mp3','anhthoinhannhuong.mp4','anhthoinhannhuong.lrc',255,340001,12500,4200,1,'2026-07-30 01:04:00'),
(6,'anhvui','Anh Vui','Phạm Kỳ','anhvui.jpg','anhvui.mp3','anhvui_beat.mp3','anhvui.mp4','anhvui.lrc',198,15000,450,120,1,'2026-07-30 01:05:00'),
(7,'batconbuomvang','Bắt Con Bướm Vàng','DanhKaa','batconbuomvang.jpg','batconbuomvang.mp3','batconbuomvang_beat.mp3','batconbuomvang.mp4','batconbuomvang.lrc',185,23000,780,240,1,'2026-07-30 01:06:00'),
(8,'changthecamhoa','Chẳng Thể Cảm Hóa','Thái Học Cover','changthecamhoa.jpg','changthecamhoa.mp3','changthecamhoa_beat.mp3','changthecamhoa.mp4','changthecamhoa.lrc',260,67000,2100,540,1,'2026-07-30 01:07:00'),
(9,'chobaolau','Chờ Bao Lâu','Út Nhị','chobaolau.jpg','chobaolau.mp3','chobaolau_beat.mp3','chobaolau.mp4','chobaolau.lrc',210,48000,1500,310,1,'2026-07-30 01:08:00'),
(10,'coemanhthangdoi','Có Em Anh Thắng Đời','Hana Cẩm Tiên','coemanhthangdoi.jpg','coemanhthangdoi.mp3','coemanhthangdoi_beat.mp3','coemanhthangdoi.mp4','coemanhthangdoi.lrc',225,125000,5600,1400,1,'2026-07-30 01:09:00'),
(11,'cunhuvaymotvannam','Cứ Như Vậy Một Vạn Năm','Unknown','cunhuvaymotvannam.jpg','cunhuvaymotvannam.mp3','cunhuvaymotvannam_beat.mp3','cunhuvaymotvannam.mp4','cunhuvaymotvannam.lrc',240,310001,9800,2100,1,'2026-07-30 01:10:00'),
(12,'cuoichinh','Cưới Chính','Hồ Phi Nal','cuoichinh.jpg','cuoichinh.mp3','cuoichinh_beat.mp3','cuoichinh.mp4','cuoichinh.lrc',205,56000,1200,450,1,'2026-07-30 01:11:00'),
(13,'cuoitet','Cưới Tết','Hồ Phi Nal','cuoitet.jpg','cuoitet.mp3','cuoitet_beat.mp3','cuoitet.mp4','cuoitet.lrc',190,890000,34000,7500,1,'2026-07-30 01:12:00'),
(14,'daohoanac','Đào Hoa Nặc','Đặng Tử Kỳ (Cover)','daohoanac.jpg','daohoanac.mp3','daohoanac_beat.mp3','daohoanac.mp4','daohoanac.lrc',250,670000,21000,5600,1,'2026-07-30 01:13:00'),
(15,'diveque','Đi Về Quê','Út Nhị','diveque.jpg','diveque.mp3','diveque_beat.mp3','diveque.mp4','diveque.lrc',210,450001,12000,3400,1,'2026-07-30 01:14:00'),
(16,'elakhongthe','Em Là Không Thể','Anh Quân Idol','elakhongthe.jpg','elakhongthe.mp3','elakhongthe_beat.mp3','elakhongthe.mp4','elakhongthe.lrc',235,78000,2400,670,1,'2026-07-30 01:15:00'),
(17,'embandihetchantinh','Em Bán Đi Hết Chân Tình','Ca Sĩ Giấu Mặt','embandihetchantinh.jpg','embandihetchantinh.mp3','embandihetchantinh_beat.mp3','embandihetchantinh.mp4','embandihetchantinh.lrc',260,31000,640,210,1,'2026-07-30 01:16:00'),
(18,'emdongy','Em Đồng Ý (I Do)','Đức Phúc x 911','emdongy.jpg','emdongy.mp3','emdongy_beat.mp3','emdongy.mp4','emdongy.lrc',235,2100007,85002,15000,1,'2026-07-30 01:17:00'),
(19,'emthuacota','Em Thua Cô Ta','Ca Sĩ Giấu Mặt','emthuacota.jpg','emthuacota.mp3','emthuacota_beat.mp3','emthuacota.mp4','emthuacota.lrc',285,125000,3400,1500,1,'2026-07-30 01:18:00'),
(20,'flyaway','Fly Away','TheFatRat','flyaway.jpg','flyaway.mp3','flyaway_beat.mp3','flyaway.mp4','flyaway.lrc',195,3400004,125000,45000,1,'2026-07-30 01:19:00'),
(21,'hoa','Hoa','Tú Na','hoa.jpg','hoa.mp3','hoa_beat.mp3','hoa.mp4','hoa.lrc',240,56000,1100,340,1,'2026-07-30 01:20:00'),
(22,'hoivongoaithanh','Hỏi Vợ Ngoại Thành','Thành Đạt Cover','hoivongoaithanh.jpg','hoivongoaithanh.mp3','hoivongoaithanh_beat.mp3','hoivongoaithanh.mp4','hoivongoaithanh.lrc',270,89000,2300,670,1,'2026-07-30 01:21:00'),
(23,'khatduyen','Khất Duyên','Bùi Phi Long','khatduyen.jpg','khatduyen.mp3','khatduyen_beat.mp3','khatduyen.mp4','khatduyen.lrc',225,45000,1400,320,1,'2026-07-30 01:22:00'),
(24,'khoalybiet','Khóa Ly Biệt','Anh Tú','khoalybiet.jpg','khoalybiet.mp3','khoalybiet_beat.mp3','khoalybiet.mp4','khoalybiet.lrc',280,560001,18000,4500,1,'2026-07-30 01:23:00'),
(25,'lengangtroi','Lệ Ngang Trời','Ca Sĩ Giấu Mặt','lengangtroi.jpg','lengangtroi.mp3','lengangtroi_beat.mp3','lengangtroi.mp4','lengangtroi.lrc',265,34000,890,210,1,'2026-07-30 01:24:00'),
(26,'mailacodaucuaanh','Mãi Là Cô Dâu Của Anh','Mochiii','mailacodaucuaanh.jpg','mailacodaucuaanh.mp3','mailacodaucuaanh_beat.mp3','mailacodaucuaanh.mp4','mailacodaucuaanh.lrc',215,125000,4500,1200,1,'2026-07-30 01:25:00'),
(27,'manhba','Mạnh Bà','Unknown','manhba.jpg','manhba.mp3','manhba_beat.mp3','manhba.mp4','manhba.lrc',255,67000,1500,430,1,'2026-07-30 01:26:00'),
(28,'manhtinhsaidoi','Mảnh Tình Sai Đời','Unknown','manhtinhsaidoi.jpg','manhtinhsaidoi.mp3','manhtinhsaidoi_beat.mp3','manhtinhsaidoi.mp4','manhtinhsaidoi.lrc',245,23000,560,120,1,'2026-07-30 01:27:00'),
(29,'namchinh','Nam Chính','Unknown','namchinh.jpg','namchinh.mp3','namchinh_beat.mp3','namchinh.mp4','namchinh.lrc',220,45000,1200,310,1,'2026-07-30 01:28:00'),
(30,'phongsuongtuu','Phong Sương Tửu','Unknown','phongsuongtuu.jpg','phongsuongtuu.mp3','phongsuongtuu_beat.mp3','phongsuongtuu.mp4','phongsuongtuu.lrc',210,78000,2100,560,1,'2026-07-30 01:29:00'),
(31,'roi','Rơi','Hoàng Thùy Linh','roi.jpg','roi.mp3','roi_beat.mp3','roi.mp4','roi.lrc',218,560001,18000,5400,1,'2026-07-30 01:30:00'),
(32,'roinangcailylen','Rồi Nâng Cái Ly Lên','Nal','roinangcailylen.jpg','roinangcailylen.mp3','roinangcailylen_beat.mp3','roinangcailylen.mp4','roinangcailylen.lrc',195,890000,24000,7800,1,'2026-07-30 01:31:00'),
(33,'soichihong','Sợi Chỉ Hồng','Quỳnh Trang','soichihong.jpg','soichihong.mp3','soichihong_beat.mp3','soichihong.mp4','soichihong.lrc',255,125000,4500,1200,1,'2026-07-30 01:32:00'),
(34,'suuutiencuaem','Sự Ưu Tiên Của Em','Unknown','suuutiencuaem.jpg','suuutiencuaem.mp3','suuutiencuaem_beat.mp3','suuutiencuaem.mp4','suuutiencuaem.lrc',230,45000,1100,230,1,'2026-07-30 01:33:00'),
(35,'taylorswiftthefateofophelia','The Fate Of Ophelia','Taylor Swift (AI)','taylorswiftthefateofophelia.jpg','taylorswiftthefateofophelia.mp3','taylorswiftthefateofophelia_beat.mp3','taylorswiftthefateofophelia.mp4','taylorswiftthefateofophelia.lrc',215,230006,8900,3101,1,'2026-07-30 01:34:00'),
(36,'tenayketdoi','Tết Này Kết Đôi','Unknown','tenayketdoi.jpg','tenayketdoi.mp3','tenayketdoi_beat.mp3','tenayketdoi.mp4','tenayketdoi.lrc',195,450001,15000,4500,1,'2026-07-30 01:35:00'),
(37,'tetnayconhau','Tết Này Có Nhau','Unknown','tetnayconhau.jpg','tetnayconhau.mp3','tetnayconhau_beat.mp3','tetnayconhau.mp4','tetnayconhau.lrc',205,670000,21000,6700,1,'2026-07-30 01:36:00'),
(38,'thiephongsaiten','Thiệp Hồng Sai Tên','Unknown','thiephongsaiten.jpg','thiephongsaiten.mp3','thiephongsaiten_beat.mp3','thiephongsaiten.mp4','thiephongsaiten.lrc',240,125000,3400,890,1,'2026-07-30 01:37:00'),
(39,'tinhyeukhongcoloi','Tình Yêu Không Có Lỗi','Unknown','tinhyeukhongcoloi.jpg','tinhyeukhongcoloi.mp3','tinhyeukhongcoloi_beat.mp3','tinhyeukhongcoloi.mp4','tinhyeukhongcoloi.lrc',250,89000,2100,560,1,'2026-07-30 01:38:00'),
(40,'tuemsai','Từ Em Sai','Unknown','tuemsai.jpg','tuemsai.mp3','tuemsai_beat.mp3','tuemsai.mp4','tuemsai.lrc',225,45000,1100,230,1,'2026-07-30 01:39:00'),
(41,'vokichcuaem','Vở Kịch Của Em','Unknown','vokichcuaem.jpg','vokichcuaem.mp3','vokichcuaem_beat.mp3','vokichcuaem.mp4','vokichcuaem.lrc',260,150001,5600,1500,1,'2026-07-30 01:40:00'),
(42,'withyou-ngauhung','With You x Ngẫu Hứng','Hoaprox','withyou-ngauhung.jpg','withyou-ngauhung.mp3','withyou-ngauhung_beat.mp3','withyou-ngauhung.mp4','withyou-ngauhung.lrc',210,1200002,56000,18000,1,'2026-07-30 01:41:00'),
(43,'xuanhuyhoang','Xuân Huy Hoàng','Đạt Long Vinh','xuanhuyhoang.jpg','xuanhuyhoang.mp3','xuanhuyhoang_beat.mp3','xuanhuyhoang.mp4','xuanhuyhoang.lrc',200,340005,12000,3400,1,'2026-07-30 01:42:00'),
(44,'xuanvuquy','Xuân Vu Quy','Unknown','xuanvuquy.jpg','xuanvuquy.mp3','xuanvuquy_beat.mp3','xuanvuquy.mp4','xuanvuquy.lrc',190,450001,15000,4200,1,'2026-07-30 01:43:00'),
(45,'yeuemnhungkhongvoitoi','Yêu Em Nhưng Không Với Tới','Unknown','yeuemnhungkhongvoitoi.jpg','yeuemnhungkhongvoitoi.mp3','yeuemnhungkhongvoitoi_beat.mp3','yeuemnhungkhongvoitoi.mp4','yeuemnhungkhongvoitoi.lrc',265,89000,2300,670,1,'2026-07-30 01:44:00');


INSERT INTO `playlists` (`id`,`user_id`,`name`,`description`,`cover_image`,`is_public`,`created_at`) VALUES
(1,1,'Top Trending Nhạc Trẻ','Những bản Hit nổi bật nhất trên hệ thống D4M Music Pro.','emthuacota.jpg',1,'2026-07-30 02:00:00'),
(2,1,'Nhạc Sàn - EDM x Lofi','Quẩy cực sung lúc code với những bản nhạc bắt tai nhất.','alanwalkerfaded.jpg',1,'2026-07-30 02:05:00'),
(3,1,'Xuân Sum Vầy 2026','Tuyển tập những bài hát Tết mang lại không khí vui tươi rộn rã.','xuanvuquy.jpg',1,'2026-07-30 02:10:00'),
(4,1,'Giai Điệu Tâm Trạng','Nhẹ nhàng sâu lắng, nơi chứa đựng những nỗi buồn khó nói.','khoalybiet.jpg',1,'2026-07-30 02:15:00');


INSERT INTO `playlist_songs` (`playlist_id`,`song_id`,`added_at`,`sort_order`) VALUES
(1,2,'2026-07-30 05:36:51',3),(1,18,'2026-07-30 05:36:51',1),(1,19,'2026-07-30 05:36:51',2),(1,31,'2026-07-30 05:36:51',5),(1,32,'2026-07-30 05:36:51',4),(1,33,'2026-07-30 05:36:51',6),
(2,3,'2026-07-30 05:36:51',1),(2,20,'2026-07-30 05:36:51',2),(2,35,'2026-07-30 05:36:51',4),(2,42,'2026-07-30 05:36:51',3),
(3,13,'2026-07-30 05:36:51',1),(3,15,'2026-07-30 05:36:51',6),(3,36,'2026-07-30 05:36:51',5),(3,37,'2026-07-30 05:36:51',2),(3,43,'2026-07-30 05:36:51',3),(3,44,'2026-07-30 05:36:51',4),
(4,4,'2026-07-30 05:36:51',2),(4,8,'2026-07-30 05:36:51',6),(4,17,'2026-07-30 05:36:51',3),(4,24,'2026-07-30 05:36:51',1),(4,39,'2026-07-30 05:36:51',7),(4,41,'2026-07-30 05:36:51',4),(4,45,'2026-07-30 05:36:51',5);

SET foreign_key_checks=1;


-- ===== ECOSYSTEM SEED =====

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

-- ============================================================
-- 💰 D4M DONATE — BẢNG LỊCH SỬ GIAO DỊCH & PHIÊN QR
-- ============================================================

-- Phiên mã QR (mỗi mã QR có thời hạn 15 phút)
CREATE TABLE IF NOT EXISTS `donate_qr` (
  `id` varchar(64) NOT NULL COMMENT 'Mã QR session (unique)',
  `user_id` int(11) NOT NULL COMMENT 'ID người donate',
  `amount` int(11) NOT NULL COMMENT 'Số tiền của mã QR',
  `qr_url` text DEFAULT NULL COMMENT 'URL mã QR',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT 'pending | success | expired',
  `expires_at` datetime NOT NULL COMMENT 'Hết hạn (created + 15 phút)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_donate_qr_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC COMMENT='Phiên mã QR donate (thời hạn 15 phút)';

-- Lịch sử giao dịch donate (trans_id UNIQUE để chống replay/fake)
CREATE TABLE IF NOT EXISTS `donate_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT 'ID người donate',
  `qr_id` varchar(64) DEFAULT NULL COMMENT 'Phiên QR liên quan',
  `amount` int(11) NOT NULL COMMENT 'Số tiền chuyển khoản (VNĐ)',
  `content` varchar(255) DEFAULT NULL COMMENT 'Nội dung chuyển khoản',
  `trans_id` varchar(100) DEFAULT NULL COMMENT 'Mã giao dịch SePay (unique chống replay)',
  `time` datetime DEFAULT NULL COMMENT 'Thời gian giao dịch',
  `status` varchar(20) NOT NULL DEFAULT 'success' COMMENT 'success | expired | duplicate',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_trans_id` (`trans_id`),
  KEY `idx_donate_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC COMMENT='Lịch sử giao dịch donate (chống fake/replay)';

CREATE TABLE IF NOT EXISTS `notifications` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user_id` int(11) NOT NULL,
            `type` varchar(50) NOT NULL DEFAULT 'info',
            `title` varchar(255) NOT NULL,
            `message` text DEFAULT NULL,
            `is_read` tinyint(1) NOT NULL DEFAULT 0,
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            KEY `idx_notif_user` (`user_id`),
            CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
-- ============================================================
-- D4M SOCIAL HUB — DM & BÌNH LUẬN (Threads-style)
-- conversations (cuộc trò chuyện 1-1), messages (tin nhắn),
-- post_comments (bình luận + reply lồng nhau)
-- ============================================================

CREATE TABLE IF NOT EXISTS `conversations` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user1_id` int(11) NOT NULL,
  `user2_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `last_message_at` timestamp NULL DEFAULT current_timestamp(),
  UNIQUE KEY `uq_convo_users` (`user1_id`,`user2_id`),
  KEY `idx_convo_user1` (`user1_id`),
  KEY `idx_convo_user2` (`user2_id`),
  KEY `idx_convo_lastmsg` (`last_message_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `content` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  KEY `idx_msg_conversation` (`conversation_id`),
  KEY `idx_msg_sender` (`sender_id`),
  KEY `idx_msg_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (post_comments created via social_dm.sql below)
-- ============================================================
-- D4M SOCIAL HUB — DM & BÌNH LUẬN (Threads-style)
-- conversations (cuộc trò chuyện 1-1), messages (tin nhắn),
-- post_comments (bình luận + reply lồng nhau)
-- ============================================================

CREATE TABLE IF NOT EXISTS `conversations` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user1_id` int(11) NOT NULL,
  `user2_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `last_message_at` timestamp NULL DEFAULT current_timestamp(),
  UNIQUE KEY `uq_convo_users` (`user1_id`,`user2_id`),
  KEY `idx_convo_user1` (`user1_id`),
  KEY `idx_convo_user2` (`user2_id`),
  KEY `idx_convo_lastmsg` (`last_message_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `content` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  KEY `idx_msg_conversation` (`conversation_id`),
  KEY `idx_msg_sender` (`sender_id`),
  KEY `idx_msg_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `post_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  KEY `idx_comment_post` (`post_id`),
  KEY `idx_comment_user` (`user_id`),
  KEY `idx_comment_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 🐉💎 LINH THÚ & LINH BẢO (Social Hub)
-- ============================================================
CREATE TABLE IF NOT EXISTS `spirit_items` (
    `id`          VARCHAR(50)  NOT NULL,
    `kind`        ENUM('pet','treasure') NOT NULL,
    `name`        VARCHAR(150) NOT NULL,
    `description` VARCHAR(255) DEFAULT NULL,
    `image`       VARCHAR(255) NOT NULL,
    `rarity`      VARCHAR(20)  NOT NULL DEFAULT 'common',
    `price_xu`    INT          NOT NULL DEFAULT 0,
    `zorder`      INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_kind` (`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_spirit_items` (
    `user_id`     INT         NOT NULL,
    `item_id`     VARCHAR(50) NOT NULL,
    `acquired_at` TIMESTAMP   NULL DEFAULT current_timestamp(),
    PRIMARY KEY (`user_id`, `item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Danh mục 165 Linh thú/Linh bảo được backend tự đồng bộ từ
-- backend/assets/spirit_items.json khi khởi động (không cần seed tay).
