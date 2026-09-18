# -*- coding: utf-8 -*-
# Tên file: ubuntu-backend/core/db_schema.py

def get_d4m_schema_queries():
    """Chứa định dạng chuẩn 100% của 20 bảng D4M Ecosystem"""
    return [
        # 1. Bảng Users (Trung tâm SS0)
        """CREATE TABLE IF NOT EXISTS `users` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",
        
        # 2. Bảng Items (Vật phẩm gốc)
        """CREATE TABLE IF NOT EXISTS `items` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 3. Bảng Players (Dữ liệu Game của User)
        """CREATE TABLE IF NOT EXISTS `players` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 4. Posts (Mạng Xã Hội)
        """CREATE TABLE IF NOT EXISTS `posts` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user_id` int(11) DEFAULT NULL,
            `content` text DEFAULT NULL,
            `created_at` timestamp NULL DEFAULT current_timestamp(),
            `attached_media` varchar(255) DEFAULT NULL,
            `media_type` varchar(50) DEFAULT NULL,
            CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 5. Media (Đính kèm MXH)
        """CREATE TABLE IF NOT EXISTS `media` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `post_id` int(11) DEFAULT NULL,
            `file_url` varchar(255) NOT NULL,
            `media_type` varchar(50) DEFAULT 'image',
            CONSTRAINT `media_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 6. Chests (Hành trang cá nhân)
        """CREATE TABLE IF NOT EXISTS `chests` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user_id` int(11) NOT NULL,
            `item_id` int(11) NOT NULL,
            `is_use` tinyint(1) NOT NULL DEFAULT 0,
            `is_show` int(11) NOT NULL DEFAULT 1,
            `date_expired` datetime NOT NULL DEFAULT '2000-01-01 00:00:00',
            CONSTRAINT `chests_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `chests_ibfk_3` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 7. Dial Lucky (Vòng Quay)
        """CREATE TABLE IF NOT EXISTS `dial_lucky` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `item_id` int(11) NOT NULL,
            `xu` tinyint(4) NOT NULL DEFAULT 0,
            `luong` tinyint(4) NOT NULL DEFAULT 0,
            `free` tinyint(4) NOT NULL DEFAULT 0,
            `ratio` tinyint(4) NOT NULL DEFAULT 100,
            CONSTRAINT `dial_lucky_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 8. Settings (Cấu hình Game)
        """CREATE TABLE IF NOT EXISTS `settings` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `name` varchar(50) NOT NULL UNIQUE,
            `value` text DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 9. Giaodich_logs (Nhật ký giao dịch)
        """CREATE TABLE IF NOT EXISTS `giaodich_logs` (
            `id` int(10) unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user` int(11) NOT NULL DEFAULT 0,
            `transID` varchar(50) DEFAULT NULL,
            `type` varchar(20) NOT NULL DEFAULT '0',
            `amount` int(11) NOT NULL DEFAULT 0,
            `log` text NOT NULL,
            `status` varchar(20) DEFAULT 'SUCCESS',
            `time` varchar(50) NOT NULL DEFAULT '0',
            KEY `user_index` (`user`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 10. Giftcode
        """CREATE TABLE IF NOT EXISTS `giftcode` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `code` varchar(50) NOT NULL UNIQUE,
            `message` varchar(255) DEFAULT NULL,
            `data` text NOT NULL,
            `start_time` timestamp NOT NULL DEFAULT current_timestamp(),
            `end_time` timestamp NOT NULL DEFAULT current_timestamp(),
            `num` int(11) NOT NULL DEFAULT 1,
            `create_by` int(11) NOT NULL DEFAULT 0,
            `create_time` timestamp NOT NULL DEFAULT current_timestamp()
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 11. Giftcode Use
        """CREATE TABLE IF NOT EXISTS `giftcode_use` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user` int(11) NOT NULL,
            `giftcode_id` int(11) NOT NULL,
            `time` timestamp NOT NULL DEFAULT current_timestamp(),
            CONSTRAINT `fk_giftcode_use_code` FOREIGN KEY (`giftcode_id`) REFERENCES `giftcode` (`id`) ON DELETE CASCADE,
            CONSTRAINT `fk_giftcode_use_user` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 12. Gioithieu (Mời bạn bè)
        """CREATE TABLE IF NOT EXISTS `gioithieu` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user` int(11) NOT NULL,
            `user_ref` int(11) NOT NULL,
            `ip` varchar(50) NOT NULL DEFAULT '0.0.0.0',
            `date` datetime NOT NULL DEFAULT current_timestamp(),
            CONSTRAINT `fk_gioithieu_ref` FOREIGN KEY (`user_ref`) REFERENCES `users` (`id`) ON DELETE CASCADE,
            CONSTRAINT `fk_gioithieu_user` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 13. Map Item Type
        """CREATE TABLE IF NOT EXISTS `map_item_type` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 14. Map Item
        """CREATE TABLE IF NOT EXISTS `map_item` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `type_id` int(11) NOT NULL,
            `type` int(11) NOT NULL DEFAULT 0,
            `x` int(11) NOT NULL,
            `y` int(11) NOT NULL,
            `map_id` int(11) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 15. NPC
        """CREATE TABLE IF NOT EXISTS `npc` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `name` varchar(50) NOT NULL,
            `items` text NOT NULL,
            `map` int(11) NOT NULL,
            `x` int(11) NOT NULL DEFAULT 0,
            `y` int(11) NOT NULL DEFAULT 0,
            `star` int(11) NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 16. Foods (Đồ ăn)
        """CREATE TABLE IF NOT EXISTS `foods` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `name` varchar(100) NOT NULL,
            `description` varchar(255) NOT NULL,
            `img` int(11) NOT NULL,
            `shop` int(11) NOT NULL,
            `percent_health` int(11) NOT NULL DEFAULT 0,
            `price` int(11) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 17. Image Data (Tọa độ Sprite)
        """CREATE TABLE IF NOT EXISTS `image_data` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `item_id` int(11) NOT NULL,
            `image_id` int(11) NOT NULL,
            `x` int(11) NOT NULL,
            `y` int(11) NOT NULL,
            `w` int(11) NOT NULL,
            `h` int(11) NOT NULL,
            KEY `idx_item` (`item_id`),
            KEY `idx_image` (`image_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 18. Item Image Data
        """CREATE TABLE IF NOT EXISTS `item_image_data` (
            `id` int(11) NOT NULL PRIMARY KEY,
            `image_id` int(11) DEFAULT NULL,
            `x` int(11) DEFAULT NULL,
            `y` int(11) DEFAULT NULL,
            `w` int(11) DEFAULT NULL,
            `h` int(11) DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 19. Farm Image Data
        """CREATE TABLE IF NOT EXISTS `farm_image_data` (
            `id` int(11) NOT NULL PRIMARY KEY,
            `image_id` int(11) DEFAULT NULL,
            `x` int(11) DEFAULT NULL,
            `y` int(11) DEFAULT NULL,
            `w` int(11) DEFAULT NULL,
            `h` int(11) DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 20. Work Schedules (Lịch làm việc thông minh)
        """CREATE TABLE IF NOT EXISTS `work_schedules` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 21. Songs (Kho lưu trữ bài hát - Music)
        """CREATE TABLE IF NOT EXISTS `songs` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;""",

        # 22. Playlists
        """CREATE TABLE IF NOT EXISTS `playlists` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user_id` int(11) NOT NULL,
            `name` varchar(255) NOT NULL,
            `description` text DEFAULT NULL,
            `cover_image` varchar(255) DEFAULT NULL,
            `is_public` tinyint(1) NOT NULL DEFAULT 0,
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            CONSTRAINT `fk_pl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;""",

        # 23. Playlist Songs
        """CREATE TABLE IF NOT EXISTS `playlist_songs` (
            `playlist_id` int(11) NOT NULL,
            `song_id` int(11) NOT NULL,
            `added_at` timestamp NOT NULL DEFAULT current_timestamp(),
            `sort_order` int(11) NOT NULL DEFAULT 0,
            PRIMARY KEY (`playlist_id`, `song_id`),
            CONSTRAINT `fk_ps_pl` FOREIGN KEY (`playlist_id`) REFERENCES `playlists` (`id`) ON DELETE CASCADE,
            CONSTRAINT `fk_ps_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;""",

        # 24. Song Likes
        """CREATE TABLE IF NOT EXISTS `song_likes` (
            `user_id` int(11) NOT NULL,
            `song_id` int(11) NOT NULL,
            `liked_at` timestamp NOT NULL DEFAULT current_timestamp(),
            PRIMARY KEY (`user_id`, `song_id`),
            CONSTRAINT `fk_sl_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE,
            CONSTRAINT `fk_sl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;""",

        # 25. Song Views
        """CREATE TABLE IF NOT EXISTS `song_views` (
            `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `song_id` int(11) NOT NULL,
            `user_id` int(11) DEFAULT NULL,
            `ip_address` varchar(45) DEFAULT NULL,
            `listened_at` timestamp NOT NULL DEFAULT current_timestamp(),
            CONSTRAINT `fk_sv_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;""",

        # 26. Song Downloads
        """CREATE TABLE IF NOT EXISTS `song_downloads` (
            `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `song_id` int(11) NOT NULL,
            `user_id` int(11) DEFAULT NULL,
            `file_type` varchar(20) NOT NULL,
            `ip_address` varchar(45) DEFAULT NULL,
            `downloaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
            CONSTRAINT `fk_sd_song` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;""",


        # 27. Notifications (Thông báo realtime)
        """CREATE TABLE IF NOT EXISTS `notifications` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user_id` int(11) NOT NULL,
            `type` varchar(50) NOT NULL DEFAULT 'info',
            `title` varchar(255) NOT NULL,
            `message` text DEFAULT NULL,
            `is_read` tinyint(1) NOT NULL DEFAULT 0,
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            KEY `idx_notif_user` (`user_id`),
            CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;""",

        # 28. Conversations (DM 1-1, Threads-style)
        """CREATE TABLE IF NOT EXISTS `conversations` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `user1_id` int(11) NOT NULL,
            `user2_id` int(11) NOT NULL,
            `created_at` timestamp NULL DEFAULT current_timestamp(),
            `last_message_at` timestamp NULL DEFAULT current_timestamp(),
            UNIQUE KEY `uq_convo_users` (`user1_id`,`user2_id`),
            KEY `idx_convo_user1` (`user1_id`),
            KEY `idx_convo_user2` (`user2_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;""",

        # 29. Messages (tin nhắn DM)
        """CREATE TABLE IF NOT EXISTS `messages` (
            `id` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
            `conversation_id` int(11) NOT NULL,
            `sender_id` int(11) NOT NULL,
            `content` text DEFAULT NULL,
            `created_at` timestamp NULL DEFAULT current_timestamp(),
            `is_read` tinyint(1) NOT NULL DEFAULT 0,
            KEY `idx_msg_conversation` (`conversation_id`),
            KEY `idx_msg_sender` (`sender_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;""",

        # 30. Post Comments (bình luận + reply)
        """CREATE TABLE IF NOT EXISTS `post_comments` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;""",

        # ============================================================
        # 🐉💎 LINH THÚ & LINH BẢO (Social Hub)
        # ============================================================
        # 31. Danh mục Linh thú / Linh bảo (catalog)
        """CREATE TABLE IF NOT EXISTS `spirit_items` (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 32. Kho đồ: vật phẩm người dùng đã sở hữu
        """CREATE TABLE IF NOT EXISTS `user_spirit_items` (
            `user_id`     int(11)     NOT NULL,
            `item_id`     varchar(50) NOT NULL,
            `acquired_at` timestamp   NULL DEFAULT current_timestamp(),
            PRIMARY KEY (`user_id`, `item_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",

        # 33. Nâng cấp bảng users đã tồn tại (MariaDB: ADD COLUMN IF NOT EXISTS)
        "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `equipped_pet` varchar(50) DEFAULT NULL;",
        "ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `equipped_treasure` varchar(50) DEFAULT NULL;",

        # 📄 Ghi chú: danh mục spirit_items được backend tự đồng bộ từ
        # backend/assets/spirit_items.json khi khởi động (sync_catalog_from_manifest),
        # nên KHÔNG cần seed cứng ở đây.
    ]