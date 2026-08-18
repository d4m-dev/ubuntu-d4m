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
