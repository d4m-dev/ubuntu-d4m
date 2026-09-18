window.MusicProModules = window.MusicProModules || {};

window.MusicProModules.events = {

    setupEventListeners() {
        // Virtual Scroll & Auto Hide Search Bar
        let lastScrollTop = 0;
        const searchWrapper = this.elements.searchInput.closest('.search-wrapper') || this.elements.searchInput.parentElement;

        this.elements.scrollContainer.addEventListener('scroll', () => {
            if (typeof this.onScroll === 'function') this.onScroll();

            const scrollTop = this.elements.scrollContainer.scrollTop;
            if (searchWrapper && Math.abs(scrollTop - lastScrollTop) > 5) {
                if (scrollTop > lastScrollTop && scrollTop > 60) {
                    searchWrapper.classList.add('hidden');
                } else if (scrollTop < lastScrollTop) {
                    searchWrapper.classList.remove('hidden');
                }
            }
            lastScrollTop = Math.max(0, scrollTop);
        }, { passive: true });

        window.addEventListener('resize', () => { clearTimeout(this.resizeTimer); this.resizeTimer = setTimeout(() => { if(typeof this.renderPlaylist === 'function') this.renderPlaylist(); }, 200); });

        window.addEventListener('beforeunload', () => {
            if (this.state.isPlaying) {
                const t = this.currentSongHasVideo ? this.video.currentTime : (this.state.isBeatMode ? this.beatAudio.currentTime : this.audio.currentTime);
                localStorage.setItem('lastIndex', this.state.currentIndex);
                localStorage.setItem('lastTime', t);
            } else {
                localStorage.removeItem('lastIndex');
                localStorage.removeItem('lastTime');
            }

            if (this.state.spatialAudioEnabled && this.audioContext) {
                this.audioContext.close();
            }
        });

                // 🛡️ FIX giật âm thanh khi ẩn/hiện tab Chrome: tab hiện lại mà nhạc bị pause thì resume
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.state.isPlaying && this.audio && this.audio.paused) {
                this.audio.play().catch(() => {});
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (this.elements.overlay.classList.contains('open')) {
                if (e.key === 'Escape') {
                    this.elements.overlay.classList.remove('open');
                    return;
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    const tabs = ['song', 'video', 'lyrics'];
                    const idx = tabs.indexOf(this.state.currentMode);
                    if (typeof this.switchTab === 'function') this.switchTab(tabs[(idx + 1) % tabs.length]);
                    return;
                }
            }

            if (e.code === 'Space') {
                e.preventDefault(); if (typeof this.togglePlay === 'function') this.togglePlay();
            } else if (e.code === 'ArrowRight') {
                const t = this.currentSongHasVideo ? this.video.currentTime : (this.state.isBeatMode ? this.beatAudio.currentTime : this.audio.currentTime);
                if (typeof this.seek === 'function') this.seek(t + 5);
            } else if (e.code === 'ArrowLeft') {
                const t = this.currentSongHasVideo ? this.video.currentTime : (this.state.isBeatMode ? this.beatAudio.currentTime : this.audio.currentTime);
                if (typeof this.seek === 'function') this.seek(t - 5);
            } else if (e.code === 'KeyM') {
                this.state.isMuted = !this.state.isMuted;
                if (typeof this.setVolume === 'function') this.setVolume(this.state.volume, this.state.isMuted);
                if (typeof this.showToast === 'function') this.showToast(this.state.isMuted ? 'Đã tắt tiếng' : 'Đã bật tiếng');
            } else if (e.code === 'ArrowUp') {
                e.preventDefault();
                this.state.isMuted = false;
                let v = parseFloat(this.state.volume);
                v = Math.min(1, v + 0.1);
                if (typeof this.setVolume === 'function') this.setVolume(v, false);
                if (typeof this.showToast === 'function') this.showToast(`Âm lượng: ${Math.round(v * 100)}%`);
            } else if (e.code === 'ArrowDown') {
                e.preventDefault();
                this.state.isMuted = false;
                let v = parseFloat(this.state.volume);
                v = Math.max(0, v - 0.1);
                if (typeof this.setVolume === 'function') this.setVolume(v, v === 0);
                if (typeof this.showToast === 'function') this.showToast(`Âm lượng: ${Math.round(v * 100)}%`);
            } else if (e.code === 'KeyA') {
                e.preventDefault();
                const audioModal = document.getElementById('audio-controls-modal');
                if(audioModal) {
                    audioModal.classList.add('show');
                    document.getElementById('keypad-container').style.display = 'block';
                    document.getElementById('audio-controls').style.display = 'none';
                }
            } else if (e.code === 'KeyF') {
                e.preventDefault();
                if (document.fullscreenElement) {
                    if (document.exitFullscreen) { document.exitFullscreen(); } 
                    else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); } 
                } else if (this.elements.overlay.classList.contains('open') && this.state.currentMode === 'video') {
                    const videoContainer = document.querySelector('.video-container');
                    if (videoContainer) {
                        if (videoContainer.requestFullscreen) { videoContainer.requestFullscreen(); } 
                        else if (videoContainer.webkitRequestFullscreen) { videoContainer.webkitRequestFullscreen(); } 
                    }
                } else {
                    if (this.state.playlist[this.state.currentIndex]) this.elements.overlay.classList.add('open'); // 🛡️ FIX full player trống
                }
            } else if (e.key === 'Escape') {
                if (document.fullscreenElement) {
                    if (document.exitFullscreen) { document.exitFullscreen(); } 
                    else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); } 
                } else if (this.elements.overlay.classList.contains('open')) {
                    this.elements.overlay.classList.remove('open');
                }
            }
        });

        // 🌟 1. XỬ LÝ BACKGROUND VÀ FOREGROUND CỰC MƯỢT (CHỐNG CPU SPIKE) 🌟
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                if (this.audioContext && this.audioContext.state === 'running') {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    gain.gain.value = 0; 
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    osc.start();
                    osc.stop(this.audioContext.currentTime + 0.1); 
                }

                if (this.state.isPlaying && this.currentSongHasVideo && !this.state.isBeatMode && !document.pictureInPictureElement) {
                    this.isBackgroundFallback = true;
                    const t = this.video.currentTime;
                    this.audio.currentTime = t;
                    this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
                    this.audio.play().catch(()=>{}); 
                    this.video.pause(); 
                }
            } else {
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }

                setTimeout(() => {
                    if (this.isBackgroundFallback) {
                        this.isBackgroundFallback = false;
                        const t = this.audio.currentTime;
                        this.video.currentTime = t + 0.1; 
                        if(this.state.isPlaying) {
                            this.video.play().then(() => {
                                this.audio.pause();
                            }).catch(()=>{
                                this.audio.pause();
                            });
                        } else {
                            this.audio.pause();
                        }
                    }
                    if (this.state.isPlaying && this.currentSongHasVideo && this.state.isBeatMode) {
                        const masterTime = this.video.currentTime;
                        if (Math.abs(this.beatAudio.currentTime - masterTime) > 0.5) {
                            const curVol = this.beatAudio.volume;
                            this.beatAudio.volume = 0;
                            this.beatAudio.currentTime = masterTime;
                            setTimeout(() => { this.beatAudio.volume = curVol; }, 50);
                        }
                    }
                }, 150); 
            }
        });

        // 🌟 KHAI BÁO updateTime DUY NHẤT 1 LẦN 🌟
        const updateTime = (src) => {
            const d = src.duration || 0, c = src.currentTime || 0;
            if (d > 0 && typeof this.checkPreload === 'function') this.checkPreload(c, d);
            if (document.hidden) return; 
            if (d > 0) {
                const p = (c / d) * 100;
                this.elements.seekBar.value = p; this.elements.miniFill.style.width = p + '%';
                if (typeof this.updateRangeInput === 'function') this.updateRangeInput(this.elements.seekBar);
                document.getElementById('curr-time').innerText = typeof this.formatTime === 'function' ? this.formatTime(c) : c;
                document.getElementById('total-time').innerText = typeof this.formatTime === 'function' ? this.formatTime(d) : d;
                if (typeof this.syncLyrics === 'function') this.syncLyrics(c);
            }
        };

        // 🌟 2. FIX TỬ HUYỆT GIẬT NHẠC: NỚI LỎNG ĐỒNG BỘ THỜI GIAN (SYNC TOLERANCE) 🌟
        const SYNC_THRESHOLD = 0.3;

        this.video.ontimeupdate = () => {
            if (this.currentSongHasVideo) { 
                const masterTime = this.video.currentTime;
                try { 
                    if (Math.abs(this.audio.currentTime - masterTime) > SYNC_THRESHOLD) {
                        this.audio.currentTime = masterTime; 
                    }
                } catch(e) {}
                try { 
                    if (Math.abs(this.beatAudio.currentTime - masterTime) > SYNC_THRESHOLD) {
                        this.beatAudio.currentTime = masterTime;
                    }
                } catch(e) {}
                updateTime(this.video);
            }
        };

        this.audio.ontimeupdate = () => {
            if ((!this.currentSongHasVideo && !this.state.isBeatMode) || this.isBackgroundFallback) { 
                const t = this.audio.currentTime;
                try { 
                    if (!this.isBackgroundFallback && Math.abs(this.beatAudio.currentTime - t) > SYNC_THRESHOLD) {
                        this.beatAudio.currentTime = t; 
                    }
                } catch(e) {}
                updateTime(this.audio);
            }
        };

        this.beatAudio.ontimeupdate = () => {
            if (!this.currentSongHasVideo && this.state.isBeatMode) { 
                const t = this.beatAudio.currentTime;
                try { 
                    if (Math.abs(this.audio.currentTime - t) > SYNC_THRESHOLD) {
                        this.audio.currentTime = t; 
                    }
                } catch(e) {}
                updateTime(this.beatAudio);
            }
        };

        const onEnd = () => {
            if (this.state.repeatMode === 1) {
                if (typeof this.seek === 'function') this.seek(0);
                if (typeof this.play === 'function') this.play();
            } else {
                if (typeof this.next === 'function') this.next();
            }
        };

        this.video.onended = () => { if (this.currentSongHasVideo) onEnd(); };
        this.audio.onended = () => { if ((!this.currentSongHasVideo && !this.state.isBeatMode) || this.isBackgroundFallback) onEnd(); };
        this.beatAudio.onended = () => { if ((!this.currentSongHasVideo && this.state.isBeatMode) || (document.hidden && this.state.isBeatMode)) onEnd(); };

        this.elements.seekBar.oninput = (e) => {
            const masterPlayer = this.currentSongHasVideo ? this.video : (this.state.isBeatMode ? this.beatAudio : this.audio);
            const duration = masterPlayer.duration;
            if (!duration || isNaN(duration)) return;
            const t = (e.target.value / 100) * duration;
            if (typeof this.seek === 'function') this.seek(t);
            if (typeof this.updateRangeInput === 'function') this.updateRangeInput(e.target);
        };

        const volBar = document.getElementById('vol-bar');
        if (volBar) {
            volBar.value = this.state.volume;
            if (typeof this.updateRangeInput === 'function') this.updateRangeInput(volBar);
        }
        if (volBar) {
            volBar.oninput = (e) => { 
                if (typeof this.setVolume === 'function') this.setVolume(parseFloat(e.target.value), parseFloat(e.target.value) === 0);
            };
        }

        const btnMute = document.getElementById('btn-mute');
        if (btnMute) btnMute.onclick = () => { 
            if (typeof this.setVolume === 'function') this.setVolume(this.state.volume, !this.state.isMuted);
        };

        if(this.elements.playBtnMain) this.elements.playBtnMain.onclick = () => { if(typeof this.resumeAudioContext === 'function') this.resumeAudioContext(); if(typeof this.togglePlay === 'function') this.togglePlay(); };
        if(this.elements.playBtnMini) this.elements.playBtnMini.onclick = (e) => { e.stopPropagation(); if(typeof this.resumeAudioContext === 'function') this.resumeAudioContext(); if(typeof this.togglePlay === 'function') this.togglePlay(); };
        
        const btnNext = document.getElementById('btn-next');
        const btnMiniNext = document.getElementById('btn-mini-next');
        const btnPrev = document.getElementById('btn-prev');
        const btnHeart = document.getElementById('btn-heart');
        const btnShuffle = document.getElementById('btn-shuffle');
        const btnRepeat = document.getElementById('btn-repeat');
        
        if (btnNext) btnNext.onclick = () => { if(typeof this.resumeAudioContext === 'function') this.resumeAudioContext(); if(typeof this.next === 'function') this.next(); };
        if (btnMiniNext) btnMiniNext.onclick = (e) => { e.stopPropagation(); if(typeof this.resumeAudioContext === 'function') this.resumeAudioContext(); if(typeof this.next === 'function') this.next(); };
        if (btnPrev) btnPrev.onclick = () => { if(typeof this.resumeAudioContext === 'function') this.resumeAudioContext(); if(typeof this.prev === 'function') this.prev(); };
        if (btnHeart) btnHeart.onclick = () => { if(typeof this.toggleFavorite === 'function') this.toggleFavorite(this.state.currentIndex); };
        
        if (btnShuffle) {
            btnShuffle.onclick = (e) => { 
                this.state.isShuffle = !this.state.isShuffle; 
                e.currentTarget.classList.toggle('active'); 
                if (typeof this.showToast === 'function') this.showToast(this.state.isShuffle ? 'Bật trộn bài' : 'Tắt trộn bài'); 
            };
        }
        
        if (btnRepeat) {
            btnRepeat.onclick = (e) => { 
                this.state.repeatMode = this.state.repeatMode === 0 ? 1 : 0; 
                e.currentTarget.classList.toggle('active', this.state.repeatMode === 1); 
                if (typeof this.showToast === 'function') this.showToast(this.state.repeatMode ? 'Lặp 1 bài' : 'Lặp danh sách'); 
            };
        }

        const miniClick = document.getElementById('mini-click-area');
        if (miniClick) miniClick.onclick = () => { const cur = this.state.playlist[this.state.currentIndex]; if (!cur) { if (typeof this.showToast==='function') this.showToast('Chọn một bài hát trước nhé!'); return; } this.elements.overlay.classList.add('open'); }; // 🛡️ FIX full player trống
        const btnClose = document.getElementById('btn-close');
        if (btnClose) btnClose.onclick = () => this.elements.overlay.classList.remove('open');
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.onclick = () => {
            if(typeof this.switchTab === 'function') this.switchTab(btn.dataset.tab)
        });
        
        const btnDl = document.getElementById('btn-dl');
        if (btnDl) btnDl.onclick = () => { if(typeof this.openDownloadModal === 'function') this.openDownloadModal(this.state.currentIndex) };
        
        document.querySelectorAll('.nav-link').forEach((nav, i) => nav.onclick = () => { if(typeof this.switchNavigation === 'function') this.switchNavigation(i) });
        document.querySelectorAll('.btn-sort').forEach(btn => btn.onclick = () => { if(typeof this.changeSortOrder === 'function') this.changeSortOrder(btn.dataset.sort) });
        
        document.querySelectorAll('.chip').forEach(c => c.onclick = () => {
            document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('active')); c.classList.add('active');
            this.state.currentFilter = c.dataset.type; 
            if(typeof this.renderPlaylist === 'function') this.renderPlaylist();
        });

        if (this.elements.searchInput) {
            this.elements.searchInput.oninput = (e) => {
                this.state.searchQuery = e.target.value;
                const currentScrollTop = this.elements.scrollContainer.scrollTop;
                if (this.state.currentNav === 1 && typeof this.renderExplore === 'function') this.renderExplore();
                else if (this.state.currentNav === 3 && typeof this.renderSettings === 'function') this.renderSettings();
                else if (typeof this.renderPlaylist === 'function') this.renderPlaylist();
                setTimeout(() => {
                    this.elements.scrollContainer.scrollTop = currentScrollTop;
                }, 0);
            };
        }

        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.onclick = () => { 
                this.state.searchQuery = ''; 
                this.elements.searchInput.value = ''; 
                if (this.state.currentNav === 3 && typeof this.renderSettings === 'function') this.renderSettings();
                else if (typeof this.renderPlaylist === 'function') this.renderPlaylist(); 
            };
        }

        if (this.elements.btnOptions) {
            this.elements.btnOptions.onclick = (e) => { e.stopPropagation(); this.elements.optionsMenu.classList.toggle('show'); };
        }
        
        document.addEventListener('click', (e) => { 
            if (this.elements.optionsMenu && this.elements.btnOptions && !this.elements.optionsMenu.contains(e.target) && !this.elements.btnOptions.contains(e.target)) {
                this.elements.optionsMenu.classList.remove('show'); 
            }
        });
        
        if (this.elements.btnSwitchBeat) {
            this.elements.btnSwitchBeat.onclick = (e) => { e.stopPropagation(); if (typeof this.toggleBeatMode === 'function') this.toggleBeatMode(); };
        }

        if (this.elements.btnOpenTimer) this.elements.btnOpenTimer.onclick = (e) => { e.stopPropagation(); this.elements.timerModal.classList.add('show'); this.elements.optionsMenu.classList.remove('show'); };
        if (this.elements.btnCloseTimer) this.elements.btnCloseTimer.onclick = () => this.elements.timerModal.classList.remove('show');
        if (this.elements.timerModal) this.elements.timerModal.onclick = (e) => { if (e.target === this.elements.timerModal) this.elements.timerModal.classList.remove('show'); };
        
        document.querySelectorAll('.timer-btn').forEach(btn => {
            btn.onclick = () => {
                const min = parseInt(btn.dataset.time); 
                if(typeof this.startSleepTimer === 'function') this.startSleepTimer(min);
                document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
                if (min > 0) btn.classList.add('active'); 
                if(this.elements.timerModal) this.elements.timerModal.classList.remove('show');
            };
        });

        if (this.elements.btnCloseDl) this.elements.btnCloseDl.onclick = () => this.elements.dlModal.classList.remove('show');
        if (this.elements.dlModal) this.elements.dlModal.onclick = (e) => { if (e.target === this.elements.dlModal) this.elements.dlModal.classList.remove('show'); };
        
        document.querySelectorAll('.dl-btn').forEach(btn => {
            btn.onclick = () => { if(typeof this.triggerDownload === 'function') this.triggerDownload(btn.dataset.type); }
        });

        // 🌟 BẢN NÂNG CẤP: CHIA SẺ LINK SẠCH (CLEAN URL) 🌟
        const shareButtons = document.querySelectorAll('.btn-share');
        shareButtons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Lấy thông tin bài hát hiện tại
                const currentSong = this.state.playlist[this.state.currentIndex];
                
                if (currentSong && currentSong.name) {
                    // Gọi hàm Slugify đã cấy ở app.js
                    const songSlug = this.createSlug ? this.createSlug(currentSong.name) : currentSong.id;
                    const shareUrl = `${window.location.origin}/music-pro/${songSlug}`;
                    
                    const shareMessage = `Nghe bài "${currentSong.name}" bởi ${currentSong.artist || 'Artist'} trên Music Pro Ultimate:\n${shareUrl}`;
                    
                    navigator.clipboard.writeText(shareMessage).then(() => {
                        if(typeof this.showToast === 'function') this.showToast(`Đã chép link bài: ${currentSong.name}`);
                    }).catch(err => {
                        if(typeof this.showToast === 'function') this.showToast("Lỗi chép link, vui lòng copy thủ công!", "error");
                    });
                } else {
                    if(typeof this.showToast === 'function') this.showToast("Hãy chọn một bài hát trước khi chia sẻ!", "error");
                }
            };
        });

        const settingsModal = document.getElementById('settings-modal');
        const btnCloseSettings = document.getElementById('btn-close-settings');
        const themeToggleSwitch = document.getElementById('theme-toggle-switch');
        const soundEffectSwitch = document.getElementById('sound-effect-switch');
        const autoUpdateSwitch = document.getElementById('auto-update-switch');

        if (btnCloseSettings && settingsModal) {
            btnCloseSettings.onclick = () => settingsModal.classList.remove('show');
            settingsModal.onclick = (e) => { if (e.target === settingsModal) settingsModal.classList.remove('show'); };
        }

        if (themeToggleSwitch) {
            const effectiveTheme = this.state.theme === 'auto' 
                ? window.matchMedia('(prefers-color-scheme: dark)').matches 
                : this.state.theme !== 'light';
            themeToggleSwitch.classList.toggle('active', effectiveTheme);

            themeToggleSwitch.onclick = () => {
                if (this.state.theme === 'auto') {
                    this.state.theme = 'dark';
                } else if (this.state.theme === 'dark') {
                    this.state.theme = 'light';
                } else {
                    this.state.theme = 'auto';
                }

                localStorage.setItem('theme', this.state.theme);
                if (typeof this.applyTheme === 'function') this.applyTheme();
                if (typeof this.updateThemeColor === 'function') this.updateThemeColor();
                if (typeof this.updateToggleStates === 'function') this.updateToggleStates();
                if (typeof this.updateAllRangeInputs === 'function') this.updateAllRangeInputs();

                const newEffectiveTheme = this.state.theme === 'auto' 
                    ? window.matchMedia('(prefers-color-scheme: dark)').matches 
                    : this.state.theme !== 'light';
                themeToggleSwitch.classList.toggle('active', newEffectiveTheme);
            };
        }

        if (soundEffectSwitch) {
            soundEffectSwitch.onclick = () => {
                soundEffectSwitch.classList.toggle('active');
                if(typeof this.showToast === 'function') this.showToast(soundEffectSwitch.classList.contains('active') ? 'Hiệu ứng âm thanh đã bật' : 'Hiệu ứng âm thanh đã tắt');
            };
        }

        if (autoUpdateSwitch) {
            autoUpdateSwitch.onclick = () => {
                autoUpdateSwitch.classList.toggle('active');
                if(typeof this.showToast === 'function') this.showToast(autoUpdateSwitch.classList.contains('active') ? 'Tự động cập nhật đã bật' : 'Tự động cập nhật đã tắt');
            };
        }

        const resetModal = document.getElementById('reset-modal');
        const btnCancelReset = document.getElementById('btn-cancel-reset');
        const btnConfirmReset = document.getElementById('btn-confirm-reset');

        if (btnCancelReset && resetModal) {
            btnCancelReset.onclick = () => resetModal.classList.remove('show');
        }

        if (btnConfirmReset) {
            btnConfirmReset.onclick = () => {
                if(typeof this.resetApp === 'function') this.resetApp();
                resetModal.classList.remove('show');
            };
        }

        if (resetModal) {
            resetModal.onclick = (e) => {
                if (e.target === resetModal) resetModal.classList.remove('show');
            };
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            const storedTheme = localStorage.getItem('theme');
            if (storedTheme === 'auto' || (!storedTheme && document.documentElement.getAttribute('data-theme') === 'auto')) {
                this.state.theme = e.matches ? 'dark' : 'light';
                if (typeof this.applyTheme === 'function') this.applyTheme();
                if (typeof this.updateThemeColor === 'function') this.updateThemeColor();
                if (typeof this.updateToggleStates === 'function') this.updateToggleStates();
                if (typeof this.updateAllRangeInputs === 'function') this.updateAllRangeInputs();
            }
        });

        document.addEventListener('click', () => {
            if(typeof this.resumeAudioContext === 'function') this.resumeAudioContext();
        }, { once: false, passive: true });
    },

    // 🌟 HÀM updateMuteUI ĐÃ ĐƯỢC CHỐT CHẶN Ở CUỐI FILE 🌟
    updateMuteUI() { 
        const btn = document.getElementById('btn-mute');
        if (!btn) return;
        btn.innerHTML = `<i class="fa-solid fa-volume-${this.state.isMuted ? 'xmark' : 'high'}"></i>`;
        btn.style.color = this.state.isMuted ? 'var(--text-sub)' : 'var(--primary)';
    }
};