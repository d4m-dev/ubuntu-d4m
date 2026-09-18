window.MusicProModules = window.MusicProModules || {};

window.MusicProModules.lyrics = {

    // --- REFACTORED FOR HOT-SWAPPING ---
    switchTab(tab) {
        // Close lyrics PiP when switching away from lyrics tab
        if (this.video && this.state.currentMode === 'video' && tab !== 'video') this.video.pause(); // 🛡️ FIX: rời tab video
        if (this.state.currentMode === 'lyrics' && tab !== 'lyrics') {
            if (this.lyricsPiPWindow) {
                this.lyricsPiPWindow.close();
                this.lyricsPiPWindow = null;
            }
            if (this.lyricsPipVideo && document.pictureInPictureElement === this.lyricsPipVideo) {
                this.lyricsPipVideo.exitPictureInPicture().catch(() => {});
            }
        }

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.querySelectorAll('.stage-view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${tab}`).classList.add('active');

        this.state.currentMode = tab;
        this.updatePiPButtonUI();

        // Logic mới: Chỉ thay đổi UI, không can thiệp vào trình phát đang chạy.
        if (tab === 'video') {
            // 🛡️ FIX: đồng bộ video với nhạc và PHÁT khi mở tab video
            if (this.currentSongHasVideo && this.video) {
                try {
                    this.video.currentTime = this.audio.currentTime || 0;
                    if (this.state.isPlaying) this.video.play().catch(() => {});
                } catch (e) {}
            }
            if (!this.currentSongHasVideo) {
                if (this.state.isPlaying) {
                    this.pause();
                    this.showToast('Video không khả dụng');
                }
                this.elements.videoMsg.style.display = 'flex';
                this.elements.videoMsg.innerHTML = '<span>Không có Video</span>';
            } else {
                this.elements.videoMsg.style.display = 'none';
            }
        }
    },

    /**
     * Setup swipe gestures for full player tabs
     */
    setupTabSwipeGestures() {
        const views = document.querySelectorAll('.stage-view');
        if (!views || views.length === 0) return;

        const tabs = ['song', 'video', 'lyrics'];
        views.forEach(view => {
            let startX = 0;
            let startY = 0;
            let isSwiping = false;
            const SWIPE_THRESHOLD = 30; // Minimum distance to trigger swipe

            view.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                isSwiping = true;
            }, { passive: true });

            view.addEventListener('touchmove', (e) => {
                if (!isSwiping) return;
                const moveX = e.touches[0].clientX;
                const moveY = e.touches[0].clientY;
                const diffX = Math.abs(moveX - startX);
                const diffY = Math.abs(moveY - startY);
                if (diffY > diffX) return; // Vertical movement, don't interfere
                if (diffX > 10) e.preventDefault(); // Prevent horizontal scroll
            }, { passive: false });

            view.addEventListener('touchend', (e) => {
                if (!isSwiping) return;
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = startX - endX; 
                const diffY = startY - endY;
                if (Math.abs(diffX) > SWIPE_THRESHOLD && Math.abs(diffX) > Math.abs(diffY)) {
                    const currentIndex = tabs.indexOf(this.state.currentMode);
                    if (diffX > 0) {
                        const nextIndex = (currentIndex + 1) % tabs.length;
                        this.switchTab(tabs[nextIndex]);
                    } else {
                        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                        this.switchTab(tabs[prevIndex]);
                    }
                }
                isSwiping = false;
            }, { passive: true });
        });
    },

    // --- LYRICS MANAGEMENT ---
        /**
     * Tải lời bài hát: Hỗ trợ JSON, LRC, và cả Text thuần túy
     */
    async loadLyrics(url) {
        const c = this.elements.lyricsContainer;
        if (!url) { c.innerHTML = '<p style="text-align:center;color:var(--text-sub)">Chưa có lời bài hát.</p>'; this.lyricsData = []; return; } // 🛡️ FIX: url rỗng
        c.innerHTML = '<p style="text-align:center;color:var(--text-sub)">Đang tải...</p>';
        this.lyricsData = [];

        try {
            const res = await fetch(url + '?t=' + new Date().getTime());
            const text = await res.text();
            c.innerHTML = '<div style="height:20vh"></div>';

            let items = [];

            // 1. Phân tích dữ liệu
            if (text.trim().startsWith('{')) {
                const data = JSON.parse(text);
                items = data.lyrics || []; 
            } else {
                // Parse .lrc truyền thống
                text.split('\n').forEach((line) => {
                    const m = line.match(/^\[(\d{2}):(\d{2})(\.\d+)?\](.*)/);
                    if (m) {
                        items.push({ 
                            time: (parseInt(m[1])*60 + parseInt(m[2]) + (m[3]?parseFloat(m[3]):0)) * 1000,
                            text: m[4].trim() 
                        });
                    } else if (line.trim() && !line.trim().startsWith('[')) {
                        // Trường hợp file text không có timestamp
                        items.push({ time: null, text: line.trim() });
                    }
                });
            }

            // 2. Render ra giao diện
            items.forEach((item, i) => {
                const p = document.createElement('p');
                p.className = 'lyric-row';
                p.id = `l-${i}`;
                p.innerText = item.text;

                if (item.time !== null && item.time !== undefined) {
                    const t = item.time / 1000;
                    this.lyricsData.push({ time: t, id: `l-${i}`, text: item.text });
                    p.onclick = () => { this.seek(t); };
                } else {
                    // Nếu là text tĩnh, làm cho nó trông dịu mắt hơn
                    p.style.opacity = '0.8';
                    p.style.marginBottom = '10px';
                }
                c.appendChild(p);
            });

            c.innerHTML += '<div style="height:40vh"></div>';
        } catch (e) {
            console.error("Lỗi:", e);
            c.innerHTML = '<p style="text-align:center;color:red">Không thể hiển thị lời bài hát</p>';
        }
    },



    /**
     * Đồng bộ lời bài hát với thời gian phát nhạc.
     */
    syncLyrics(t) {
        // Nếu mảng lyricsData rỗng (do đang ở chế độ Text tĩnh), bỏ qua việc tính toán
        if (!this.lyricsData.length) return;
        
        let id = null;
        for (let i = 0; i < this.lyricsData.length; i++) { 
            if (this.lyricsData[i].time <= t) id = this.lyricsData[i].id; 
            else break; 
        }
        
        if (id) {
            const curr = this.elements.lyricsContainer.querySelector('.lyric-row.active'); 
            if (curr && curr.id !== id) {
                curr.classList.remove('active');
                curr.style.color = '';
                curr.style.opacity = '';
            }
            
            const next = this.elements.lyricsContainer.querySelector('#' + id); 
            if (next && !next.classList.contains('active')) { 
                next.classList.add('active'); 
                next.style.color = 'var(--primary)';
                next.style.opacity = '1';
                // Cuộn mượt mà đến câu hát hiện tại
                next.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
            }
            
            // Update canvas PiP lyrics if active
            if (this.isLyricsCanvasActive && this.lyricsCanvas) {
                this.updateLyricsCanvas(id);
            }
        }
    }
};
