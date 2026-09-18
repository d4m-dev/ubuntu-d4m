// 🎨 Markup NGUYÊN BẢN từ index.html (chỉ bỏ script tags, thêm controls cho video)
export const MUSIC_PRO_HTML = `<div id="loader" class="flex-center">
    <div class="loader-ring"></div>
    <h3 style="font-weight:700; letter-spacing:1px;">MUSIC PRO</h3>
</div>

<div id="toast"><i class="fa-solid fa-circle-check" style="color:var(--primary)"></i> <span id="toast-msg">Thông báo</span></div>

<div class="app-layout">
    <div class="top-bar">
        <div class="logo"><i class="fa-brands fa-youtube"></i> Music Pro</div>
        <div class="flex-center" style="gap: 15px;">
            <div class="avatar" style="width:36px; height:36px; border-radius:50%; overflow:hidden; border:2px solid var(--border);">
                <img src="/src/favicon/ubuntu-backend/favicon-96x96.png" style="width:100%">
            </div>
        </div>
    </div>

    <div class="search-wrapper">
        <div class="search-box">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="search-input" placeholder="Tìm tên bài hát, ca sĩ...">
            <button id="btn-clear-search" style="display:none;"><i class="fa-solid fa-xmark"></i></button>
        </div>
    </div>

    <div class="chips-wrapper">
        <div class="chips-row">
            <span class="chip active" data-type="all">Tất Cả</span>
            <span class="chip" data-type="remix">Nhạc Remix</span>
            <span class="chip" data-type="tet">Nhạc Tết</span>
            <span class="chip" data-type="lofi">Lofi</span>
            <span class="chip" data-type="favorites">Yêu thích</span>
        </div>
    </div>

    <div class="list-container" id="main-scroll">
        <div class="list-header">
            <div class="header-main">
                <h2>Danh sách phát</h2>
                <p>Cập nhật hôm nay • Dành riêng cho bạn</p>
            </div>
            <div class="sort-controls" id="sort-controls" style="display: none;">
                <button class="btn-sort active" data-sort="id" id="sort-by-date">
                    <i class="fa-solid fa-clock"></i> <span>Mới nhất</span>
                </button>
                <button class="btn-sort" data-sort="name" id="sort-by-name">
                    <i class="fa-solid fa-font"></i> <span>Tên A-Z</span>
                </button>
            </div>
        </div>
        <div id="track-list"></div>
        <div style="height: 150px;"></div>
    </div>

    <div class="mini-player hide" id="mini-player">
        <div class="progress-line"><div class="progress-fill" id="mini-fill"></div></div>
        <div class="mini-content" id="mini-click-area">
            <div class="mini-img-box"><img id="mini-img" src="" alt=""></div>
            <div class="mini-text-box">
                <span class="mini-title" id="mini-title">...</span>
                <span class="mini-status" id="mini-artist">...</span>
            </div>
            <div class="flex-center" style="gap:5px;">
                <button class="btn-icon" id="btn-mini-play"><i class="fa-solid fa-play"></i></button>
                <button class="btn-icon" id="btn-mini-next"><i class="fa-solid fa-forward-step"></i></button>
            </div>
        </div>
    </div>

    <div class="player-overlay" id="player-overlay">
        <div class="ambient-glow" id="ambient-light"></div>
        <div class="overlay-header">
            <button class="btn-icon" id="btn-close"><i class="fa-solid fa-chevron-down"></i></button>
            <div class="tab-switcher">
                <div class="tab-btn active" data-tab="song">SONG</div>
                <div class="tab-btn" data-tab="video">VIDEO</div>
                <div class="tab-btn" data-tab="lyrics">LYRICS</div>
            </div>
            <div style="position: relative;">
                <button class="btn-icon" id="btn-options"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                <div class="options-menu" id="options-menu">
                    <div class="menu-item" id="btn-switch-beat">
                        <i class="fa-solid fa-microphone-lines"></i>
                        <span>Chuyển sang Beat</span>
                        <div class="toggle-switch"></div>
                    </div>
                    <div class="menu-item" id="btn-open-timer">
                        <i class="fa-regular fa-clock"></i>
                        <span id="timer-menu-text">Hẹn giờ tắt</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="player-stage">
            <div class="stage-view active" id="view-song">
                <div class="artwork-card"><img id="full-artwork" src="" alt=""></div>
            </div>
            <div class="stage-view" id="view-video">
                <div class="video-container">
                    <video id="video-element" playsinline webkit-playsinline controls></video>
                    <div class="video-fallback" id="video-msg">
                        <div class="loader-ring" style="width:30px;height:30px;border-width:3px;"></div>
                        <span>Đang tải Video...</span>
                    </div>
                </div>
            </div>
            <div class="stage-view" id="view-lyrics">
                <div class="lyrics-container" id="lyrics-content">
                    <p style="text-align:center; color:var(--text-sub);">Đang tải lời bài hát...</p>
                </div>
            </div>
        </div>

        <div class="player-controls">
            <div class="meta-info">
                <div class="song-texts">
                    <div class="marquee-wrapper" id="marquee-box-title">
                        <span class="marquee-content text-h1" id="full-title">Title</span>
                    </div>
                    <div class="marquee-wrapper" id="marquee-box-artist">
                        <span class="marquee-content text-h2" id="full-artist">Artist</span>
                    </div>
                </div>
                <div class="flex-center" style="gap:10px;">
                    <button class="btn-icon" id="btn-dl"><i class="fa-solid fa-download"></i></button>
                    <button class="btn-icon btn-share" id="btn-share-dynamic"><i class="fa-solid fa-share-nodes"></i></button>
                    <button class="btn-icon" id="btn-heart"><i class="fa-regular fa-heart"></i></button>
                </div>
            </div>

            <div class="slider-group">
                <div class="progress-container" style="display:flex; align-items:center; gap:10px;">
                    <span id="curr-time" style="font-size:12px; color:var(--text-sub); width:40px;">0:00</span>
                    <input type="range" id="seek-bar" value="0" min="0" max="100" step="0.1">
                    <span id="total-time" style="font-size:12px; color:var(--text-sub); width:40px;">0:00</span>
                </div>
            </div>

            <div class="controls-row">
                <button class="btn-icon" id="btn-shuffle"><i class="fa-solid fa-shuffle"></i></button>
                <button class="btn-icon" id="btn-prev" style="font-size:24px;"><i class="fa-solid fa-backward-step"></i></button>
                <button class="btn-play-xl" id="btn-main-play"><i class="fa-solid fa-play"></i></button>
                <button class="btn-icon" id="btn-next" style="font-size:24px;"><i class="fa-solid fa-forward-step"></i></button>
                <button class="btn-icon" id="btn-repeat"><i class="fa-solid fa-repeat"></i></button>
            </div>

            <div class="vol-wrapper">
                <button class="btn-icon" id="btn-mute" style="width:30px; height:30px; font-size:16px;">
                    <i class="fa-solid fa-volume-high"></i>
                </button>
                <input type="range" id="vol-bar" min="0" max="1" step="0.05" value="0.8">
            </div>
        </div>
    </div>

    <nav class="bottom-nav">
        <div class="nav-link active"><i class="fa-solid fa-house"></i> <span>Trang chủ</span></div>
        <div class="nav-link"><i class="fa-solid fa-compass"></i> <span>Khám phá</span></div>
        <div class="nav-link" id="nav-favorites"><i class="fa-solid fa-heart"></i> <span>Yêu thích</span></div>
        <div class="nav-link" id="nav-settings"><i class="fa-solid fa-gear"></i> <span>Cài đặt</span></div>
    </nav>

    <div id="timer-modal" class="modal-overlay"><div class="modal-content"><h3>Hẹn giờ tắt nhạc</h3><div class="timer-grid"><button class="timer-btn" data-time="15">15 Phút</button><button class="timer-btn" data-time="30">30 Phút</button><button class="timer-btn" data-time="45">45 Phút</button><button class="timer-btn" data-time="60">1 Giờ</button><button class="timer-btn" data-time="120">2 Giờ</button><button class="timer-btn stop" data-time="0" style="color: #ff4757;">Tắt hẹn giờ</button></div><button class="btn-close-modal" id="btn-close-timer">Đóng</button></div></div>
    <div id="download-modal" class="modal-overlay"><div class="modal-content"><h3>Tải xuống</h3><p id="dl-song-title" style="text-align:center; color:var(--text-sub); margin-bottom:20px; font-size:14px;"></p><div class="download-grid"><button class="dl-btn" data-type="audio"><i class="fa-solid fa-music"></i><span>Nhạc MP3</span></button><button class="dl-btn" data-type="beat"><i class="fa-solid fa-microphone-lines"></i><span>Beat / Kara</span></button><button class="dl-btn" data-type="video"><i class="fa-solid fa-video"></i><span>Video MP4</span></button><button class="dl-btn" data-type="lyric"><i class="fa-solid fa-file-lines"></i><span>Lời bài hát</span></button></div><button class="btn-close-modal" id="btn-close-dl">Đóng</button></div></div>

</div>`;
