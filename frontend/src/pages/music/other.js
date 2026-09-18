window.MusicProModules = window.MusicProModules || {};

window.MusicProModules.other = {

    // --- CORE INITIALIZATION & DATA MANAGEMENT ---
    // --- FEATURE SPECIFIC LOGIC ---
    /**
     * Ensure media element source nodes are created for spatial audio processing.
     * @private
     */
    ensureSourceNodes() {
        if (!this.sourceNodes) {
            this.sourceNodes = {};
        }
        if (!this.effectNodes) {
            this.effectNodes = {};
        }
        const audioContext = window.MusicProModules.utils.audioContext;
        if (!audioContext) return;
        if (!this.sourceNodes.audio && this.audio) {
            try {
                this.sourceNodes.audio = audioContext.createMediaElementSource(this.audio);
            } catch (e) {
                console.warn('Failed to create audio source node:', e);
            }
        }
        if (!this.sourceNodes.video && this.video) {
            try {
                this.sourceNodes.video = audioContext.createMediaElementSource(this.video);
            } catch (e) {
                console.warn('Failed to create video source node:', e);
            }
        }
        if (!this.sourceNodes.beat && this.beatAudio) {
            try {
                this.sourceNodes.beat = audioContext.createMediaElementSource(this.beatAudio);
            } catch (e) {
                console.warn('Failed to create beat source node:', e);
            }
        }
    },

    /**
     * Bật/tắt chế độ Beat (Karaoke).
     */
    toggleBeatMode() {
        if (!this.beatAudio.src) {
            this.showToast('Chưa có Beat!');
            return;
        }

        this.state.isBeatMode = !this.state.isBeatMode;
        this.updateBeatBtnUI();
        this.showToast(this.state.isBeatMode ? 'Chế độ Beat' : 'Tắt Beat');

        if (this.state.isPlaying) {
            // Nếu đang phát, hoán đổi nguồn phát ngay lập tức
            this.play();
        } else {
            // Nếu đang dừng, chỉ cập nhật trạng thái mute của video. Nguồn phát đúng sẽ được dùng khi nhấn play.
            if (this.currentSongHasVideo) {
                this.video.muted = this.state.isBeatMode;
            }
        }
    },

    /**
     * Cập nhật trạng thái nút chuyển Beat trên giao diện.
     */
    updateBeatBtnUI() { this.elements.btnSwitchBeat.classList.toggle('active', this.state.isBeatMode); },

    /**
     * Phát bài hát tại một chỉ số cụ thể.
     * @param {number} idx - Chỉ số bài hát.
     */
    playIndex(idx) { this.loadSong(idx, true); },

    play() {
        // Initialize Audio Context for basic playback
        window.MusicProModules.utils.initAudioContext();

        // Resume Audio Context if suspended (browser policy)
        if (window.MusicProModules.utils.audioContext && window.MusicProModules.utils.audioContext.state === 'suspended') {
            window.MusicProModules.utils.audioContext.resume()
                .then(() => {
                    console.log('Audio context resumed successfully');
                })
                .catch((err) => {
                    console.error('Failed to resume audio context:', err);
                });
        }

        this.state.isPlaying = true;
        this.updatePlayState();
        if (this.state.sleepTimeLeft > 0) this.runSleepTimer();

        if (this.isLyricsCanvasActive && this.lyricsPipVideo) this.lyricsPipVideo.play().catch(() => {});

        if (document.hidden && this.currentSongHasVideo && !this.state.isBeatMode && !document.pictureInPictureElement) {
            this.isBackgroundFallback = true;
            this.audio.play().catch(e => {
                console.error("Failed to play audio in background:", e);
                // Try to resume audio context and play again
                window.MusicProModules.utils.resumeAudioContext();
                setTimeout(() => {
                    this.audio.play().catch(e => {
                        console.error("Second attempt to play audio failed:", e);
                    });
                }, 100);
            });
            this.video.pause();
            return;
        }

        if (this.currentSongHasVideo) {
            this.video.muted = this.state.isMuted || this.state.isBeatMode;
            const videoPromise = this.video.play();
            if (videoPromise !== undefined) {
                videoPromise.catch(e => {
                    console.error("Lỗi phát video, đang chuyển sang âm thanh:", e);
                    this.showToast('Video lỗi, đang phát âm thanh');
                    this.currentSongHasVideo = false; // Chuyển về chế độ chỉ audio
                    this.play(); // Thử phát lại ở chế độ chỉ audio
                });
            }

            if (this.state.isBeatMode && this.beatAudio.src) {
                this.beatAudio.play().catch(e => {
                    console.error("Failed to play beat audio:", e);
                });
            } else {
                this.beatAudio.pause();
            }
            this.audio.pause(); // Original audio never used when video is present
        } else {
            // Audio-only mode
            this.video.pause();
            if (this.state.isBeatMode && this.beatAudio.src) {
                this.audio.pause();
                this.beatAudio.play().catch(e => {
                    console.error("Failed to play beat audio:", e);
                    // Try to resume audio context and play again
                    window.MusicProModules.utils.resumeAudioContext();
                    setTimeout(() => {
                        this.beatAudio.play().catch(e => {
                            console.error("Second attempt to play beat audio failed:", e);
                        });
                    }, 100);
                });
            } else {
                this.beatAudio.pause();
                this.audio.play().catch(e => {
                    console.error("Failed to play audio:", e);
                    // Try to resume audio context and play again
                    window.MusicProModules.utils.resumeAudioContext();
                    setTimeout(() => {
                        this.audio.play().catch(e => {
                            console.error("Second attempt to play audio failed:", e);
                        });
                    }, 100);
                });
            }
        }

        // Skip advanced audio effects since they are handled via other methods now
        // The audio graph connections are established in the play methods above
        // and updated when EQ or spatial audio settings change
    },

    /**
     * Tạm dừng phát nhạc/video.
     */
    pause() {
        this.state.isPlaying = false;
        if (this.state.sleepInterval) { clearInterval(this.state.sleepInterval); this.state.sleepInterval = null; }
        this.video.pause(); this.audio.pause(); this.beatAudio.pause();
        if (this.isLyricsCanvasActive && this.lyricsPipVideo) this.lyricsPipVideo.pause();
        this.updatePlayState();

        const t = this.currentSongHasVideo ? this.video.currentTime : (this.state.isBeatMode ? this.beatAudio.currentTime : this.audio.currentTime);
        localStorage.setItem('lastIndex', this.state.currentIndex);
        localStorage.setItem('lastTime', t);
    },

    /**
     * Chuyển đổi trạng thái phát/tạm dừng.
     */
    togglePlay() {
        this.state.isPlaying ? this.pause() : this.play();
    },

    /**
     * Cập nhật trạng thái nút Play/Pause và hiệu ứng sóng nhạc.
     */
    updatePlayState() {
        const icon = this.state.isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
        this.elements.playBtnMain.innerHTML = icon; this.elements.playBtnMini.innerHTML = icon;
        document.querySelectorAll('.wave-anim .bar').forEach(b => b.style.animationPlayState = this.state.isPlaying ? 'running' : 'paused');
        if (this.state.isPlaying) {
            this.elements.mini.classList.remove('hide');
            this.elements.mini.classList.add('playing');
        } else {
            this.elements.mini.classList.remove('playing');
        }
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = this.state.isPlaying ? 'playing' : 'paused';
        }
    },

    next() { const nextIdx = this.getNextIndex(); if (nextIdx !== -1) this.loadSong(nextIdx, true); },
    prev() {
        const display = this.getDisplayPlaylist(); if (!display.length) return;
        const curr = this.state.playlist[this.state.currentIndex];
        let idx = display.findIndex(t => t.id === curr.id);
        let prevIdx = 0;
        if (idx !== -1) prevIdx = idx - 1 < 0 ? display.length - 1 : idx - 1;
        const masterIdx = this.state.playlist.findIndex(t => t.id === display[prevIdx].id);
        this.loadSong(masterIdx, true);
    },

    /**
     * Bắt đầu hẹn giờ tắt nhạc.
     */
    startSleepTimer(minutes) {
        if (this.state.sleepInterval) clearInterval(this.state.sleepInterval);
        this.state.sleepInterval = null;

        if (minutes === 0) {
            this.state.sleepTimeLeft = 0;
            localStorage.setItem('sleepTimeLeft', 0);
            this.updateTimerText();
            this.showToast("Đã hủy hẹn giờ");
            return;
        }
        this.state.sleepTimeLeft = minutes * 60;
        localStorage.setItem('sleepTimeLeft', this.state.sleepTimeLeft);
        this.showToast(`Nhạc sẽ tắt sau ${minutes} phút`);
        this.updateTimerText();
        if (this.state.isPlaying) this.runSleepTimer();
    },

    runSleepTimer() {
        if (this.state.sleepInterval) clearInterval(this.state.sleepInterval);
        this.state.sleepInterval = setInterval(() => {
            if (this.state.sleepTimeLeft > 0) {
                this.state.sleepTimeLeft--;
                localStorage.setItem('sleepTimeLeft', this.state.sleepTimeLeft);
                this.updateTimerText();
            } else {
                clearInterval(this.state.sleepInterval);
                this.state.sleepInterval = null;

                // Use smart sleep fade-out if enabled, otherwise regular pause
                if (this.state.smartSleepEnabled) {
                    this.startSmartSleepFadeOut();
                } else {
                    this.pause();
                    this.showToast("Đã tắt nhạc");
                    this.state.sleepTimeLeft = 0;
                    localStorage.setItem('sleepTimeLeft', 0);
                    this.updateTimerText();
                }
            }
        }, 1000);
    },

    /**
     * Cập nhật văn bản hiển thị thời gian hẹn giờ còn lại.
     */
    updateTimerText() {
        const settingsStatus = document.getElementById('settings-timer-status');
        if (this.state.sleepTimeLeft > 0) {
            const m = Math.ceil(this.state.sleepTimeLeft / 60);
            this.elements.timerMenuText.innerText = `Còn ${m} phút`; this.elements.timerMenuText.style.color = "var(--primary)";
            if (settingsStatus) {
                settingsStatus.innerText = `${m} phút`;
                settingsStatus.className = "status-indicator status-warning";
            }
        } else {
            this.elements.timerMenuText.innerText = "Hẹn giờ tắt"; this.elements.timerMenuText.style.color = "var(--text-main)";
            if (settingsStatus) {
                settingsStatus.innerText = "Tắt";
                settingsStatus.className = "status-indicator status-inactive";
            }
        }
    },

    /**
     * Toggle smart sleep mode
     */
    toggleSmartSleep() {
        this.state.smartSleepEnabled = !this.state.smartSleepEnabled;
        localStorage.setItem('smartSleepEnabled', this.state.smartSleepEnabled);
        this.showToast(this.state.smartSleepEnabled ? 'Chế độ ngủ thông minh đã bật' : 'Chế độ ngủ thông minh đã tắt');
    },

    /**
     * Start smart sleep fade-out
     */
    startSmartSleepFadeOut() {
        if (!this.state.smartSleepEnabled) {
            // If smart sleep is disabled, just pause
            this.pause();
            this.showToast("Đã tắt nhạc");
            this.state.sleepTimeLeft = 0;
            localStorage.setItem('sleepTimeLeft', 0);
            this.updateTimerText();
            return;
        }

        const fadeDuration = this.state.smartSleepFadeOutTime; // Duration in seconds
        const startVolume = this.state.volume;
        const fadeSteps = fadeDuration;
        let currentStep = 0;

        const fadeInterval = setInterval(() => {
            currentStep++;
            const volumeReductionFactor = currentStep / fadeSteps;
            const newVolume = Math.max(0, startVolume * (1 - volumeReductionFactor));

            // Update volume
            this.setVolume(newVolume, newVolume <= 0);

            // Stop when volume reaches 0 or when fade duration is complete
            if (currentStep >= fadeSteps || newVolume <= 0) {
                clearInterval(fadeInterval);
                this.pause();
                this.showToast("Đã tắt nhạc");
                this.state.sleepTimeLeft = 0;
                localStorage.setItem('sleepTimeLeft', 0);
                this.updateTimerText();
            }
        }, 1000); // Fade out every second
    },

    /**
     * Initialize audio context for spatial audio
     */
    initAudioContext() {
        // Ensure effectNodes object exists
        if (!this.effectNodes) {
            this.effectNodes = {};
        }

        if (!window.MusicProModules.utils.audioContext) {
            try {
                window.MusicProModules.utils.audioContext = new (window.AudioContext || window.webkitAudioContext)();

                // Create spatial audio nodes if supported
                if (window.MusicProModules.utils.audioContext.listener && typeof window.MusicProModules.utils.audioContext.createPanner === 'function') {
                    this.effectNodes.panner = window.MusicProModules.utils.audioContext.createPanner();
                    this.effectNodes.panner.panningModel = 'HRTF';
                    this.effectNodes.panner.distanceModel = 'inverse';
                    this.effectNodes.panner.refDistance = 1;
                    this.effectNodes.panner.maxDistance = 10000;
                    this.effectNodes.panner.rolloffFactor = 1;
                    this.effectNodes.panner.coneInnerAngle = 360;
                    this.effectNodes.panner.coneOuterAngle = 0;
                    this.effectNodes.panner.coneOuterGain = 0;
                }

                // Create gain node for effects
                this.effectNodes.gain = window.MusicProModules.utils.audioContext.createGain();
            } catch (e) {
                console.warn('Web Audio API không được hỗ trợ:', e);
            }
        }

        // 👇 ENHANCEMENT: If context exists but is suspended by browser, resume it immediately
        if (window.MusicProModules.utils.audioContext && window.MusicProModules.utils.audioContext.state === 'suspended') {
            window.MusicProModules.utils.audioContext.resume().then(() => {
                console.log("🔊 Spatial AudioContext đã được mở khóa thành công!");
            }).catch(err => {
                console.warn("Chưa thể kích hoạt AudioContext:", err);
            });
        }

        // Initialize equalizer nodes
        if (window.MusicProModules.utils.audioContext) {
            try {
                this.eqNodes = window.MusicProModules.utils.createEqualizer();
            } catch (e) {
                console.warn('Không thể khởi tạo equalizer:', e);
                this.eqNodes = null;
            }
        }
    },

    /**
     * Toggle spatial audio (3D sound effect)
     */
    toggleSpatialAudio() {
        if (!window.MusicProModules.utils.audioContext) {
            this.showToast('Không thể kích hoạt âm thanh 3D');
            return;
        }

        // Initialize audio context for spatial audio (creates panner and gain nodes if supported)
        this.initAudioContext();

        this.state.spatialAudioEnabled = !this.state.spatialAudioEnabled;

        // Update spatial audio settings
        if (this.state.spatialAudioEnabled && this.effectNodes.panner) {
            // Connect spatial audio nodes
            this.setupSpatialAudioConnections();
            this.showToast('Âm thanh 3D đã bật');
        } else {
            // Disconnect spatial audio nodes
            this.disconnectSpatialAudio();
            this.showToast('Âm thanh 3D đã tắt');
        }

        // Update toggle UI
        const spatialToggle = document.getElementById('spatial-audio-toggle');
        if (spatialToggle) {
            spatialToggle.classList.toggle('active', this.state.spatialAudioEnabled);
        }
    },

    /**
     * Setup spatial audio connections
     */
    setupSpatialAudioConnections() {
        this.ensureSourceNodes();
        if (!this.effectNodes.panner) return;

        try {
            // Disconnect existing connections
            if (this.sourceNodes.audio) {
                this.sourceNodes.audio.disconnect();
            }
            if (this.sourceNodes.video) {
                this.sourceNodes.video.disconnect();
            }
            if (this.sourceNodes.beat) {
                this.sourceNodes.beat.disconnect();
            }

            if (this.effectNodes.gain) {
                this.effectNodes.gain.disconnect();
            }

            if (this.eqNodes) {
                // Disconnect equalizer nodes
                this.eqNodes.nodes.forEach(node => node.disconnect());
            }

            // Create gain node if needed
            if (!this.effectNodes.gain) {
                this.effectNodes.gain = window.MusicProModules.utils.audioContext.createGain();
            }

            // Connect audio sources to gain -> equalizer (if enabled) -> gain -> panner -> destination
            const audioSources = [
                this.sourceNodes.audio,
                this.sourceNodes.video,
                this.sourceNodes.beat
            ].filter(Boolean);

            // Connect all active sources to the gain node
            audioSources.forEach(source => {
                source.connect(this.effectNodes.gain);
            });

            // If equalizer is enabled, insert it in the chain
            if (this.eqNodes && Object.keys(this.eqNodes || {}).length > 0) {
                // Connect gain -> equalizer input
                this.effectNodes.gain.connect(this.eqNodes.nodes[0]);

                // Connect equalizer chain
                for (let i = 0; i < this.eqNodes.nodes.length - 1; i++) {
                    this.eqNodes.nodes[i].connect(this.eqNodes.nodes[i + 1]);
                }

                // Connect equalizer output -> gain -> panner -> destination
                this.eqNodes.nodes[this.eqNodes.nodes.length - 1].connect(this.effectNodes.gain);
            } else {
                // Direct connection: gain -> panner -> destination
                // (eqNodes is falsy or empty)
            }

            this.effectNodes.gain.connect(this.effectNodes.panner);
            this.effectNodes.panner.connect(window.MusicProModules.utils.audioContext.destination);

            console.log('Spatial audio connections established');
        } catch (e) {
            console.error('Error setting up spatial audio connections:', e);
            // Fallback: connect directly without effects
            this.connectAudioDirectly();
        }
    },

    /**
     * Disconnect spatial audio
     */
    disconnectSpatialAudio() {
        this.ensureSourceNodes();
        if (!this.effectNodes.panner) return;

        try {
            // Disconnect and reconnect audio sources directly to destination
            if (this.sourceNodes.audio) {
                this.sourceNodes.audio.disconnect();
                this.sourceNodes.audio.connect(window.MusicProModules.utils.audioContext.destination);
            }
            if (this.sourceNodes.video) {
                this.sourceNodes.video.disconnect();
                this.sourceNodes.video.connect(window.MusicProModules.utils.audioContext.destination);
            }
            if (this.sourceNodes.beat) {
                this.sourceNodes.beat.disconnect();
                this.sourceNodes.beat.connect(window.MusicProModules.utils.audioContext.destination);
            }

            // Disconnect effect nodes
            if (this.effectNodes.gain) {
                this.effectNodes.gain.disconnect();
            }
            if (this.effectNodes.panner) {
                this.effectNodes.panner.disconnect();
            }

            // Disconnect equalizer nodes
            if (this.eqNodes) {
                this.eqNodes.nodes.forEach(node => node.disconnect());
            }

            console.log('Spatial audio disconnected');
        } catch (e) {
            console.error('Error disconnecting spatial audio:', e);
            // Fallback: connect directly
            this.connectAudioDirectly();
        }
    },

    /**
     * Update equalizer settings
     */
    updateEqualizer() {
        // Extract EQ values from the sliders
        const low = document.getElementById('eq-low')?.value || 0;
        const midLow = document.getElementById('eq-mid-low')?.value || 0;
        const mid = document.getElementById('eq-mid')?.value || 0;
        const midHigh = document.getElementById('eq-mid-high')?.value || 0;
        const high = document.getElementById('eq-high')?.value || 0;

        // Apply EQ using utility functions
        const eqSettings = {
            low: parseFloat(low),
            midLow: parseFloat(midLow),
            mid: parseFloat(mid),
            midHigh: parseFloat(midHigh),
            high: parseFloat(high)
        };

        console.log(`EQ: Low=${low}, Mid-Low=${midLow}, Mid=${mid}, Mid-High=${midHigh}, High=${high}`);

        // Initialize equalizer if not already done
        if (!this.eqNodes) {
            this.eqNodes = window.MusicProModules.utils.createEqualizer();
        }

        // Apply settings
        if (this.eqNodes) {
            // Ensure effectNodes object exists
            if (!this.effectNodes) {
                this.effectNodes = {};
            }
            window.MusicProModules.utils.applyEqualizer(this.eqNodes, eqSettings);

            // Connect the equalizer to the audio graph if we're using spatial audio
            if (this.state.spatialAudioEnabled && this.effectNodes.panner) {
                this.updateEqualizerConnections();
            }
        }
    },

    /**
     * Update equalizer connections in the audio graph
     */
    updateEqualizerConnections() {
        this.ensureSourceNodes();
        if (!this.eqNodes || !this.eqNodes.nodes || !this.effectNodes.panner) return;

        try {
            // Disconnect existing connections
            if (this.sourceNodes.audio) {
                this.sourceNodes.audio.disconnect();
            }
            if (this.sourceNodes.video) {
                this.sourceNodes.video.disconnect();
            }
            if (this.sourceNodes.beat) {
                this.sourceNodes.beat.disconnect();
            }

            if (this.effectNodes.gain) {
                this.effectNodes.gain.disconnect();
            }
            if (this.effectNodes.panner) {
                this.effectNodes.panner.disconnect();
            }

            // Create ganode if needed
            if (!this.effectNodes.gain) {
                this.effectNodes.gain = window.MusicProModules.utils.audioContext.createGain();
            }

            // Connect audio sources to gain -> equalizer -> gain -> panner -> destination
            const audioSources = [
                this.sourceNodes.audio,
                this.sourceNodes.video,
                this.sourceNodes.beat
            ].filter(Boolean);

            // Connect all active sources to the gain node
            audioSources.forEach(source => {
                source.connect(this.effectNodes.gain);
            });

            // Connect gain -> equalizer input
            this.effectNodes.gain.connect(this.eqNodes.nodes[0]);

            // Connect equalizer chain
            for (let i = 0; i < this.eqNodes.nodes.length - 1; i++) {
                this.eqNodes.nodes[i].connect(this.eqNodes.nodes[i + 1]);
            }

            // Connect equalizer output -> gain -> panner -> destination
            this.eqNodes.nodes[this.eqNodes.nodes.length - 1].connect(this.effectNodes.gain);
            this.effectNodes.gain.connect(this.effectNodes.panner);
            this.effectNodes.panner.connect(window.MusicProModules.utils.audioContext.destination);

            console.log('Equalizer connected to audio graph with spatial audio');
        } catch (e) {
            console.error('Error updating equalizer connections:', e);
            // Fallback: connect directly without equalizer
            this.connectAudioDirectly();
        }
    },

    /**
     * Connect audio directly to destination (bypassing effects)
     */
    connectAudioDirectly() {
        this.ensureSourceNodes();
        try {
            // Disconnect existing connections
            if (this.sourceNodes.audio) {
                this.sourceNodes.audio.disconnect();
            }
            if (this.sourceNodes.video) {
                this.sourceNodes.video.disconnect();
            }
            if (this.sourceNodes.beat) {
                this.sourceNodes.beat.disconnect();
            }

            if (this.effectNodes.gain) {
                this.effectNodes.gain.disconnect();
            }
            if (this.effectNodes.panner) {
                this.effectNodes.panner.disconnect();
            }

            if (this.eqNodes) {
                // Disconnect equalizer nodes
                this.eqNodes.nodes.forEach(node => node.disconnect());
            }

            // Connect sources directly to destination
            const audioSources = [
                this.sourceNodes.audio,
                this.sourceNodes.video,
                this.sourceNodes.beat
            ].filter(Boolean);

            audioSources.forEach(source => {
                source.connect(window.MusicProModules.utils.audioContext.destination);
            });

            console.log('Audio connected directly to destination');
        } catch (e) {
            console.error('Error connecting audio directly:', e);
        }
    },

    /**
     * Update spatial audio connections
     */
    updateSpatialAudioConnections() {
        this.ensureSourceNodes();
        if (!this.effectNodes.panner) return;

        try {
            // Disconnect existing connections
            if (this.sourceNodes.audio) {
                this.sourceNodes.audio.disconnect();
            }
            if (this.sourceNodes.video) {
                this.sourceNodes.video.disconnect();
            }
            if (this.sourceNodes.beat) {
                this.sourceNodes.beat.disconnect();
            }

            if (this.effectNodes.gain) {
                this.effectNodes.gain.disconnect();
            }

            if (this.eqNodes) {
                // Disconnect equalizer nodes
                this.eqNodes.nodes.forEach(node => node.disconnect());
            }

            // Create gain node if needed
            if (!this.effectNodes.gain) {
                this.effectNodes.gain = window.MusicProModules.utils.audioContext.createGain();
            }

            // Connect audio sources to gain -> equalizer (if enabled) -> gain -> panner -> destination
            const audioSources = [
                this.sourceNodes.audio,
                this.sourceNodes.video,
                this.sourceNodes.beat
            ].filter(Boolean);

            // Connect all active sources to the gain node
            audioSources.forEach(source => {
                source.connect(this.effectNodes.gain);
            });

            // If equalizer is enabled, insert it in the chain
            if (this.eqNodes && Object.keys(this.eqNodes || {}).length > 0) {
                // Connect gain -> equalizer input
                this.effectNodes.gain.connect(this.eqNodes.nodes[0]);

                // Connect equalizer chain
                for (let i = 0; i < this.eqNodes.nodes.length - 1; i++) {
                    this.eqNodes.nodes[i].connect(this.eqNodes.nodes[i + 1]);
                }

                // Connect equalizer output -> gain -> panner -> destination
                this.eqNodes.nodes[this.eqNodes.nodes.length - 1].connect(this.effectNodes.gain);
            } else {
                // Direct connection: gain -> panner -> destination
                // (eqNodes is falsy or empty)
            }

            this.effectNodes.gain.connect(this.effectNodes.panner);
            this.effectNodes.panner.connect(window.MusicProModules.utils.audioContext.destination);

            console.log('Spatial audio connections updated');
        } catch (e) {
            console.error('Error updating spatial audio connections:', e);
            // Fallback: connect directly without effects
            this.connectAudioDirectly();
        }
    },

    /**
     * Cập nhật trạng thái các nút toggle trong cài đặt.
     */
    updateToggleStates() {
        const themeToggleSwitch = document.getElementById('theme-toggle-switch');
        const soundEffectSwitch = document.getElementById('sound-effect-switch');
        const autoUpdateSwitch = document.getElementById('auto-update-switch');

        if (themeToggleSwitch) {
            // Set the theme toggle to active if current theme is dark (not light and not auto)
            // For auto theme, we'll show the current effective theme state
            const effectiveTheme = this.state.theme === 'auto'
                ? window.matchMedia('(prefers-color-scheme: dark)').matches
                : this.state.theme !== 'light';
            themeToggleSwitch.classList.toggle('active', effectiveTheme);
        }

        // For demo purposes, setting default states
        if (soundEffectSwitch) {
            soundEffectSwitch.classList.remove('active'); // Default to off
        }

        if (autoUpdateSwitch) {
            autoUpdateSwitch.classList.remove('active'); // Default to off
        }

        // Update spatial audio toggle if it exists
        const spatialToggle = document.getElementById('spatial-audio-toggle');
        if (spatialToggle) {
            spatialToggle.classList.toggle('active', this.state.spatialAudioEnabled);
        }

        // Note: The auto theme by cover toggle is now in the color picker modal

        // Update the settings page if it's currently displayed
        if (this.state.currentNav === 3) {
            this.renderSettings();
        }
    },

    /**
     * Mở modal tải xuống cho một bài hát cụ thể.
     * @param {number} idx - Chỉ số bài hát.
     */
    openDownloadModal(idx) {
        this.state.downloadTargetIndex = idx;
        const song = this.state.playlist[idx];
        this.elements.dlTitle.innerText = song.name;
        this.elements.dlModal.classList.add('show');
    },

    /**
     * Kích hoạt tải xuống file (audio, beat, video, lyric) của bài hát.
     */
    triggerDownload(type) {
        const song = this.state.playlist[this.state.downloadTargetIndex];
        let link = '';
        let fileName = `${song.name}`;

        switch(type) {
            case 'audio': link = song.path; fileName += '.mp3'; break;
            case 'beat':
                if (!song.instrumental || song.instrumental.includes('chưa có')) { this.showToast('Không có Beat'); return; }
                link = song.instrumental; fileName += ' (Beat).mp3'; break;
            case 'video':
                if (!song.vid || song.vid.includes('ERROR')) { this.showToast('Không có Video'); return; }
                link = song.vid; fileName += '.mp4'; break;
            case 'lyric':
                if (!song.lyric || song.lyric.includes('chưa có')) { this.showToast('Không có Lời'); return; }
                link = song.lyric; fileName += '.lrc'; break;
        }

        const a = document.createElement('a'); a.href = link; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        if (typeof this.reportDownload === 'function') this.reportDownload(song); // 📈 D4M: lượt tải
        this.showToast(`Đang tải: ${fileName}`);
        this.elements.dlModal.classList.remove('show');
    },

    seek(time) {
        if (isNaN(time)) return;
        try { if (this.video && this.video.readyState > 0) this.video.currentTime = time; } catch (e) {}
        try { if (this.audio && this.audio.readyState > 0) this.audio.currentTime = time; } catch (e) {}
        try { if (this.beatAudio && this.beatAudio.readyState > 0) this.beatAudio.currentTime = time; } catch (e) {}
    },

    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.play());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
            navigator.mediaSession.setActionHandler('seekto', (details) => this.seek(details.seekTime));
        }
    },

    /**
     * Thiết lập tính năng Picture-in-Picture (PiP).
     */
    setupPiP() {
        if (!('pictureInPictureEnabled' in document) && !('documentPictureInPicture' in window)) return;

        const btn = document.createElement('div');
        btn.className = 'menu-item';
        btn.style.display = 'none';
        btn.innerHTML = `<i class="fa-solid fa-clone"></i> <span>Picture-in-Picture</span> <div class="toggle-switch"></div>`;

        btn.onclick = async (e) => {
            e.stopPropagation();
            if (this.state.currentMode === 'lyrics') {
                this.toggleLyricsPiP();
                return;
            }
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    if (!this.currentSongHasVideo) { this.showToast('Bài hát không có video'); return; }
                    if (this.video.readyState === 0) { this.showToast('Video đang tải...'); return; }
                    await this.video.requestPictureInPicture();
                }
            } catch (err) {
                console.error(err);
                this.showToast('Không thể mở PiP');
            }
        };

        if (this.elements.optionsMenu) this.elements.optionsMenu.appendChild(btn);
        this.elements.pipBtn = btn;
        this.video.addEventListener('enterpictureinpicture', () => this.updatePiPButtonUI());
        this.video.addEventListener('leavepictureinpicture', () => this.updatePiPButtonUI());
    },

    setupVideoFullscreen() {
        const container = document.querySelector('.video-container');
        if (!container) return;

        const btn = document.createElement('div');
        btn.className = 'btn-icon btn-fullscreen';
        btn.innerHTML = '<i class="fa-solid fa-expand"></i>';

        btn.onclick = (e) => {
            e.stopPropagation();
            if (!document.fullscreenElement) {
                if (container.requestFullscreen) container.requestFullscreen();
                else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        };
        container.appendChild(btn);
        document.addEventListener('fullscreenchange', () => {
            const isFull = !!document.fullscreenElement;
            btn.innerHTML = isFull ? '<i class="fa-solid fa-compress"></i>' : '<i class="fa-solid fa-expand"></i>';
            this.video.controls = isFull;
        });
    },

    updatePiPButtonUI() {
        if (!this.elements.pipBtn) return;
        const mode = this.state.currentMode;
        const span = this.elements.pipBtn.querySelector('span');

        if (mode === 'lyrics') {
            this.elements.pipBtn.style.display = 'flex';
            span.innerText = this.lyricsPiPWindow ? 'Đóng Lyrics PiP' : 'Lyrics PiP';
            this.elements.pipBtn.classList.toggle('active', !!this.lyricsPiPWindow || (!!document.pictureInPictureElement && document.pictureInPictureElement === this.lyricsPipVideo));
        } else {
            this.elements.pipBtn.style.display = this.currentSongHasVideo ? 'flex' : 'none';
            span.innerText = 'Video PiP';
            this.elements.pipBtn.classList.toggle('active', !!document.pictureInPictureElement);
        }
    },

    async toggleLyricsPiP() {
        // Fallback: Canvas PiP cho Mobile/Browsers không hỗ trợ Document PiP
        if (!('documentPictureInPicture' in window)) {
            if (document.pictureInPictureElement && document.pictureInPictureElement === this.lyricsPipVideo) {
                await document.exitPictureInPicture();
                return;
            }
            if (!this.lyricsCanvas) {
                this.lyricsCanvas = document.createElement('canvas');
                this.lyricsCanvas.width = 600; this.lyricsCanvas.height = 300;
                this.lyricsPipVideo = document.createElement('video');
                this.lyricsPipVideo.muted = true; this.lyricsPipVideo.playsInline = true;

                this.lyricsPipVideo.addEventListener('play', () => { if (!this.state.isPlaying) this.play(); });
                this.lyricsPipVideo.addEventListener('pause', () => { if (this.state.isPlaying && this.isLyricsCanvasActive) this.pause(); });

                this.lyricsPipVideo.onleavepictureinpicture = () => {
                    this.isLyricsCanvasActive = false;
                    this.updatePiPButtonUI();
                    this.lyricsPipVideo.pause();
                    // Clean up the video element
                    this.lyricsPipVideo.src = '';
                    this.lyricsPipVideo.srcObject = null;
                };
            }

            // Update canvas with current lyrics before showing PiP
            this.updateLyricsCanvasForPiP();

            if (!this.lyricsPipVideo.srcObject) this.lyricsPipVideo.srcObject = this.lyricsCanvas.captureStream();
            try {
                await this.lyricsPipVideo.play();
                await this.lyricsPipVideo.requestPictureInPicture();
                this.isLyricsCanvasActive = true;
                this.updatePiPButtonUI();
            } catch (e) {
                console.error(e);
                this.showToast('Không thể mở Lyrics PiP');
                this.isLyricsCanvasActive = false;
            }
            return;
        }

        if (this.lyricsPiPWindow) {
            // Close existing PiP window
            this.lyricsPiPWindow.close();
            return;
        }

        try {
            const pipWindow = await window.documentPictureInPicture.requestWindow({ width: 400, height: 600 });
            this.lyricsPiPWindow = pipWindow;

            // Copy styles
            [...document.styleSheets].forEach((styleSheet) => {
                try {
                    const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                    const style = document.createElement('style');
                    style.textContent = cssRules;
                    pipWindow.document.head.appendChild(style);
                } catch (e) {
                    if (styleSheet.href) {
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = styleSheet.href;
                        pipWindow.document.head.appendChild(link);
                    }
                }
            });
            pipWindow.document.body.style.background = '#121212';
            pipWindow.document.body.style.color = '#fff';
            pipWindow.document.body.style.overflowY = 'auto';

            const container = this.elements.lyricsContainer.cloneNode(true); // Clone instead of moving
            pipWindow.document.body.appendChild(container);

            pipWindow.addEventListener('pagehide', () => {
                this.lyricsPiPWindow = null;
                this.updatePiPButtonUI();
            });
            this.updatePiPButtonUI();
        } catch (err) {
            console.error("Lyrics PiP Error:", err);
            this.showToast('Lỗi mở Lyrics PiP');
        }
    },

    updateLyricsCanvasForPiP() {
        if (!this.lyricsCanvas) return;
        const currentTime = (this.currentSongHasVideo ? this.video.currentTime : this.audio.currentTime) || 0;
        let activeId = null;
        for (let i = 0; i < this.lyricsData.length; i++) {
            if (this.lyricsData[i].time <= currentTime) activeId = this.lyricsData[i].id;
            else break;
        }
        this.updateLyricsCanvas(activeId);
    },

    updateLyricsCanvas(activeId) {
        if (!this.lyricsCanvas) return;
        const ctx = this.lyricsCanvas.getContext('2d');
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, this.lyricsCanvas.width, this.lyricsCanvas.height);

        const activeIndex = this.lyricsData.findIndex(x => x.id === activeId);
        const activeItem = this.lyricsData[activeIndex];
        const nextItem = this.lyricsData[activeIndex + 1];

        const text = activeItem ? activeItem.text : '...';
        const nextText = nextItem ? nextItem.text : '';

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Get the actual primary color value
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ffffff';

        // Draw current line with primary color
        ctx.fillStyle = primaryColor;
        ctx.font = 'bold 32px Arial';
        ctx.fillText(text, this.lyricsCanvas.width / 2, this.lyricsCanvas.height / 2 - 20);

        // Draw next line with dimmed color
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '24px Arial';
        ctx.fillText(nextText, this.lyricsCanvas.width / 2, this.lyricsCanvas.height / 2 + 30);

        // Draw song title smaller at bottom
        ctx.font = '20px Arial'; ctx.fillStyle = '#888';
        ctx.fillText(this.state.playlist[this.state.currentIndex]?.name || '', this.lyricsCanvas.width / 2, this.lyricsCanvas.height - 40);
    },

    // --- NAVIGATION & FILTERING ---
    /**
     * Chuyển đổi giữa các tab (Song, Video, Lyrics) trong full player.
     * @param {string} tab - Tên tab ('song', 'video', 'lyrics').
     */

};