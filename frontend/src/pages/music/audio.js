window.MusicProModules = window.MusicProModules || {};

window.MusicProModules.audio = {

    // --- AUDIO EFFECTS INTEGRATION ---
    initAudioEffects() {
        this.initAudioContext();
        let audioControlsModal = document.getElementById('audio-controls-modal');

        if (!audioControlsModal) {
            audioControlsModal = document.createElement('div');
            audioControlsModal.id = 'audio-controls-modal';
            audioControlsModal.className = 'modal-overlay';
            document.body.appendChild(audioControlsModal);
        }

        audioControlsModal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 85vh; overflow-y: auto; border-radius: 16px; padding: 24px;">
                <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; text-align: center;">Cài đặt âm thanh</h3>
                <div class="settings-section">
                    <div class="settings-title">ÂM THANH KHÔNG GIAN</div>
                    <div class="settings-item">
                        <div class="settings-icon"><i class="fa-solid fa-headphones"></i></div>
                        <div class="settings-info">
                            <div class="settings-name">Âm thanh 3D</div>
                            <div class="settings-desc">Tạo hiệu ứng âm thanh không gian sống động</div>
                        </div>
                        <div class="toggle-switch" id="spatial-audio-toggle"></div>
                    </div>
                </div>
                <div class="settings-section">
                    <div class="settings-title">CÂN BẰNG ÂM THANH</div>
                    <div class="eq-controls">
                        <div class="eq-slider"><label>Trầm (60Hz)</label><input type="range" id="eq-low" min="-12" max="12" value="0"><span id="eq-low-value">0dB</span></div>
                        <div class="eq-slider"><label>Trung-Trầm (230Hz)</label><input type="range" id="eq-mid-low" min="-12" max="12" value="0"><span id="eq-mid-low-value">0dB</span></div>
                        <div class="eq-slider"><label>Trung (910Hz)</label><input type="range" id="eq-mid" min="-12" max="12" value="0"><span id="eq-mid-value">0dB</span></div>
                        <div class="eq-slider"><label>Trung-Cao (3.5kHz)</label><input type="range" id="eq-mid-high" min="-12" max="12" value="0"><span id="eq-mid-high-value">0dB</span></div>
                        <div class="eq-slider"><label>Caо (14kHz)</label><input type="range" id="eq-high" min="-12" max="12" value="0"><span id="eq-high-value">0dB</span></div>
                    </div>
                </div>
                <button class="btn-close-modal" id="btn-close-audio-controls">Đóng</button>
            </div>
        `;

        const spatialToggle = document.getElementById('spatial-audio-toggle');
        if (spatialToggle) spatialToggle.onclick = () => this.toggleSpatialAudio();

        const eqControls = ['eq-low', 'eq-mid-low', 'eq-mid', 'eq-mid-high', 'eq-high'];
        eqControls.forEach(controlId => {
            const control = document.getElementById(controlId);
            const valueDisplay = document.getElementById(`${controlId}-value`);
            if (control && valueDisplay) {
                const updateEQ = () => {
                    valueDisplay.textContent = `${control.value}dB`;
                    if (typeof this.updateEqualizer === 'function') this.updateEqualizer();
                };
                control.oninput = updateEQ;
                // Set initial value
                valueDisplay.textContent = `${control.value}dB`;
            }
        });

        const btnCloseAudioControls = document.getElementById('btn-close-audio-controls');
        if (btnCloseAudioControls && audioControlsModal) {
            btnCloseAudioControls.onclick = () => audioControlsModal.classList.remove('show');
            audioControlsModal.onclick = (e) => { if (e.target === audioControlsModal) audioControlsModal.classList.remove('show'); };
        }
    },

    showLayoutSelectorModal() {
        let modal = document.getElementById('layout-selector-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'layout-selector-modal';
            modal.className = 'modal-overlay';
            // ... (Phần HTML Layout Modal sếp đã viết - tôi giữ nguyên logic để tránh dài code không cần thiết)
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 85vh; overflow-y: auto; border-radius: 16px; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Chọn bố cục</h3>
                        <button class="btn-close-modal" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); border: none; color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div style="margin-bottom: 24px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div class="layout-option ${this.state.layoutMode === 'standard' ? 'selected' : ''}" data-layout="standard" style="padding: 15px; border-radius: 12px; background: var(--bg-secondary); cursor: pointer; border: 2px solid ${this.state.layoutMode === 'standard' ? 'var(--primary)' : 'transparent'};">
                                <div style="display: flex; justify-content: center; align-items: center; height: 80px; background: var(--bg-surface); border-radius: 8px; margin-bottom: 10px;">
                                    <div style="width: 60%; height: 10px; background: var(--primary); border-radius: 5px;"></div>
                                </div>
                                <div style="text-align: center; font-weight: 600; color: var(--text-main);">Tiêu chuẩn</div>
                            </div>
                            <div class="layout-option ${this.state.layoutMode === 'compact' ? 'selected' : ''}" data-layout="compact" style="padding: 15px; border-radius: 12px; background: var(--bg-secondary); cursor: pointer; border: 2px solid ${this.state.layoutMode === 'compact' ? 'var(--primary)' : 'transparent'};">
                                <div style="display: flex; justify-content: center; align-items: center; height: 80px; background: var(--bg-surface); border-radius: 8px; margin-bottom: 10px;">
                                    <div style="width: 80%; height: 8px; background: var(--primary); border-radius: 4px; margin-bottom: 5px;"></div>
                                    <div style="width: 70%; height: 8px; background: var(--primary); border-radius: 4px;"></div>
                                </div>
                                <div style="text-align: center; font-weight: 600; color: var(--text-main);">Gọn nhẹ</div>
                            </div>
                            <div class="layout-option ${this.state.layoutMode === 'spacious' ? 'selected' : ''}" data-layout="spacious" style="padding: 15px; border-radius: 12px; background: var(--bg-secondary); cursor: pointer; border: 2px solid ${this.state.layoutMode === 'spacious' ? 'var(--primary)' : 'transparent'};">
                                <div style="display: flex; justify-content: center; align-items: center; height: 80px; background: var(--bg-surface); border-radius: 8px; margin-bottom: 10px; flex-direction: column;">
                                    <div style="width: 50%; height: 12px; background: var(--primary); border-radius: 6px; margin-bottom: 8px;"></div>
                                    <div style="width: 40%; height: 12px; background: var(--primary); border-radius: 6px;"></div>
                                </div>
                                <div style="text-align: center; font-weight: 600; color: var(--text-main);">Rộng rãi</div>
                            </div>
                            <div class="layout-option ${this.state.layoutMode === 'minimal' ? 'selected' : ''}" data-layout="minimal" style="padding: 15px; border-radius: 12px; background: var(--bg-secondary); cursor: pointer; border: 2px solid ${this.state.layoutMode === 'minimal' ? 'var(--primary)' : 'transparent'};">
                                <div style="display: flex; justify-content: center; align-items: center; height: 80px; background: var(--bg-surface); border-radius: 8px; margin-bottom: 10px;">
                                    <div style="width: 70%; height: 6px; background: var(--primary); border-radius: 3px;"></div>
                                </div>
                                <div style="text-align: center; font-weight: 600; color: var(--text-main);">Tối giản</div>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn-close-modal" id="btn-cancel-layout" style="flex: 1; background: rgba(255,255,255,0.05);">Hủy</button>
                        <button id="btn-save-layout" style="flex: 1; background: var(--primary); color: white; padding: 12px; border-radius: 12px; font-weight: 600;">Lưu</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.classList.add('show');
        const layoutOptions = document.querySelectorAll('.layout-option');
        const btnCancel = document.getElementById('btn-cancel-layout');
        const btnSave = document.getElementById('btn-save-layout');

        layoutOptions.forEach(option => {
            option.onclick = () => {
                layoutOptions.forEach(opt => { opt.classList.remove('selected'); opt.style.border = '2px solid transparent'; });
                option.classList.add('selected');
                option.style.border = '2px solid var(--primary)';
            };
        });

        modal.querySelectorAll('.btn-close-modal').forEach(btn => btn.onclick = () => modal.classList.remove('show'));
        btnCancel.onclick = () => modal.classList.remove('show');
        btnSave.onclick = () => {
            const selectedLayout = document.querySelector('.layout-option.selected')?.dataset.layout || 'standard';
            this.setLayoutMode(selectedLayout);
            modal.classList.remove('show');
            this.showToast('Đã cập nhật bố cục');
        };
        modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('show'); };
    },

    setLayoutMode(layoutMode) {
        this.state.layoutMode = layoutMode;
        localStorage.setItem('layoutMode', layoutMode);
        const body = document.body;
        body.classList.remove('layout-standard', 'layout-compact', 'layout-spacious', 'layout-minimal');
        body.classList.add(`layout-${layoutMode}`);

        switch(layoutMode) {
            case 'compact': document.documentElement.style.setProperty('--spacing-multiplier', '0.8'); break;
            case 'spacious': document.documentElement.style.setProperty('--spacing-multiplier', '1.2'); break;
            case 'minimal': document.documentElement.style.setProperty('--spacing-multiplier', '0.9'); break;
            default: document.documentElement.style.setProperty('--spacing-multiplier', '1');
        }

        if (this.state.currentNav === 3 && typeof this.renderSettings === 'function') {
            this.renderSettings();
        }
    },

    toggleFavorite(idx) {
        const id = String(this.state.playlist[idx].id);
        if (this.state.favorites.includes(id)) {
            this.state.favorites = this.state.favorites.filter(x => x !== id);
            this.showToast('Đã xóa khỏi yêu thích');
        } else {
            this.state.favorites.push(id);
            this.showToast('Đã thêm vào yêu thích');
        }
        localStorage.setItem('favorites', JSON.stringify(this.state.favorites));
        this.updateHeartButton();
        if (typeof this.renderPlaylist === 'function') this.renderPlaylist();
    },

    updateHeartButton() {
        if (!this.state.playlist[this.state.currentIndex]) return;
        const isFav = this.state.favorites.includes(String(this.state.playlist[this.state.currentIndex].id));
        const btn = document.getElementById('btn-heart');
        if (!btn) return;
        btn.className = `btn-icon ${isFav ? 'active' : ''}`;
        btn.innerHTML = `<i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>`;
        btn.style.color = isFav ? 'var(--primary)' : '';
    },

    // --- PLAYBACK CONTROLS ---
    loadSong(idx, autoPlay = true) {
        const wasLyricsPiPOpen = this.lyricsPiPWindow !== null || this.isLyricsCanvasActive;
        const wasCanvasPiP = this.isLyricsCanvasActive;

        if (this.lyricsPiPWindow) {
            this.lyricsPiPWindow.close();
            this.lyricsPiPWindow = null;
        }

        if (this.lyricsPipVideo && document.pictureInPictureElement === this.lyricsPipVideo) {
            this.lyricsPipVideo.exitPictureInPicture().catch(() => {});
            this.isLyricsCanvasActive = false;
        }

        if (typeof this.pause === 'function') this.pause();

        this.state.currentIndex = idx;
        this.state.isPreloading = false;
        this.state.nextTrackData = null;
        this.isBackgroundFallback = false;

        const song = this.state.playlist[idx];
        this.updateUI(song);
        this.updateHeartButton();
        if (typeof this.updateBeatBtnUI === 'function') this.updateBeatBtnUI();
        // 🛡️ FIX giật list: chỉ cập nhật hàng đang phát, không rebuild cả virtual list
        if (typeof this.refreshActiveState === 'function') this.refreshActiveState();
        if (typeof this.loadLyrics === 'function') this.loadLyrics(song.lyric);
        if (typeof this.renderContextQueue === 'function') this.renderContextQueue();
        this.addToHistory(song.id);
        if (typeof this.reportView === 'function') this.reportView(song); // 📈 D4M: lượt nghe

        this.currentSongHasVideo = !!(song.vid && !song.vid.includes('..4.mp4') && !song.vid.includes('ERROR'));
        if (typeof this.updatePiPButtonUI === 'function') this.updatePiPButtonUI();

        // Preload all sources - Fix stuttering issue (always assign src in parallel)
        this.video.src = this.currentSongHasVideo ? song.vid : '';
        this.audio.src = song.path;
        this.beatAudio.src = (song.instrumental && song.instrumental !== 'Tạm thời chưa có!') ? song.instrumental : '';

        if (!this.currentSongHasVideo) {
            this.elements.videoMsg.style.display = 'none';
            if (this.state.currentMode === 'video') {
                this.showToast('Video không khả dụng');
                if (typeof this.switchTab === 'function') this.switchTab('song');
            }
        }

        if (autoPlay) {
            if (typeof this.resumeAudioContext === 'function') this.resumeAudioContext();
            if (typeof this.play === 'function') this.play();
        }

        if (typeof this.checkMarquee === 'function') this.checkMarquee();
        localStorage.setItem('lastIndex', idx);
        localStorage.setItem('lastTime', 0);
    },

    addToHistory(id) {
        this.state.history = [String(id), ...this.state.history.filter(x => x !== String(id))].slice(0, 20);
        localStorage.setItem('history', JSON.stringify(this.state.history));
    },

    // 🌟 ENHANCED: MEDIA SESSION FOR BACKGROUND PLAYBACK PROTECTION 🌟
    updateMediaSession(song) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.name,
                artist: song.artist,
                album: 'Music Pro Ultimate',
                artwork: [
                    { src: song.artwork, sizes: '96x96', type: 'image/jpeg' },
                    { src: song.artwork, sizes: '256x256', type: 'image/jpeg' },
                    { src: song.artwork, sizes: '512x512', type: 'image/jpeg' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => {
                if(typeof this.resumeAudioContext === 'function') this.resumeAudioContext();
                if(typeof this.play === 'function') this.play(); else if(typeof this.togglePlay === 'function') this.togglePlay();
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                if(typeof this.pause === 'function') this.pause(); else if(typeof this.togglePlay === 'function') this.togglePlay();
            });
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                if(typeof this.resumeAudioContext === 'function') this.resumeAudioContext();
                if(typeof this.prev === 'function') this.prev();
            });
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                if(typeof this.resumeAudioContext === 'function') this.resumeAudioContext();
                if(typeof this.next === 'function') this.next();
            });
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if(typeof this.seek === 'function') this.seek(details.seekTime);
            });
        }
    },

    updateUI(song) {
        const t = document.getElementById('full-title');
        t.innerText = song.name;
        t.removeAttribute('d');
        t.parentElement.classList.remove('animate');
        document.getElementById('full-artist').innerText = song.artist;
        document.getElementById('mini-title').innerText = song.name;
        document.getElementById('mini-artist').innerText = song.artist;
        document.getElementById('full-artwork').src = song.artwork;
        document.getElementById('mini-img').src = song.artwork;

        if (this.state.autoThemeByCover) {
            this.applyDynamicUIColors(song.artwork).then(() => {
                this.extractColor(song.artwork).then(color => {
                    if (!color) {
                        const hue = (this.state.currentIndex * 50) % 360;
                        if(this.elements.ambient) this.elements.ambient.style.background = `radial-gradient(circle, hsl(${hue},70%,50%), transparent 70%)`;
                    }
                });
            });
        }

        // Call Background Media Session declaration
        this.updateMediaSession(song);
    },

    extractColor(url) {
        return new Promise((resolve) => {
            if (url && url.includes('github.com') && url.includes('/raw/')) {
                url = url.replace('github.com', 'raw.githubusercontent.com').replace('/raw/', '/');
            }
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1; canvas.height = 1;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, 1, 1);
                    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                    resolve({rgb: `rgb(${r}, ${g}, ${b})`, hex: this.rgbToHex(r, g, b)});
                } catch (e) { resolve(null); }
            };
            img.onerror = () => resolve(null);
        });
    },

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    async applyDynamicUIColors(albumArtwork) {
        const colors = await this.extractColor(albumArtwork);
        if (colors) {
            document.documentElement.style.setProperty('--primary', colors.rgb);
            document.documentElement.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${colors.hex} 0%, ${this.darkenColor ? this.darkenColor(colors.hex, 30) : '#000'} 100%)`);

            if (this.elements.ambient) {
                this.elements.ambient.style.background = `radial-gradient(circle, ${colors.hex}, transparent 70%)`;
            }
            if(typeof this.applyColorToUIElements === 'function') this.applyColorToUIElements(colors.hex);
            if(typeof this.updateAllRangeInputs === 'function') this.updateAllRangeInputs();
        }
    },

    // 🌟 ENHANCED: CROSSFADE FOR BEAT SWITCHING (Ultra-smooth without reloading src) 🌟
    toggleBeatMode() {
        const isNowBeat = !this.state.isBeatMode;
        this.state.isBeatMode = isNowBeat;

        if (this.elements.btnSwitchBeat) {
            this.elements.btnSwitchBeat.classList.toggle('active', isNowBeat);
        }
        this.showToast(isNowBeat ? "Chế độ Beat/Karaoke" : "Chế độ Nhạc Gốc");

        if (this.state.isPlaying) {
            const fadeDuration = 500; // Smooth transition in 0.5s
            const steps = 20;
            const stepTime = fadeDuration / steps;

            let currentStep = 0;
            const startMainVol = isNowBeat ? this.state.volume : 0;
            const endMainVol = isNowBeat ? 0 : this.state.volume;
            const startBeatVol = isNowBeat ? 0 : this.state.volume;
            const endBeatVol = isNowBeat ? this.state.volume : 0;

            // Get authoritative time from Video (if available) or Track currently playing
            const masterTime = this.currentSongHasVideo ? this.video.currentTime : (isNowBeat ? this.audio.currentTime : this.beatAudio.currentTime);

            // Force time synchronization before parallel playback
            try { this.beatAudio.currentTime = masterTime; } catch(e){}
            try { this.audio.currentTime = masterTime; } catch(e){}

            // Start both tracks in parallel
            this.beatAudio.play().catch(()=>{});
            this.audio.play().catch(()=>{});

            // Fade loop
            const fadeInterval = setInterval(() => {
                currentStep++;
                const ratio = currentStep / steps;

                if(!this.state.isMuted) {
                    this.audio.volume = Math.max(0, startMainVol + (endMainVol - startMainVol) * ratio);
                    this.beatAudio.volume = Math.max(0, startBeatVol + (endBeatVol - startBeatVol) * ratio);
                }

                if (currentStep >= steps) {
                    clearInterval(fadeInterval);
                    // Stop the unnecessary track to free up resources
                    if(isNowBeat) this.audio.pause();
                    else this.beatAudio.pause();
                }
            }, stepTime);
        }
    },

    // --- PRELOADING LOGIC ---
    checkPreload(currentTime, duration) {
        let threshold = 10;
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn && conn.downlink) {
            if (conn.downlink < 2) threshold = 30;
            else if (conn.downlink < 5) threshold = 20;
        }

        const timeLeft = duration - currentTime;
        if (timeLeft <= threshold && !this.state.isPreloading) {
            this.state.isPreloading = true;
            this.executePreload();
        }
    },

    executePreload() {
        const nextIdx = this.getNextIndex();
        if (nextIdx === -1) return;
        const nextSong = this.state.playlist[nextIdx];
        this.state.nextTrackData = nextSong;
        const nextAudioSrc = this.state.isBeatMode ? nextSong.instrumental : nextSong.path;
        this.preloadAudioAgent.src = nextAudioSrc;
        this.preloadAudioAgent.load();
        if (this.state.currentMode === 'video' && nextSong.vid && !nextSong.vid.includes('ERROR')) {
            this.preloadVideoAgent.src = nextSong.vid;
            this.preloadVideoAgent.load();
        }
    },

    getNextIndex() {
        let display = [];
        if (typeof this.getDisplayPlaylist === 'function') {
            display = this.getDisplayPlaylist();
        } else {
            display = this.state.playlist;
        }

        if (!display.length) return -1;
        const curr = this.state.playlist[this.state.currentIndex];
        let idx = display.findIndex(t => t.id === curr.id);
        let nextIdx = 0;

        if (this.state.isShuffle) {
            if (display.length > 1) do { nextIdx = Math.floor(Math.random() * display.length); } while (nextIdx === idx);
        } else {
            if (idx !== -1) nextIdx = idx + 1 >= display.length ? 0 : idx + 1;
        }
        return this.state.playlist.findIndex(t => t.id === display[nextIdx].id);
    },
};