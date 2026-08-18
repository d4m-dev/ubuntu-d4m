#!/bin/bash

# Hiển thị lời chào hệ thống
echo "========================================"
echo "    CHÀO MỪNG ĐẾN VỚI BACKEND CORE      "
echo " Đang khởi động hệ thống từ môi trường ảo "
echo "========================================"

# Chuyển hướng đến thư mục dự án trên bộ nhớ dùng chung của Android
cd /mnt/sdcard/d4mdev/ubuntu-backend || { echo "❌ Lỗi: Không tìm thấy thư mục dự án! Hãy kiểm tra lại kết nối bộ nhớ."; exit 1; }

# Khởi chạy main.py bằng cách gọi thẳng python3 chuẩn bên trong myenv
# Cách này không cần chạy lệnh 'source activate' trước mà vẫn ăn đúng thư viện của môi trường ảo
~/myenv/bin/python3 main.py