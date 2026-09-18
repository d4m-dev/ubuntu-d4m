window.MusicProModules = window.MusicProModules || {};

window.MusicProModules.auth = {
    initAuthSettings() {
        const authBtn = document.getElementById('auth-settings-btn');
        if (!authBtn) return; // Nếu không tìm thấy nút giả lập thì bỏ qua

        const token = localStorage.getItem('d4m_sso_token');
        
        // Hàm giải mã JWT Token (Tái sử dụng)
        const parseJwt = (t) => {
            try {
                return JSON.parse(decodeURIComponent(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
            } catch (e) { return null; }
        };

        if (token) {
            const payload = parseJwt(token);
            const userName = payload ? (payload.full_name || payload.sub) : "User";
            
            // Vẽ giao diện nút ĐĂNG XUẤT
            authBtn.innerHTML = `
                <div class="settings-icon" style="color: #ef4444; background: rgba(239, 68, 68, 0.1);"><i class="fa-solid fa-right-from-bracket"></i></div>
                <div class="settings-info">
                    <div class="settings-name" style="color: #ef4444; font-weight: bold;">Đăng Xuất D4M ID</div>
                    <div class="settings-desc">Ngắt kết nối khỏi tài khoản @${payload.sub}</div>
                </div>
            `;
            
            // Xử lý sự kiện click
            authBtn.onclick = () => {
                const isConfirm = confirm(`Sếp ${userName} có chắc chắn muốn ngắt kết nối thẻ định danh khỏi Music Pro không?`);
                if (isConfirm) {
                    localStorage.removeItem('d4m_sso_token');
                    window.location.reload(); // Ép tải lại trang để màn hình khóa (Lock Screen) xuất hiện
                }
            };
        } else {
            // Trường hợp rủi ro: Mất token
            authBtn.innerHTML = `
                <div class="settings-icon" style="color: #3b82f6; background: rgba(59, 130, 246, 0.1);"><i class="fa-solid fa-fingerprint"></i></div>
                <div class="settings-info">
                    <div class="settings-name" style="color: #3b82f6; font-weight: bold;">Đăng Nhập</div>
                    <div class="settings-desc">Kết nối lại thẻ định danh D4M</div>
                </div>
            `;
            
            authBtn.onclick = () => {
                window.location.href = `/auth?redirect=${window.location.pathname}`;
            };
        }
    }
};
