window.MusicProModules = window.MusicProModules || {};
window.MusicProModules.ui = {
    async init() {
        this.applyTheme();
        
        // Inject Transition CSS
        const style = document.createElement('style');
        style.innerHTML = `
            #track-list { transition: opacity 0.2s ease-out, transform 0.2s ease-out; opacity: 1; transform: translateY(0); }
            .modal-content { scrollbar-width: none; -ms-overflow-style: none; }
            .modal-content::-webkit-scrollbar { display: none; }
            @media (max-width: 480px) { .modal-content { padding: 20px !important; width: 95% !important; } }
            
            /* Swipe Up UI Styles */
            .full-player-artwork-container { position: relative; overflow: hidden; width: 100%; height: 100%; border-radius: 20px; }
            #full-artwork { transition: opacity 0.1s linear; z-index: 2; position: relative; width: 100%; height: 100%; object-fit: cover; border-radius: 20px; }
            
            .swipe-hint-container {
                position: absolute; bottom: 30px; left: 0; width: 100%; 
                display: flex; justify-content: center;
                z-index: 3; pointer-events: none;
            }
            .swipe-hint-content {
                display: flex; flex-direction: column; align-items: center;
                padding: 8px 20px;
                background: rgba(127, 127, 127, 0.1);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 30px;
                border: 1px solid rgba(255, 255, 255, 0.05);
                animation: swipeHintCycle 20s infinite;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .swipe-hint-content::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(255,255,255,0.8) 50%, 
                    transparent 100%);
                animation: shimmer 1.5s infinite;
                z-index: 1;
            }
            .swipe-hint-icon { 
                color: white; 
                font-size: 18px; 
                margin-bottom: 2px; 
                text-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 0 8px rgba(255,255,255,0.3);
            }
            .swipe-hint-text {
                font-size: 13px; 
                font-weight: 700; 
                text-transform: uppercase; 
                letter-spacing: 1px;
                color: white;
                text-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 0 8px rgba(255,255,255,0.3);
            }
            
            .context-queue-container {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: var(--bg-surface);
                z-index: 1; border-radius: 20px; opacity: 0;
                display: flex; flex-direction: column;
                transition: opacity 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
            }
            .queue-header { padding: 15px; font-weight: 700; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center; }
            .queue-list { flex: 1; overflow-y: auto; padding: 10px; scrollbar-width: none; }
            .queue-list::-webkit-scrollbar { display: none; }
            .queue-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; margin-bottom: 5px; cursor: pointer; }
            .queue-item.active { background: var(--primary); color: white; }
            .queue-item:not(.active):hover { background: rgba(255,255,255,0.1); }
            .queue-item-info { flex: 1; overflow: hidden; }
            .queue-item-title { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .queue-item-artist { font-size: 12px; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            @keyframes swipeHintCycle {
                0% { opacity: 0; transform: translateY(30px); }
                30% { opacity: 0; transform: translateY(30px); }
                50% { opacity: 1; transform: translateY(0); }
                55% { transform: translateY(-5px); }
                60% { transform: translateY(0); }
                65% { transform: translateY(-5px); }
                70% { transform: translateY(0); }
                75% { transform: translateY(-5px); }
                80% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(30px); }
            }
            
            @keyframes shimmer {
                0% { left: -100%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { left: 100%; opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        const rawTracks = await window.MusicProModules.helpers.loadRemoteTracks();
        this.state.playlist = window.MusicProModules.helpers.normalizeTracks(rawTracks);
        this.renderPlaylist();
        this.renderContextQueue(); // Update queue when playlist changes

        // Set initial volume using the new centralized method
        this.setVolume(this.state.volume, this.state.volume === 0);
        const volBar = document.getElementById('vol-bar');
        if (volBar) {
            // Đảm bảo thanh âm lượng có thuộc tính đúng để tính toán phần trăm
            if (!volBar.hasAttribute('max')) volBar.max = 1;
            if (!volBar.hasAttribute('step')) volBar.step = 0.01;
            this.updateRangeInput(volBar);
        }

        // Removed automatic playback restoration on app start
        // Keeping history and other saved data functionality

        // Inject Settings Nav Item
        const navContainer = document.querySelector('.bottom-nav');
        if (navContainer && navContainer.children.length === 3) {
             const btn = document.createElement('div');
             btn.className = 'nav-link';
             btn.innerHTML = '<i class="fa-solid fa-gear"></i><span>Cài đặt</span>';
             navContainer.appendChild(btn);
        }

        this.updateTimerText();
        // Initial UI State: Hide chips on Playlist page (index 0)
        const chips = document.querySelector('.chips-wrapper');
        if (chips) chips.style.display = 'none';

        document.getElementById('sort-controls').style.display = 'flex';
        setTimeout(() => { this.elements.loader.style.opacity = '0'; setTimeout(() => this.elements.loader.style.display = 'none', 500); }, 800);
        this.setupEventListeners();
        this.setupMediaSession();
        this.setupPiP();
        this.setupVideoFullscreen();
        this.setupTabSwipeGestures();

        // Initialize toggle switches
        this.updateToggleStates();
        // Initialize theme color
        this.updateThemeColor();
        // Initialize header avatar
        this.initializeHeaderAvatar();
        
        // Update range inputs to match theme after a short delay
        setTimeout(() => { this.updateAllRangeInputs(); }, 100);

        // --- UI CUSTOMIZATION FOR FULL PLAYER ---
        // 1. Add "+" button to the right of btn-heart (replacing options button position)
        const btnHeart = document.getElementById('btn-heart');
        if (btnHeart && btnHeart.parentNode && !document.getElementById('btn-add-quick')) {
            const btnAdd = document.createElement('button');
            btnAdd.id = 'btn-add-quick';
            btnAdd.className = 'btn-icon';
            btnAdd.innerHTML = '<i class="fa-solid fa-plus"></i>';
            btnAdd.onclick = (e) => {
                e.stopPropagation();
                this.showAddToPlaylistModal(this.state.currentIndex);
            };
            btnHeart.parentNode.insertBefore(btnAdd, btnHeart.nextSibling);
        }

        // 2. Organize Options Menu
        const btnDl = document.getElementById('btn-dl');
        if (btnDl) btnDl.style.display = 'none';
        
        this.reorderOptionsMenu();

        // Initialize Swipe UI
        this.setupSwipeUI();
        this.initAuthSettings();
    },

    /**
     * Initialize header avatar with saved profile image
     */
    initializeHeaderAvatar() {
        // Load user profile data
        const userProfile = {
            name: localStorage.getItem('user_name') || '',
            email: localStorage.getItem('user_email') || '',
            avatar: localStorage.getItem('user_avatar') || 'https://github.com/d4m-dev/media/raw/main/ThuVienChinh/favicon/favicon-32x32.png'
        };

        // Check if profile data is expired (3 days for avatar, 30 days for name/email)
        const now = Date.now();
        const avatarTimestamp = localStorage.getItem('user_avatar_timestamp');

        // Clear expired avatar data
        if (avatarTimestamp && (now - parseInt(avatarTimestamp)) > 3 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem('user_avatar');
            localStorage.removeItem('user_avatar_timestamp');
            userProfile.avatar = 'https://github.com/d4m-dev/media/raw/main/ThuVienChinh/favicon/favicon-32x32.png';
        }

        // Update the header avatar
        this.updateHeaderAvatar(userProfile.avatar);
        
        // If theme is auto, ensure we're listening to system changes
        if (this.state.theme === 'auto') {
            this.ensureSystemThemeListener();
        }
    },

    /**
     * Get the initial theme based on localStorage or system preference
     */
    getInitialTheme() {
        const savedTheme = localStorage.getItem('theme');
        
        // If theme is set to 'auto', return 'auto' to indicate auto mode is active
        if (savedTheme === 'auto') {
            return 'auto';
        }
        
        // If no theme is saved, check HTML attribute
        if (!savedTheme) {
            const htmlElement = document.documentElement;
            const htmlTheme = htmlElement.getAttribute('data-theme');
            
            if (htmlTheme === 'auto') {
                // Use system preference
                return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            } else {
                // Use the theme from HTML attribute if not 'auto'
                return htmlTheme || 'light';
            }
        }
        
        return savedTheme;
    },

    /**
     * Áp dụng chủ đề (sáng/tối) cho ứng dụng.
     */
    applyTheme() {
        // If theme is set to 'auto', determine the system theme to apply
        let themeToApply = this.state.theme;
        if (this.state.theme === 'auto') {
            themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', themeToApply);
        
        // Update range inputs to reflect theme changes
        this.updateAllRangeInputs();
    },
    
    toggleTheme() {
        // Cycle through theme options: auto -> dark -> light -> auto
        if (this.state.theme === 'auto') {
            this.state.theme = 'dark';
        } else if (this.state.theme === 'dark') {
            this.state.theme = 'light';
        } else {
            this.state.theme = 'auto';
        }
        
        localStorage.setItem('theme', this.state.theme);
        this.applyTheme();
        this.updateThemeColor();
        this.updateToggleStates();
        this.updateAllRangeInputs();
    },
    
    /**
     * Set theme to auto mode (follow system preference)
     */
    setAutoTheme() {
        // Determine the current system theme preference
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        
        // Set theme to auto in localStorage
        localStorage.setItem('theme', 'auto');
        
        // Update state to reflect the system theme that will be used
        this.state.theme = systemTheme;
        
        // Apply the theme
        this.applyTheme();
        this.updateThemeColor();
        this.updateToggleStates();
        this.updateAllRangeInputs();
    },

    /**
     * Ensure system theme listener is active
     */
    ensureSystemThemeListener() {
        // This method ensures that the system theme listener is active
        // when the theme is set to auto
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Update theme based on current system preference
        const newTheme = mediaQuery.matches ? 'dark' : 'light';
        if (this.state.theme !== newTheme) {
            this.state.theme = newTheme;
            this.applyTheme();
            this.updateThemeColor();
            this.updateToggleStates();
            this.updateAllRangeInputs();
        }
    },

    /**
     * Cập nhật màu sắc theme cho thanh địa chỉ trình duyệt
     */
    updateThemeColor() {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            if (this.state.theme === 'dark') {
                metaThemeColor.setAttribute('content', '#000000');
            } else {
                metaThemeColor.setAttribute('content', '#f0f2f5');
            }
        }
        
        // Update range inputs to reflect theme changes
        this.updateAllRangeInputs();
    },

    /**
     * Setup Swipe Up UI and Logic
     */
    setupSwipeUI() {
        const artwork = document.getElementById('full-artwork');
        if (!artwork || !artwork.parentElement) return;

        // Wrap artwork if not already wrapped correctly
        let container = artwork.parentElement;
        if (!container.classList.contains('full-player-artwork-container')) {
            container = document.createElement('div');
            container.className = 'full-player-artwork-container';
            artwork.parentNode.insertBefore(container, artwork);
            container.appendChild(artwork);
        }

        // Add Swipe Hint
        const hint = document.createElement('div');
        hint.className = 'swipe-hint-container';
        hint.innerHTML = `
            <div class="swipe-hint-content">
                <div class="swipe-hint-icon"><i class="fa-solid fa-chevron-up"></i></div>
                <div class="swipe-hint-text">Vuốt để xem thêm</div>
            </div>
        `;
        container.appendChild(hint);
        this.elements.swipeHint = hint;

        // Add Context Queue Container (Hidden behind artwork initially)
        const queue = document.createElement('div');
        queue.className = 'context-queue-container';
        queue.innerHTML = `
            <div class="queue-header">Danh sách phát</div>
            <div class="queue-list" id="context-queue-list"></div>
        `;
        container.appendChild(queue);
        this.elements.queueContainer = queue;
        this.elements.queueList = document.getElementById('context-queue-list');

        this.setupSwipeGestures(container, artwork, queue, hint);
    },

    /**
     * Handle Swipe Gestures
     */
    setupSwipeGestures(container, artwork, queue, hint) {
        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const onTouchStart = (e) => {
            // Only allow swipe if not scrolling the queue list
            if (this.isQueueVisible && this.elements.queueList.scrollTop > 0) return;
            
            startY = e.touches[0].clientY;
            isDragging = true;
            artwork.style.transition = 'none';
            queue.style.transition = 'none';
            hint.style.transition = 'none';
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            const height = container.offsetHeight;

            // Logic: Swipe Up (deltaY < 0) to show queue, Swipe Down (deltaY > 0) to hide queue
            let progress = 0;
            const sensitivity = 0.6; // Higher = Slower/More distance required (0.6 = 60% of height)

            if (!this.isQueueVisible) {
                // Dragging UP to show queue
                if (deltaY < 0) {
                    progress = Math.min(1, Math.abs(deltaY) / (height * sensitivity)); 
                    artwork.style.opacity = 1 - progress;
                    queue.style.opacity = progress;
                    hint.style.opacity = 1 - progress;
                }
            } else {
                // Dragging DOWN to hide queue
                if (deltaY > 0) {
                    progress = Math.min(1, deltaY / (height * sensitivity));
                    artwork.style.opacity = progress;
                    queue.style.opacity = 1 - progress;
                    hint.style.opacity = progress;
                }
            }
        };

        const onTouchEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;
            artwork.style.transition = 'opacity 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
            queue.style.transition = 'opacity 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
            hint.style.transition = 'opacity 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';

            const deltaY = currentY - startY;
            const threshold = 80; // Increased threshold for "slower" feel

            if (!this.isQueueVisible) {
                if (deltaY < -threshold) {
                    // Swiped Up enough -> Show Queue
                    this.isQueueVisible = true;
                    artwork.style.opacity = 0;
                    queue.style.opacity = 1;
                    hint.style.opacity = 0;
                    artwork.style.pointerEvents = 'none'; // Let clicks pass to queue
                    queue.style.zIndex = 4; // Bring to front
                } else {
                    // Reset
                    artwork.style.opacity = 1;
                    queue.style.opacity = 0;
                    hint.style.opacity = 1;
                }
            } else {
                if (deltaY > threshold) {
                    // Swiped Down enough -> Hide Queue
                    this.isQueueVisible = false;
                    artwork.style.opacity = 1;
                    queue.style.opacity = 0;
                    hint.style.opacity = 1;
                    artwork.style.pointerEvents = 'auto';
                    queue.style.zIndex = 1; // Send to back
                } else {
                    // Keep Queue Open
                    artwork.style.opacity = 0;
                    queue.style.opacity = 1;
                    hint.style.opacity = 0;
                }
            }
        };

        container.addEventListener('touchstart', onTouchStart, { passive: true });
        container.addEventListener('touchmove', onTouchMove, { passive: true });
        container.addEventListener('touchend', onTouchEnd);
    },
    
    /**
     * Centralized function to set volume and mute state.
     * Controls Web Audio API GainNode if available, otherwise falls back to element volume.
     */
    setVolume(volume, isMuted = false) {
        this.state.volume = volume;
        this.state.isMuted = isMuted;
        const finalVolume = isMuted ? 0 : volume;

        // Update Web Audio API gain nodes if they exist
        if (window.MusicProModules.utils.audioContext && this.state.isPlaying) {
            try {
                // Update gain for audio element
                if (this.sourceNodes.audio && this.effectNodes.gain) {
                    // If we're using effects, update the gain node before the effects
                    const currentTime = this.audio.currentTime;
                    const isPlaying = !this.audio.paused;
                    this.audio.volume = finalVolume; // Still set element volume for immediate effect

                    // The actual volume control happens through the gain node in the audio graph
                    // which is updated in the audio module's methods
                } else {
                    // Direct connection - update the gain node that connects to destination
                    // This would be handled in the audio module's play/pause methods
                    this.audio.volume = finalVolume;
                }

                // Update gain for video element
                if (this.sourceNodes.video && this.effectNodes.gain) {
                    this.video.volume = finalVolume;
                }

                // Update gain for beat audio element
                if (this.sourceNodes.beat && this.effectNodes.gain) {
                    this.beatAudio.volume = finalVolume;
                }
            } catch (e) {
                console.warn('Could not update Web Audio gain nodes:', e);
                // Fallback to direct volume control
                this.audio.volume = finalVolume;
                if (this.video) this.video.volume = finalVolume;
                this.beatAudio.volume = finalVolume;
            }
        } else {
            // Fallback to direct volume control when Web Audio is not available
            this.audio.volume = finalVolume;
            if (this.video) this.video.volume = finalVolume;
            this.beatAudio.volume = finalVolume;
        }

        // Update UI
        const volBar = document.getElementById('vol-bar');
        if (volBar) {
            volBar.value = finalVolume;
            this.updateRangeInput(volBar);
        }
        this.updateMuteUI();
        localStorage.setItem('volume', this.state.volume);
    },

    /**
     * Helper to consistently style a range input's track (Horizontal Mode).
     */
    updateRangeInput(element) {
        if (!element) return;
        
        // 1. Reset toàn bộ thuộc tính dọc cũ về trạng thái nằm ngang chuẩn của trình duyệt
        element.style.appearance = 'none';
        element.style.webkitAppearance = 'none';
        element.style.writingMode = 'horizontal-tb'; 
        element.style.direction = 'ltr';

        const min = parseFloat(element.min) || 0;
        const max = parseFloat(element.max) || 100;
        const val = parseFloat(element.value) || 0;
        const percentage = ((val - min) / (max - min)) * 100;
        
        // 2. Lấy thời gian thực màu chủ đạo hệ thống từ biến CSS --primary
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2962ff';
        
        // Reset background-size để lớp màu gradient hiển thị toàn diện
        element.style.backgroundSize = '100% 100%';
        
        // 3. Đổ màu đồng bộ từ TRÁI qua PHẢI cho cả thanh nhạc và thanh âm lượng nằm ngang
        element.style.backgroundImage = `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, var(--range-bg) ${percentage}%, var(--range-bg) 100%)`;
    },

    updateAllRangeInputs() {
        const ranges = document.querySelectorAll('input[type="range"]');
        ranges.forEach(range => this.updateRangeInput(range));

        // Update mini player progress with current theme color
        const miniFill = document.getElementById('mini-fill');
        if (miniFill) {
            const currentColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2962ff';
            miniFill.style.backgroundColor = currentColor;
        }
    },

    /**
     * Reorder items in the options menu
     */
    reorderOptionsMenu() {
        const menu = this.elements.optionsMenu;
        if (!menu) return;

        // 1. Sleep Timer
        if (this.elements.btnOpenTimer) menu.appendChild(this.elements.btnOpenTimer);
        
        // 2. Switch Beat
        if (this.elements.btnSwitchBeat) menu.appendChild(this.elements.btnSwitchBeat);
        
        // 3. PiP
        if (this.elements.pipBtn) menu.appendChild(this.elements.pipBtn);
        
        // 4. Download
        let dlItem = menu.querySelector('.menu-dl-item');
        if (!dlItem) {
            dlItem = document.createElement('div');
            dlItem.className = 'menu-item menu-dl-item';
            dlItem.innerHTML = '<i class="fa-solid fa-download"></i> <span>Tải xuống</span>';
            dlItem.onclick = () => { this.openDownloadModal(this.state.currentIndex); this.elements.optionsMenu.classList.remove('show'); };
        }
        menu.appendChild(dlItem);
    },

    /**
     * Show playlist manager modal
     */
    showPlaylistManager() {
        let modal = document.getElementById('playlist-manager-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'playlist-manager-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 85vh; border-radius: 16px; padding: 24px; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Danh sách phát cá nhân</h3>
                        <button class="btn-close-modal" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); border: none; color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div id="playlist-list-container" style="flex: 1; overflow-y: auto; margin-bottom: 24px; min-height: 200px;">
                        <div id="playlist-list" style="display: flex; flex-direction: column; gap: 12px;"></div>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn-close-modal" style="flex: 1; background: rgba(255,255,255,0.05);">Đóng</button>
                        <button id="btn-create-playlist" style="flex: 1; background: var(--primary); color: white; padding: 12px; border-radius: 12px; font-weight: 600;">Tạo mới</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Show the modal
        modal.classList.add('show');

        // Render playlists
        this.renderUserPlaylists();

        // Add event listeners
        const closeAndClear = () => {
            modal.classList.remove('show');
            if (this.playlistSlideshows) {
                this.playlistSlideshows.forEach(i => clearInterval(i));
                this.playlistSlideshows = [];
            }
        };

        modal.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.onclick = closeAndClear;
        });

        document.getElementById('btn-create-playlist').onclick = () => {
            closeAndClear();
            this.showCreatePlaylistModal();
        };

        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeAndClear();
            }
        };
    },

    /**
     * Render user playlists in the manager
     */
    renderUserPlaylists() {
        const playlistList = document.getElementById('playlist-list');
        if (!playlistList) return;

        // Clear existing intervals
        if (this.playlistSlideshows) {
            this.playlistSlideshows.forEach(i => clearInterval(i));
        }
        this.playlistSlideshows = [];

        if (this.state.userPlaylists.length === 0) {
            playlistList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-sub);">Chưa có danh sách phát nào</div>';
            return;
        }

        playlistList.innerHTML = '';

        this.state.userPlaylists.forEach((playlist, index) => {
            const playlistItem = document.createElement('div');
            playlistItem.className = 'settings-item';
            playlistItem.style.cursor = 'pointer';
            
            let iconHtml = `<div class="settings-icon"><i class="fa-solid fa-list-music"></i></div>`;
            
            if (playlist.tracks && playlist.tracks.length > 0) {
                iconHtml = `
                    <div class="settings-icon" id="pl-thumb-${index}" style="position: relative; overflow: hidden; padding: 0;">
                        <i class="fa-solid fa-list-music" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1;"></i>
                        <img class="pl-img-a" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 1s ease; z-index: 2;">
                        <img class="pl-img-b" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 1s ease; z-index: 2;">
                    </div>
                `;
            }

            playlistItem.innerHTML = `
                ${iconHtml}
                <div class="settings-info">
                    <div class="settings-name">${playlist.name}</div>
                    <div class="settings-desc">${playlist.tracks.length} bài hát • ${playlist.createdAt ? new Date(playlist.createdAt).toLocaleDateString('vi-VN') : ''}</div>
                </div>
                <div class="settings-action">
                    <span class="status-indicator status-info">${playlist.tracks.length}</span>
                </div>
            `;

            playlistItem.onclick = () => {
                this.showPlaylistDetailModal(playlist, index);
            };

            playlistList.appendChild(playlistItem);
            
            if (playlist.tracks && playlist.tracks.length > 0) {
                this.startPlaylistSlideshow(`pl-thumb-${index}`, playlist.tracks);
            }
        });
    },

    /**
     * Start slideshow for playlist thumbnail
     */
    startPlaylistSlideshow(elementId, trackIds) {
        const container = document.getElementById(elementId);
        if (!container) return;

        const imgA = container.querySelector('.pl-img-a');
        const imgB = container.querySelector('.pl-img-b');
        let active = 'a';

        const update = () => {
            if (!document.body.contains(container)) return;
            
            const randomId = trackIds[Math.floor(Math.random() * trackIds.length)];
            const track = this.state.playlist.find(t => String(t.id) === String(randomId));
            
            if (track && track.artwork) {
                const nextImg = active === 'a' ? imgB : imgA;
                const currImg = active === 'a' ? imgA : imgB;
                
                const tempImg = new Image();
                tempImg.src = track.artwork;
                tempImg.onload = () => {
                    nextImg.src = track.artwork;
                    nextImg.style.opacity = '1';
                    nextImg.style.zIndex = '3';
                    currImg.style.zIndex = '2';
                    setTimeout(() => { currImg.style.opacity = '0'; }, 1000);
                    active = active === 'a' ? 'b' : 'a';
                };
            }
        };

        update();
        const interval = setInterval(update, 3000);
        this.playlistSlideshows.push(interval);
    },

    /**
     * Show create playlist modal
     */
    showCreatePlaylistModal(trackIndexToAdd = null) {
        let modal = document.getElementById('create-playlist-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'create-playlist-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 85vh; overflow-y: auto; border-radius: 16px; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Tạo danh sách phát</h3>
                        <button class="btn-close-modal" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); border: none; color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div style="margin-bottom: 24px;">
                        <input type="text" id="playlist-name-input" placeholder="Tên danh sách phát..." style="width: 100%; padding: 12px; border-radius: 12px; background: var(--bg-secondary); color: var(--text-main); border: 1px solid var(--border); margin-bottom: 15px;">
                        <textarea id="playlist-desc-input" placeholder="Mô tả (không bắt buộc)..." style="width: 100%; padding: 12px; border-radius: 12px; background: var(--bg-secondary); color: var(--text-main); border: 1px solid var(--border); height: 80px; resize: none;"></textarea>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn-close-modal" style="flex: 1; background: rgba(255,255,255,0.05);">Hủy</button>
                        <button id="btn-save-playlist" style="flex: 1; background: var(--primary); color: white; padding: 12px; border-radius: 12px; font-weight: 600;">Tạo</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Show the modal
        modal.classList.add('show');

        // Add event listeners
        document.getElementById('btn-save-playlist').onclick = () => {
            const name = document.getElementById('playlist-name-input').value.trim();
            if (!name) {
                this.showToast('Vui lòng nhập tên danh sách phát');
                return;
            }

            this.createPlaylist(name, document.getElementById('playlist-desc-input').value.trim(), trackIndexToAdd);
            modal.classList.remove('show');
        };

        modal.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.onclick = () => modal.classList.remove('show');
        });

        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        };
    },

    /**
     * Create a new playlist
     */
    createPlaylist(name, description = '', trackIndexToAdd = null) {
        const newPlaylist = {
            id: Date.now(),
            name: name,
            description: description,
            tracks: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (trackIndexToAdd !== null && this.state.playlist[trackIndexToAdd]) {
            newPlaylist.tracks.push(String(this.state.playlist[trackIndexToAdd].id));
        }

        this.state.userPlaylists.push(newPlaylist);
        this.saveUserPlaylists();
        if (trackIndexToAdd !== null) {
            this.showToast(`Đã tạo "${name}" và thêm bài hát`);
        } else {
            this.showToast(`Đã tạo danh sách phát "${name}"`);
        }

        // Re-render if the playlist manager is open
        if (document.getElementById('playlist-manager-modal')?.classList.contains('show')) {
            this.renderUserPlaylists();
        }
    },

    /**
     * Save user playlists to localStorage
     */
    saveUserPlaylists() {
        localStorage.setItem('userPlaylists', JSON.stringify(this.state.userPlaylists));
    },

    /**
     * Show equalizer modal - DISABLED
     */
    showEqualizerModal() {
        // EQ feature is currently disabled
        this.showToast('Tính năng EQ đang phát triển...');
    },

    /**
     * Initialize equalizer values - REMOVED
     */
    initEqualizerValues() {
        // EQ feature removed
    },

    /**
     * Apply equalizer preset
     */
    applyEqPreset(preset) {
        // EQ feature removed
    },

    toggleEqualizer() {
        // EQ feature removed
        this.showToast('Tính năng EQ đang phát triển...');
    },

    /**
     * Initialize Audio Context and Graph
     */
    initAudioContext() {
        // Initialize audio context via utils and assign to instance
        this.audioContext = window.MusicProModules.utils.initAudioContext();
    },

    /**
     * Get or create MediaElementSource for an element
     */
    getSourceNode(element) {
        if (!element) return null;
        const key = element === this.audio ? 'audio' : (element === this.video ? 'video' : 'beat');
        if (!this.sourceNodes[key]) {
            this.sourceNodes[key] = this.audioContext.createMediaElementSource(element);
        }
        return this.sourceNodes[key];
    },

    /**
     * Reconnect the audio graph for volume control
     */
    updateAudioGraph() {
        // Disabled
    },

    /**
     * Reset equalizer to default values - REMOVED
     */
    resetEqualizer() {
        // EQ feature removed
    },

    /**
     * Initialize audio context when needed
     */
    initializeAudioContext() {
        this.initAudioContext();
    },

    /**
     * Resume audio context to comply with autoplay policies
     */
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume()
                .then(() => {
                    console.log('Audio context resumed successfully');
                })
                .catch((err) => {
                    console.error('Failed to resume audio context:', err);
                });
        }
    },

    /**
     * Show playlist detail modal
     */
    showPlaylistDetailModal(playlist, index) {
        let modal = document.getElementById('playlist-detail-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'playlist-detail-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 85vh; border-radius: 16px; padding: 24px; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <button id="btn-play-playlist" style="width: 45px; height: 45px; border-radius: 50%; background: var(--primary); border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                                <i class="fa-solid fa-play"></i>
                            </button>
                            <div>
                                <h3 id="pl-detail-name" style="margin: 0; font-size: 20px; font-weight: 700;"></h3>
                                <p id="pl-detail-count" style="color: var(--text-sub); font-size: 14px; margin: 0;"></p>
                            </div>
                        </div>
                        <button class="btn-close-modal" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); border: none; color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div id="playlist-tracks-container" style="flex: 1; overflow-y: auto; margin-bottom: 24px;">
                        <div id="playlist-tracks" style="display: flex; flex-direction: column; gap: 10px;"></div>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button id="btn-edit-playlist" style="flex: 1; background: rgba(255,255,255,0.1); color: var(--text-main); padding: 12px; border-radius: 12px; font-weight: 600;">Chỉnh sửa</button>
                        <button id="btn-delete-playlist" style="flex: 1; background: #ff4757; color: white; padding: 12px; border-radius: 12px; font-weight: 600;">Xóa</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            modal.querySelectorAll('.btn-close-modal').forEach(btn => {
                btn.onclick = () => modal.classList.remove('show');
            });
            
            modal.onclick = (e) => {
                if (e.target === modal) modal.classList.remove('show');
            };
        }

        // Update dynamic content
        document.getElementById('pl-detail-name').innerText = playlist.name;
        document.getElementById('pl-detail-count').innerText = `${playlist.tracks.length} bài hát`;

        // Show the modal
        modal.classList.add('show');

        // Render playlist tracks
        this.renderPlaylistTracks(playlist, index);

        // Add event listeners
        document.getElementById('btn-play-playlist').onclick = () => {
            this.playUserPlaylist(index);
            modal.classList.remove('show');
            document.getElementById('playlist-manager-modal')?.classList.remove('show');
        };

        document.getElementById('btn-edit-playlist').onclick = () => {
            this.showEditPlaylistModal(index);
        };

        document.getElementById('btn-delete-playlist').onclick = () => {
            if (confirm(`Bạn có chắc muốn xóa danh sách phát "${playlist.name}"?`)) {
                this.deletePlaylist(index);
                modal.classList.remove('show');
                document.getElementById('playlist-manager-modal')?.classList.remove('show');
            }
        };
    },

    /**
     * Show edit playlist modal
     */
    showEditPlaylistModal(index) {
        const playlist = this.state.userPlaylists[index];
        if (!playlist) return;

        let modal = document.getElementById('edit-playlist-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'edit-playlist-modal';
            modal.className = 'modal-overlay';
            modal.style.zIndex = '10001'; // Ensure it's above detail modal
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 85vh; overflow-y: auto; border-radius: 16px; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Chỉnh sửa danh sách</h3>
                        <button class="btn-close-modal" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); border: none; color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div style="margin-bottom: 24px;">
                        <input type="text" id="edit-playlist-name" placeholder="Tên danh sách phát..." style="width: 100%; padding: 12px; border-radius: 12px; background: var(--bg-secondary); color: var(--text-main); border: 1px solid var(--border); margin-bottom: 15px;">
                        <textarea id="edit-playlist-desc" placeholder="Mô tả (không bắt buộc)..." style="width: 100%; padding: 12px; border-radius: 12px; background: var(--bg-secondary); color: var(--text-main); border: 1px solid var(--border); height: 80px; resize: none;"></textarea>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn-close-modal" style="flex: 1; background: rgba(255,255,255,0.05);">Hủy</button>
                        <button id="btn-update-playlist" style="flex: 1; background: var(--primary); color: white; padding: 12px; border-radius: 12px; font-weight: 600;">Lưu</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            modal.querySelectorAll('.btn-close-modal').forEach(btn => {
                btn.onclick = () => modal.classList.remove('show');
            });
            
            modal.onclick = (e) => {
                if (e.target === modal) modal.classList.remove('show');
            };
        }

        // Pre-fill data
        document.getElementById('edit-playlist-name').value = playlist.name;
        document.getElementById('edit-playlist-desc').value = playlist.description || '';

        // Show the modal
        modal.classList.add('show');

        // Add event listeners
        document.getElementById('btn-update-playlist').onclick = () => {
            const name = document.getElementById('edit-playlist-name').value.trim();
            const desc = document.getElementById('edit-playlist-desc').value.trim();
            
            if (!name) {
                this.showToast('Vui lòng nhập tên danh sách phát');
                return;
            }

            this.updatePlaylist(index, name, desc);
            modal.classList.remove('show');
        };
    },

    /**
     * Update existing playlist
     */
    updatePlaylist(index, name, description) {
        const playlist = this.state.userPlaylists[index];
        if (playlist) {
            playlist.name = name;
            playlist.description = description;
            playlist.updatedAt = new Date().toISOString();
            this.saveUserPlaylists();
            this.showToast('Đã cập nhật danh sách phát');
            
            // Update UI if detail modal is open
            const detailName = document.getElementById('pl-detail-name');
            if (detailName && document.getElementById('playlist-detail-modal')?.classList.contains('show')) {
                detailName.innerText = name;
            }
            
            // Update UI if manager is open
            if (document.getElementById('playlist-manager-modal')?.classList.contains('show')) {
                this.renderUserPlaylists();
            }
            
            // Update UI if playing this playlist
            if (this.state.currentFilter === 'user_playlist' && this.state.currentUserPlaylistIndex === index) {
                 document.querySelector('.list-header h2').innerText = name;
            }
        }
    },

    /**
     * Play all tracks in a user playlist
     */
    playUserPlaylist(index) {
        const playlist = this.state.userPlaylists[index];
        if (!playlist || !playlist.tracks.length) {
            this.showToast('Danh sách phát trống');
            return;
        }
        
        this.state.currentFilter = 'user_playlist';
        this.state.currentUserPlaylistIndex = index;
        
        // Switch to home tab
        this.switchNavigation(0);
        
        // Update UI
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.list-header h2').innerText = playlist.name;
        
        this.renderPlaylist();
        
        // Play first song
        const firstTrackId = playlist.tracks[0];
        const realIdx = this.state.playlist.findIndex(t => String(t.id) === String(firstTrackId));
        
        if (realIdx !== -1) {
            this.playIndex(realIdx);
            this.showToast(`Đang phát: ${playlist.name}`);
        }
    },

    /**
     * Render tracks in a playlist
     */
    renderPlaylistTracks(playlist, playlistIndex) {
        const tracksContainer = document.getElementById('playlist-tracks');
        if (!tracksContainer) return;

        if (playlist.tracks.length === 0) {
            tracksContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-sub);">Danh sách trống</div>';
            return;
        }

        tracksContainer.innerHTML = '';

        playlist.tracks.forEach((trackId, trackIndex) => {
            const track = this.state.playlist.find(t => t.id === parseInt(trackId));
            if (track) {
                const trackItem = document.createElement('div');
                trackItem.className = 'track-item';
                trackItem.style.cursor = 'pointer';
                trackItem.innerHTML = `
                    <div class="track-thumb" style="width: 40px; height: 40px; border-radius: 8px; overflow: hidden;">
                        <img src="${track.artwork}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://github.com/d4m-dev/media/raw/main/ThuVienChinh/favicon/favicon-32x32.png'">
                    </div>
                    <div class="track-info" style="flex: 1;">
                        <div class="track-title">${track.name}</div>
                        <div class="track-artist">${track.artist}</div>
                    </div>
                    <button class="btn-remove-track" data-playlist-index="${playlistIndex}" data-track-index="${trackIndex}" style="background: none; border: none; color: var(--text-sub); cursor: pointer;">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;

                trackItem.onclick = (e) => {
                    if (!e.target.closest('.btn-remove-track')) {
                        // Set context for user playlist
                        this.state.currentFilter = 'user_playlist';
                        this.state.currentUserPlaylistIndex = playlistIndex;
                        this.state.searchQuery = '';

                        // Play this track
                        const trackIndexInPlaylist = this.state.playlist.findIndex(t => t.id === track.id);
                        if (trackIndexInPlaylist !== -1) {
                            this.playIndex(trackIndexInPlaylist);
                        }
                    }
                };

                trackItem.querySelector('.btn-remove-track').onclick = (e) => {
                    e.stopPropagation();
                    this.removeFromPlaylist(playlistIndex, trackIndex);
                };

                tracksContainer.appendChild(trackItem);
            }
        });
    },

    /**
     * Add track to a playlist
     */
    addToPlaylist(trackId, playlistIndex) {
        const playlist = this.state.userPlaylists[playlistIndex];
        if (!playlist.tracks.includes(String(trackId))) {
            playlist.tracks.push(String(trackId));
            playlist.updatedAt = new Date().toISOString();
            this.saveUserPlaylists();
            this.showToast('Đã thêm vào danh sách phát');
        } else {
            this.showToast('Bài hát đã tồn tại trong danh sách');
        }
    },

    /**
     * Remove track from a playlist
     */
    removeFromPlaylist(playlistIndex, trackIndex) {
        const playlist = this.state.userPlaylists[playlistIndex];
        playlist.tracks.splice(trackIndex, 1);
        playlist.updatedAt = new Date().toISOString();
        this.saveUserPlaylists();
        this.showToast('Đã xóa khỏi danh sách phát');

        // Re-render if the detail modal is open
        const detailModal = document.getElementById('playlist-detail-modal');
        if (detailModal?.classList.contains('show')) {
            this.renderPlaylistTracks(playlist, playlistIndex);
        }
    },

    /**
     * Delete a playlist
     */
    deletePlaylist(index) {
        this.state.userPlaylists.splice(index, 1);
        this.saveUserPlaylists();
        this.showToast('Đã xóa danh sách phát');

        // Re-render if the manager is open
        if (document.getElementById('playlist-manager-modal')?.classList.contains('show')) {
            this.renderUserPlaylists();
        }
    },

    /**
     * Show track context menu
     */
    showTrackContextMenu(trackIndex, event) {
        // Remove existing context menu if present
        const existingMenu = document.getElementById('track-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const track = this.state.playlist[trackIndex];
        const menu = document.createElement('div');
        menu.id = 'track-context-menu';
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            min-width: 200px;
            padding: 8px 0;
        `;

        // Position the menu near the click event
        const x = event.clientX || (event.touches && event.touches[0].clientX) || 0;
        const y = event.clientY || (event.touches && event.touches[0].clientY) || 0;

        // Check if menu would go off screen and adjust position
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const menuWidth = 200; // Approximate width
        const menuHeight = 200; // Approximate height

        let left = x;
        let top = y;

        if (x + menuWidth > screenWidth) left = screenWidth - menuWidth - 10;
        if (y + menuHeight > screenHeight) top = screenHeight - menuHeight - 10;

        menu.style.left = left + 'px';
        menu.style.top = top + 'px';

        // Create menu items
        const menuItems = [
            {
                icon: 'fa-solid fa-list-music',
                label: 'Thêm vào danh sách phát',
                onClick: () => {
                    this.showAddToPlaylistModal(trackIndex);
                    menu.remove();
                }
            },
            {
                icon: 'fa-solid fa-heart',
                label: 'Yêu thích',
                onClick: () => {
                    this.toggleFavorite(trackIndex);
                    menu.remove();
                }
            },
            {
                icon: 'fa-solid fa-download',
                label: 'Tải về',
                onClick: () => {
                    this.openDownloadModal(trackIndex);
                    menu.remove();
                }
            }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            menuItem.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                cursor: pointer;
                transition: background 0.2s;
            `;
            menuItem.innerHTML = `<i class="${item.icon}"></i> <span>${item.label}</span>`;

            menuItem.onmouseenter = () => {
                menuItem.style.background = 'rgba(255,255,255,0.05)';
            };

            menuItem.onmouseleave = () => {
                menuItem.style.background = 'transparent';
            };

            menuItem.onclick = item.onClick;

            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);

        // Close menu when clicking elsewhere
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
                document.removeEventListener('touchstart', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
            document.addEventListener('touchstart', closeMenu);
        }, 10);
    },

    /**
     * Show add to playlist modal
     */
    showAddToPlaylistModal(trackIndex) {
        const track = this.state.playlist[trackIndex];
        let modal = document.getElementById('add-to-playlist-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'add-to-playlist-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 85vh; border-radius: 16px; padding: 24px; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Thêm vào danh sách</h3>
                        <button class="btn-close-modal" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); border: none; color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div style="margin-bottom: 15px;" id="add-pl-track-container">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img id="add-pl-track-img" src="${track.artwork}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" onerror="this.src='https://github.com/d4m-dev/media/raw/main/ThuVienChinh/favicon/favicon-32x32.png'">
                            <div style="flex: 1;">
                                <div id="add-pl-track-name" style="font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.name}</div>
                                <div id="add-pl-track-artist" style="font-size: 13px; color: var(--text-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.artist}</div>
                            </div>
                        </div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <input type="text" id="playlist-search-input" placeholder="Tìm danh sách phát..." style="width: 100%; padding: 12px; border-radius: 12px; background: var(--bg-secondary); color: var(--text-main); border: 1px solid var(--border); font-size: 14px;">
                    </div>
                    <div id="playlist-options" style="flex: 1; overflow-y: auto; margin-bottom: 24px; min-height: 150px;"></div>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn-close-modal" style="flex: 1; background: rgba(255,255,255,0.05);">Hủy</button>
                        <button id="btn-create-new-playlist" style="flex: 1; background: var(--primary); color: white; padding: 12px; border-radius: 12px; font-weight: 600;">Tạo mới</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Add search listener
            const searchInput = document.getElementById('playlist-search-input');
            if (searchInput) {
                searchInput.oninput = (e) => this.renderPlaylistOptions(trackIndex, e.target.value);
            }
        } else {
            // Update existing modal content with animation
            const container = document.getElementById('add-pl-track-container');
            if (container) {
                container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                container.style.opacity = '0';
                container.style.transform = 'translateX(-10px)';
                
                setTimeout(() => {
                    document.getElementById('add-pl-track-img').src = track.artwork;
                    document.getElementById('add-pl-track-name').innerText = track.name;
                    document.getElementById('add-pl-track-artist').innerText = track.artist;
                    
                    container.style.opacity = '1';
                    container.style.transform = 'translateX(0)';
                }, 200);
            }
            
            // Reset search input
            const searchInput = document.getElementById('playlist-search-input');
            if (searchInput) {
                searchInput.value = '';
                searchInput.oninput = (e) => this.renderPlaylistOptions(trackIndex, e.target.value);
            }
        }

        // Show the modal
        modal.classList.add('show');

        // Clear slideshows when opening this modal to avoid conflicts/leaks
        if (this.playlistSlideshows) {
            this.playlistSlideshows.forEach(i => clearInterval(i));
            this.playlistSlideshows = [];
        }

        // Render playlist options
        this.renderPlaylistOptions(trackIndex);

        // Add event listeners
        document.getElementById('btn-create-new-playlist').onclick = () => {
            modal.classList.remove('show');
            this.showCreatePlaylistModal(trackIndex);
        };

        modal.querySelectorAll('.btn-close-modal').forEach(btn => btn.onclick = () => {
            modal.classList.remove('show');
            this.clearPlaylistSlideshows();
        });

        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                this.clearPlaylistSlideshows();
            }
        };
    },

    clearPlaylistSlideshows() {
        if (this.playlistSlideshows) {
            this.playlistSlideshows.forEach(i => clearInterval(i));
            this.playlistSlideshows = [];
        }
    },

    /**
     * Render playlist options for adding a track
     */
    renderPlaylistOptions(trackIndex, searchQuery = '') {
        const container = document.getElementById('playlist-options');
        if (!container) return;

        if (this.state.userPlaylists.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-sub);">Chưa có danh sách phát nào</div>';
            return;
        }

        container.innerHTML = '';
        let hasResults = false;

        this.state.userPlaylists.forEach((playlist, index) => {
            if (searchQuery && !playlist.name.toLowerCase().includes(searchQuery.toLowerCase())) return;
            hasResults = true;

            const playlistItem = document.createElement('div');
            playlistItem.className = 'settings-item';
            playlistItem.style.marginBottom = '8px';
            
            let iconHtml = `<div class="settings-icon"><i class="fa-solid fa-list-music"></i></div>`;
            if (playlist.tracks && playlist.tracks.length > 0) {
                iconHtml = `
                    <div class="settings-icon" id="pl-opt-thumb-${index}" style="position: relative; overflow: hidden; padding: 0;">
                        <i class="fa-solid fa-list-music" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1;"></i>
                        <img class="pl-img-a" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 1s ease; z-index: 2;">
                        <img class="pl-img-b" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 1s ease; z-index: 2;">
                    </div>
                `;
            }

            playlistItem.innerHTML = `
                ${iconHtml}
                <div class="settings-info">
                    <div class="settings-name">${playlist.name}</div>
                    <div class="settings-desc">${playlist.tracks.length} bài hát</div>
                </div>
                <div class="settings-action">
                    <span class="status-indicator status-info">${playlist.tracks.includes(String(this.state.playlist[trackIndex].id)) ? 'ĐÃ CÓ' : 'THÊM'}</span>
                </div>
            `;

            playlistItem.onclick = () => {
                this.addToPlaylist(this.state.playlist[trackIndex].id, index);
                // Update the status indicator
                const statusIndicator = playlistItem.querySelector('.status-indicator');
                if (statusIndicator) {
                    statusIndicator.textContent = 'ĐÃ THÊM';
                    statusIndicator.className = 'status-indicator status-success';
                }
            };

            container.appendChild(playlistItem);
            
            if (playlist.tracks && playlist.tracks.length > 0) {
                this.startPlaylistSlideshow(`pl-opt-thumb-${index}`, playlist.tracks);
            }
        });

        if (!hasResults) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-sub);">Không tìm thấy kết quả</div>';
        }
    },

    /**
     * Lọc và sắp xếp danh sách bài hát dựa trên trạng thái hiện tại (filter, search, sort).
     */
    getDisplayPlaylist() {
        let display = [...this.state.playlist];
        
        if (this.state.currentFilter === 'user_playlist') {
            const playlist = this.state.userPlaylists[this.state.currentUserPlaylistIndex];
            if (playlist) {
                // Map tracks in the order of the playlist
                const trackMap = new Map(display.map(t => [String(t.id), t]));
                display = playlist.tracks.map(id => trackMap.get(String(id))).filter(t => t);
            } else {
                display = [];
            }
        }
        else if (this.state.currentFilter === 'history') {
             const trackMap = new Map(display.map(t => [String(t.id), t]));
             display = this.state.history.map(id => trackMap.get(String(id))).filter(t => t);
        }
        else if (this.state.currentFilter === 'favorites') display = display.filter(t => this.state.favorites.includes(String(t.id)));
        else if (this.state.currentFilter === 'remix') display = display.filter(t => (window.PLAYLIST_REMIX || []).includes(String(t.id)));
        else if (this.state.currentFilter === 'tet') display = display.filter(t => (window.PLAYLIST_TET || []).includes(String(t.id)));
        else if (this.state.currentFilter === 'lofi') display = display.filter(t => (window.PLAYLIST_LOFI || []).includes(String(t.id)));
        
        const q = this.state.searchQuery.toLowerCase().trim();
        if (q) display = display.filter(t => t.name.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
        
        if (this.state.currentFilter !== 'user_playlist' && this.state.currentFilter !== 'history') {
             if (this.state.sortBy === 'name') display.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
             else display.sort((a, b) => b.id - a.id);
        } else {
             // For user playlist/history, allow name sort, but default to list order
             if (this.state.sortBy === 'name') display.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        }
        return display;
    },

    // --- UI RENDERING & UPDATES ---
    /**
     * Render (hoặc cập nhật) danh sách bài hát hiển thị trên giao diện chính. */
    // --- VIRTUAL SCROLLING IMPLEMENTATION ---
    renderPlaylist() {
        this.virtual.displayList = this.getDisplayPlaylist();
        if (this.state.currentNav === 1 || this.state.currentNav === 3) return; // Không render playlist ảo ở trang Khám phá & Cài đặt
        this.elements.clearSearchBtn.style.display = this.state.searchQuery ? 'flex' : 'none';
        
        // Reset scroll container style
        this.elements.list.style.height = 'auto';
        this.elements.list.style.paddingTop = '0px';
        this.elements.list.style.paddingBottom = '0px';
        
        // Reset virtual scroll state to force render
        this.virtual.lastStartRow = -1;
        this.virtual.lastEndRow = -1;

        if (!this.virtual.displayList.length) { 
            this.elements.list.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-sub)">Không tìm thấy bài hát</div>`; 
            return; 
        }

        // Tính toán kích thước và render chunk đầu tiên
        this.updateVirtualMetrics();
        this.renderVirtualChunk();
    },

    updateVirtualMetrics() {
        const width = window.innerWidth;
        const isDesktop = width >= 1024;
        // Desktop: Grid layout (~110px height + gap), Mobile: List layout (~75px height)
        // Reduced heights for better performance and smoother scrolling
        this.virtual.rowHeight = isDesktop ? 110 : 75;

        if (isDesktop) {
            this.virtual.itemsPerRow = 3;
        } else {
            this.virtual.itemsPerRow = 1;
        }
    },

    onScroll() {
        if (this.state.currentNav === 1 || this.state.currentNav === 3) return;
        if (!this.virtual.isTicking) {
            window.requestAnimationFrame(() => {
                this.renderVirtualChunk();
                this.virtual.isTicking = false;
            });
            this.virtual.isTicking = true;
        }
    },

    renderVirtualChunk() {
        const { displayList, rowHeight, itemsPerRow, buffer } = this.virtual;
        const totalItems = displayList.length;
        const scrollTop = this.elements.scrollContainer.scrollTop;
        const viewportHeight = this.elements.scrollContainer.clientHeight;

        const totalRows = Math.ceil(totalItems / itemsPerRow);
        const startRow = Math.floor(scrollTop / rowHeight);
        const visibleRows = Math.ceil(viewportHeight / rowHeight);
        
        // Xác định vùng render với buffer
        const renderStartRow = Math.max(0, startRow - buffer);
        const renderEndRow = Math.min(totalRows, startRow + visibleRows + buffer);

        // Optimization: Only render if range changed
        if (this.virtual.lastStartRow === renderStartRow && this.virtual.lastEndRow === renderEndRow) return;
        this.virtual.lastStartRow = renderStartRow;
        this.virtual.lastEndRow = renderEndRow;

        const startIndex = renderStartRow * itemsPerRow;
        const endIndex = Math.min(totalItems, renderEndRow * itemsPerRow);

        // Cập nhật padding để giả lập chiều cao scroll
        this.elements.list.style.paddingTop = `${renderStartRow * rowHeight}px`;
        this.elements.list.style.paddingBottom = `${(totalRows - renderEndRow) * rowHeight}px`;

        // Render các items trong vùng nhìn thấy
        this.elements.list.innerHTML = '';
        const frag = document.createDocumentFragment();
        let isLongPress = false;
        
        for (let i = startIndex; i < endIndex; i++) {
            const track = displayList[i];
            // Tìm index gốc trong playlist chính để xử lý sự kiện click
            const realIdx = this.state.playlist.findIndex(t => t.id === track.id);
            
            const item = document.createElement('div');
            item.className = 'track-item';
            item.dataset.realIdx = realIdx; // 🛡️ phục vụ refreshActiveState
            if (realIdx === this.state.currentIndex) item.classList.add('active');
            
            const isFav = this.state.favorites.includes(String(track.id));
            item.innerHTML = `<div class="track-thumb"><img src="${track.artwork}" loading="lazy" decoding="async"><div class="wave-anim"><div class="bar"></div><div class="bar"></div><div class="bar"></div></div></div><div class="track-info"><div class="track-title">${track.name}</div><div class="track-artist">${track.artist}</div></div><div style="display:flex;gap:5px"><button class="btn-icon btn-favorite-sm ${isFav?'active':''}" onclick="event.stopPropagation();app.toggleFavorite(${realIdx})"><i class="fa-${isFav?'solid':'regular'} fa-heart"></i></button><button class="btn-icon btn-download-sm" onclick="event.stopPropagation();app.openDownloadModal(${realIdx})"><i class="fa-solid fa-download"></i></button><button class="btn-icon btn-more-sm" onclick="event.stopPropagation();app.showTrackContextMenu(${realIdx}, event)"><i class="fa-solid fa-ellipsis"></i></button></div>`;
            item.onclick = (e) => { 
                if (isLongPress) { isLongPress = false; return; }
                if (!e.target.closest('.btn-download-sm') && !e.target.closest('.btn-favorite-sm') && !e.target.closest('.btn-more-sm')) this.playIndex(realIdx); 
            };

            // Add context menu for right-click or long press
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showTrackContextMenu(realIdx, e);
            });

            // Touch hold for mobile
            let touchStartTime;
            item.addEventListener('touchstart', (e) => {
                touchStartTime = new Date().getTime();
            });

            item.addEventListener('touchend', (e) => {
                const touchDuration = new Date().getTime() - touchStartTime;
                if (touchDuration > 500) { // Long press (>500ms)
                    e.preventDefault();
                    isLongPress = true;
                    this.showTrackContextMenu(realIdx, e);
                }
            });
            frag.appendChild(item);
        }
        this.elements.list.appendChild(frag);
    },

    // 🛡️ FIX giật list: toggle class active/fav trên hàng có sẵn, KHÔNG rebuild DOM
    refreshActiveState() {
        const rows = this.elements.list ? this.elements.list.querySelectorAll('.track-item') : [];
        rows.forEach((row) => {
            const idx = parseInt(row.dataset.realIdx, 10);
            if (isNaN(idx)) return;
            row.classList.toggle('active', idx === this.state.currentIndex);
            const favBtn = row.querySelector('.btn-favorite-sm');
            if (favBtn) {
                const isFav = this.state.favorites.includes(String(this.state.playlist[idx]?.id));
                favBtn.classList.toggle('active', isFav);
                const ic = favBtn.querySelector('i');
                if (ic) ic.className = `fa-${isFav ? 'solid' : 'regular'} fa-heart`;
            }
        });
    },

    /**
     * Render the Context Queue (Swipe Up List)
     */
    renderContextQueue() {
        if (!this.elements.queueList) return;
        
        const displayList = this.getDisplayPlaylist();
        this.elements.queueList.innerHTML = '';

        if (displayList.length === 0) {
            this.elements.queueList.innerHTML = '<div style="text-align:center; padding:20px; color:rgba(255,255,255,0.5)">Danh sách trống</div>';
            return;
        }

        const frag = document.createDocumentFragment();
        displayList.forEach((track, index) => {
            // Find real index in main playlist
            const realIdx = this.state.playlist.findIndex(t => t.id === track.id);
            
            const item = document.createElement('div');
            item.className = `queue-item ${realIdx === this.state.currentIndex ? 'active' : ''}`;
            item.innerHTML = `
                <div class="queue-item-info">
                    <div class="queue-item-title">${track.name}</div>
                    <div class="queue-item-artist">${track.artist}</div>
                </div>
            `;
            item.onclick = () => this.playIndex(realIdx);
            frag.appendChild(item);
        });
        this.elements.queueList.appendChild(frag);
    },

    /**
     * Render giao diện trang Khám phá (Lịch sử & Tính năng mới).
     */
    renderExplore() {
        this.elements.list.innerHTML = '';
        this.elements.list.style.height = 'auto';
        this.elements.list.style.paddingTop = '0px';
        this.elements.list.style.paddingBottom = '200px';

        // Nếu có truy vấn tìm kiếm, hiển thị kết quả tìm kiếm như trang chủ
        const q = this.state.searchQuery.toLowerCase().trim();
        if (q) {
            // Hiển thị kết quả tìm kiếm như trang chủ
            this.renderPlaylist();
            return;
        }

        const container = document.createElement('div');
        container.className = 'explore-container';

        const createSection = (title, ids, emptyMsg, filterType = null) => {
            const section = document.createElement('div');
            section.className = 'explore-section';

            // Header: Title + Xem tất cả
            const header = document.createElement('div');
            header.className = 'section-header';
            header.innerHTML = `<div class="explore-title">${title}</div>`;

            if (ids && ids.length > 0 && filterType) {
                const btn = document.createElement('div');
                btn.className = 'btn-see-all';
                btn.innerText = 'Xem tất cả';
                btn.onclick = () => {
                    // Chuyển tab về Trang chủ và filter
                    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
                    document.querySelectorAll('.nav-link')[0].classList.add('active');
                    this.state.currentNav = 0;
                    this.state.currentFilter = filterType;

                    // Update UI Header & Chips thủ công vì switchNavigation reset filter
                    document.querySelector('.list-header h2').innerText = 'Danh sách phát';
                    document.getElementById('sort-controls').style.display = 'flex';
                    const chips = document.querySelector('.chips-wrapper');
                    if (chips) chips.style.display = 'flex';
                    document.querySelectorAll('.chip').forEach(c => {
                        c.classList.toggle('active', c.dataset.type === filterType);
                    });
                    this.renderPlaylist();
                };
                header.appendChild(btn);
            }
            section.appendChild(header);

            if (!ids || ids.length === 0) {
                if (emptyMsg) {
                    section.innerHTML += `<p style="color:var(--text-sub);font-size:14px;text-align:center;padding:20px">${emptyMsg}</p>`;
                    return section;
                }
                return null;
            }

            const grid = document.createElement('div');
            grid.className = 'explore-scroll-container'; // Sử dụng class scroll ngang
            ids.forEach(id => {
                const song = this.state.playlist.find(t => String(t.id) === String(id));
                if (song) {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.innerHTML = `<img src="${song.artwork}" class="history-img" loading="lazy"><div class="history-title">${song.name}</div><div class="history-artist">${song.artist}</div>`;
                    item.onclick = () => {
                        if (filterType) {
                            this.state.currentFilter = filterType;
                            this.state.searchQuery = '';
                        }
                        const idx = this.state.playlist.findIndex(t => t.id === song.id);
                        this.playIndex(idx);
                    };
                    grid.appendChild(item);
                }
            });
            section.appendChild(grid);
            return section;
        };

        container.appendChild(createSection('Nghe gần đây', this.state.history, 'Chưa có lịch sử nghe nhạc', 'history'));

        const remix = createSection('Nhạc Remix', window.PLAYLIST_REMIX || [], 'Danh sách đang cập nhật', 'remix');
        if (remix) container.appendChild(remix);

        const tet = createSection('Nhạc Tết', window.PLAYLIST_TET || [], 'Danh sách đang cập nhật', 'tet');
        if (tet) container.appendChild(tet);

        const lofi = createSection('Nhạc Lofi', window.PLAYLIST_LOFI || [], 'Danh sách đang cập nhật', 'lofi');
        if (lofi) container.appendChild(lofi);

        this.elements.list.appendChild(container);
    },

    /**
     * Render giao diện trang Cài đặt.
     */
    renderSettings() {
        this.elements.list.innerHTML = '';
        this.elements.list.style.height = 'auto';
        this.elements.list.style.paddingTop = '0px';
        this.elements.list.style.paddingBottom = '200px';
        this.elements.clearSearchBtn.style.display = this.state.searchQuery ? 'flex' : 'none';

        const container = document.createElement('div');
        container.className = 'settings-container';

        const createSection = (title, items) => {
            const section = document.createElement('div');
            section.className = 'settings-section';
            section.innerHTML = `<div class="settings-title">${title}</div>`;
            items.forEach(item => {
                const row = document.createElement('div');
                row.className = 'settings-item';
                if (item.onClick) row.onclick = item.onClick;
                row.innerHTML = `
                    <div class="settings-icon"><i class="${item.icon}"></i></div>
                    <div class="settings-info">
                        <div class="settings-name">${item.name}</div>
                        <div class="settings-desc">${item.desc || ''}</div>
                    </div>
                    ${item.action ? `<div class="settings-action">${item.action}</div>` : ''}
                `;
                section.appendChild(row);
            });
            return section;
        };

        // Load user profile data
        const userProfile = {
            name: localStorage.getItem('user_name') || '',
            email: localStorage.getItem('user_email') || '',
            avatar: localStorage.getItem('user_avatar') || 'https://github.com/d4m-dev/media/raw/main/ThuVienChinh/favicon/favicon-32x32.png'
        };

        // Check if profile data is expired (3 days for avatar, 30 days for name/email)
        const now = Date.now();
        const nameTimestamp = localStorage.getItem('user_name_timestamp');
        const emailTimestamp = localStorage.getItem('user_email_timestamp');
        const avatarTimestamp = localStorage.getItem('user_avatar_timestamp');

        // Clear expired data
        if (nameTimestamp && (now - parseInt(nameTimestamp)) > 30 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem('user_name');
            localStorage.removeItem('user_name_timestamp');
            userProfile.name = '';
        }

        if (emailTimestamp && (now - parseInt(emailTimestamp)) > 30 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_email_timestamp');
            userProfile.email = '';
        }

        if (avatarTimestamp && (now - parseInt(avatarTimestamp)) > 3 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem('user_avatar');
            localStorage.removeItem('user_avatar_timestamp');
            userProfile.avatar = 'https://github.com/d4m-dev/media/raw/main/ThuVienChinh/favicon/favicon-32x32.png';
        }

        const profileItems = [
            {
                name: userProfile.name || 'Chưa đặt tên',
                desc: userProfile.email || 'Chưa có email',
                icon: 'fa-solid fa-user',
                onClick: () => {
                    // Show profile edit modal
                    this.showProfileEditModal(userProfile);
                }
            }
        ];

        const appearanceItems = [
            {
                name: 'Chủ đề',
                desc: this.state.theme === 'auto'
                    ? 'Tự động theo cài đặt hệ thống'
                    : (this.state.theme === 'dark' ? 'Hiện đang dùng giao diện tối' : 'Hiện đang dùng giao diện sáng'),
                icon: this.state.theme === 'auto'
                    ? 'fa-solid fa-laptop'
                    : (this.state.theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'),
                action: `<span class="status-indicator status-${this.state.theme === 'auto' ? 'info' : (this.state.theme === 'dark' ? 'active' : 'inactive')}">${this.state.theme === 'auto' ? 'TỰ ĐỘNG' : (this.state.theme === 'dark' ? 'TỐI' : 'SÁNG')}</span>`,
                onClick: () => {
                    // Cycle through theme options: auto -> dark -> light -> auto
                    if (this.state.theme === 'auto') {
                        this.state.theme = 'dark';
                    } else if (this.state.theme === 'dark') {
                        this.state.theme = 'light';
                    } else {
                        this.state.theme = 'auto';
                    }

                    localStorage.setItem('theme', this.state.theme);

                    this.applyTheme();
                    this.updateThemeColor();
                    this.updateToggleStates();
                    this.updateAllRangeInputs();

                    // Re-render settings to update the theme item
                    this.renderSettings();
                }
            },
            {
                name: 'Màu chủ đạo',
                desc: 'Tùy chỉnh màu sắc chính của ứng dụng',
                icon: 'fa-solid fa-palette',
                action: `<span class="status-indicator status-${this.state.customPrimaryColor ? 'active' : 'inactive'}">${this.state.customPrimaryColor ? 'TÙY CHỈNH' : 'MẶC ĐỊNH'}</span>`,
                onClick: () => {
                    this.showColorPickerModal();
                }
            },
            {
                name: 'Phông chữ',
                desc: 'Chọn kiểu chữ cho giao diện',
                icon: 'fa-solid fa-font',
                action: `<span class="status-indicator status-info">${this.getFontDisplayName(this.state.fontFamily)}</span>`,
                onClick: () => {
                    this.showFontSelectorModal();
                }
            },
            {
                name: 'Bố cục',
                desc: 'Tùy chỉnh cách bố trí giao diện',
                icon: 'fa-solid fa-table-cells',
                action: `<span class="status-indicator status-info">${this.getLayoutDisplayName(this.state.layoutMode)}</span>`,
                onClick: () => {
                    this.showLayoutSelectorModal();
                }
            }
        ];

        const playlistItems = [
            {
                name: 'Danh sách phát cá nhân',
                desc: `Quản lý ${this.state.userPlaylists?.length || 0} danh sách`,
                icon: 'fa-solid fa-music',
                action: `<span class="status-indicator status-info">${this.state.userPlaylists?.length || 0}</span>`,
                onClick: () => {
                    this.showPlaylistManager();
                }
            },
            {
                name: 'Tạo danh sách mới',
                desc: 'Tạo playlist cá nhân mới',
                icon: 'fa-solid fa-plus',
                onClick: () => {
                    this.showCreatePlaylistModal();
                }
            }
        ];

        const featureItems = [
            {
                name: 'Hẹn giờ tắt nhạc',
                desc: 'Tự động dừng phát sau một khoảng thời gian',
                icon: 'fa-solid fa-clock',
                action: `<span id="settings-timer-status" class="status-indicator ${this.state.sleepTimeLeft > 0 ? 'status-warning' : 'status-inactive'}">${this.state.sleepTimeLeft > 0 ? `${Math.ceil(this.state.sleepTimeLeft / 60)} phút` : 'Tắt'}</span>`,
                onClick: () => { this.elements.timerModal.classList.add('show'); }
            },
            {
                name: 'Chế độ ngủ thông minh',
                desc: 'Tự động giảm âm lượng dần trước khi tắt',
                icon: 'fa-solid fa-moon',
                action: `<span class="status-indicator ${this.state.smartSleepEnabled ? 'status-active' : 'status-inactive'}">${this.state.smartSleepEnabled ? 'BẬT' : 'TẮT'}</span>`,
                onClick: () => {
                    this.toggleSmartSleep();
                    this.renderSettings();
                }
            },
            { name: 'Chất lượng âm thanh', desc: 'Tùy chỉnh chất lượng phát', icon: 'fa-solid fa-music', action: '<span class="status-indicator status-info">CAO CẤP</span>' },
            { name: 'Âm thanh 3D & EQ', desc: 'Điều chỉnh hiệu ứng âm thanh nâng cao', icon: 'fa-solid fa-sliders', onClick: () => {
                this.checkProAccess(() => {
                    // Show the audio controls modal directly if unlocked
                    document.getElementById('audio-controls-modal').classList.add('show');
                });
            }}
        ];

        const securityItems = [
            { name: 'Tài khoản', desc: 'Đồng bộ dữ liệu đám mây', icon: 'fa-solid fa-user', action: '<span class="status-indicator status-syncing">ĐÃ ĐN</span>' }
        ];

        const generalItems = [
            {
                name: 'Cài đặt gốc',
                desc: 'Xóa toàn bộ dữ liệu và đặt lại ứng dụng',
                icon: 'fa-solid fa-rotate-right',
                action: '<span class="status-indicator status-warning">CẢNH BÁO</span>',
                onClick: () => {
                    document.getElementById('reset-modal').classList.add('show');
                }
            }
        ];

        const q = this.state.searchQuery.toLowerCase().trim();
        const filter = (items) => !q ? items : items.filter(i => i.name.toLowerCase().includes(q) || (i.desc && i.desc.toLowerCase().includes(q)));

        const g = filter(generalItems);
        const a = filter(appearanceItems);
        const f = filter(featureItems);

        if (profileItems.length) container.appendChild(createSection('Thông tin cá nhân', profileItems));
        if (a.length) container.appendChild(createSection('Giao diện', a));
        if (playlistItems.length) container.appendChild(createSection('Danh sách phát', playlistItems));
        if (f.length) container.appendChild(createSection('Tính năng', f));
        if (securityItems.length) container.appendChild(createSection('Bảo mật', securityItems));
        if (g.length) container.appendChild(createSection('Chung', g));

        if (!profileItems.length && !a.length && !f.length && !securityItems.length && !g.length) {
             container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-sub)">Không tìm thấy kết quả</div>`;
        }

        this.elements.list.appendChild(container);
    },

    /**
     * Hiển thị modal chỉnh sửa thông tin cá nhân
     */
    showProfileEditModal(profile) {
        // Create and show profile edit modal
        let modal = document.getElementById('profile-edit-modal');
        if (!modal) {
            // Create modal if it doesn't exist
            modal = document.createElement('div');
            modal.id = 'profile-edit-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 85vh; overflow-y: auto; border-radius: 16px; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Thông tin cá nhân</h3>
                        <button class="btn-close-modal" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); border: none; color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div style="margin-bottom: 20px; text-align: center; color: var(--text-sub); font-size: 13px;">
                        <i class="fa-solid fa-circle-info"></i> Tên và email được lưu 30 ngày, ảnh đại diện 3 ngày
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden; border: 2px solid var(--border);">
                                <img id="profile-avatar-preview" src="${profile.avatar}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://github.com/d4m-dev/media/raw/main/ThuVienChinh/favicon/favicon-32x32.png'">
                            </div>
                            <div style="flex: 1;">
                                <input type="text" id="profile-name-input" placeholder="Tên của bạn" value="${profile.name}" style="width: 100%; padding: 10px; border-radius: 8px; background: var(--bg-secondary); color: var(--text-main); border: 1px solid transparent; margin-bottom: 5px;">
                                <input type="email" id="profile-email-input" placeholder="Email của bạn" value="${profile.email}" style="width: 100%; padding: 10px; border-radius: 8px; background: var(--bg-secondary); color: var(--text-main); border: 1px solid transparent;">
                            </div>
                        </div>
                        <div style="text-align: center;">
                            <input type="file" id="profile-avatar-upload" accept="image/*" style="display: none;">
                            <button id="btn-upload-avatar" style="background: var(--bg-secondary); color: var(--text-main); padding: 10px 15px; border-radius: 8px; border: 1px dashed var(--border); width: 100%; cursor: pointer;">
                                <i class="fa-solid fa-cloud-arrow-up"></i> Chọn ảnh đại diện
                            </button>
                        </div>
                        <div style="display: flex; gap: 12px; margin-top: 10px;">
                            <button class="btn-close-modal" id="btn-cancel-profile" style="flex: 1; background: rgba(255,255,255,0.05);">Hủy</button>
                            <button id="btn-save-profile" style="flex: 1; background: var(--primary); color: white; padding: 12px; border-radius: 12px; font-weight: 600;">Lưu</a>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            // Update existing modal with current profile data
            document.getElementById('profile-avatar-preview').src = profile.avatar;
            document.getElementById('profile-name-input').value = profile.name;
            document.getElementById('profile-email-input').value = profile.email;
        }

        // Show the modal
        modal.classList.add('show');

        // Add event listeners
        const btnCancel = document.getElementById('btn-cancel-profile');
        const btnSave = document.getElementById('btn-save-profile');
        const btnUpload = document.getElementById('btn-upload-avatar');
        const fileInput = document.getElementById('profile-avatar-upload');
        const avatarPreview = document.getElementById('profile-avatar-preview');

        modal.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.onclick = () => modal.classList.remove('show');
        });

        btnCancel.onclick = () => {
            modal.classList.remove('show');
        };

        btnUpload.onclick = () => {
            fileInput.click();
        };

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    // Create a large cropping modal
                    this.showLargeCropModal(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        };

        btnSave.onclick = () => {
            const newName = document.getElementById('profile-name-input').value.trim();
            const newEmail = document.getElementById('profile-email-input').value.trim();
            // Use the cropped image if available, otherwise use the original
            const newAvatar = this.croppedImageDataUrl || profile.avatar;

            // Validate inputs
            if (newEmail && !this.isValidEmail(newEmail)) {
                this.showToast('Email không hợp lệ');
                return;
            }

            // Save to localStorage with timestamps
            const now = Date.now();

            if (newName) {
                localStorage.setItem('user_name', newName);
                localStorage.setItem('user_name_timestamp', now.toString());
            } else {
                localStorage.removeItem('user_name');
                localStorage.removeItem('user_name_timestamp');
            }

            if (newEmail) {
                localStorage.setItem('user_email', newEmail);
                localStorage.setItem('user_email_timestamp', now.toString());
            } else {
                localStorage.removeItem('user_email');
                localStorage.removeItem('user_email_timestamp');
            }

            localStorage.setItem('user_avatar', newAvatar);
            localStorage.setItem('user_avatar_timestamp', now.toString());

            this.showToast('Lưu thông tin cá nhân thành công');
            modal.classList.remove('show');

            // Re-render settings to update the profile display
            this.renderSettings();

            // Update the header avatar
            this.updateHeaderAvatar(newAvatar);
        };

        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        };
    },

    /**
     * Kiểm tra tính hợp lệ của email
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Initialize image cropper functionality
     */
    initializeCropper(canvas, ctx, img) {
        const self = this;
        let isDragging = false;
        let dragType = null; // 'move' or 'resize'
        let startX, startY;
        let cropX = 0, cropY = 0;
        let cropSize = Math.min(canvas.width, canvas.height) * 0.8; // Start with 80% of smallest dimension

        // Ensure square crop
        if (cropSize > canvas.width) cropSize = canvas.width;
        if (cropSize > canvas.height) cropSize = canvas.height;

        // Center the crop area initially
        cropX = (canvas.width - cropSize) / 2;
        cropY = (canvas.height - cropSize) / 2;

        // Draw image with crop overlay
        function drawOverlay() {
            // Redraw the image
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Draw overlay (darkened area outside crop)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Clear the crop area
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillRect(cropX, cropY, cropSize, cropSize);
            ctx.globalCompositeOperation = 'source-over';

            // Draw crop border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(cropX, cropY, cropSize, cropSize);

            // Draw resize handle
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(cropX + cropSize, cropY + cropSize, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mouse event handlers
        canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if clicking on resize handle
            const handleX = cropX + cropSize;
            const handleY = cropY + cropSize;
            const distance = Math.sqrt(Math.pow(x - handleX, 2) + Math.pow(y - handleY, 2));

            if (distance <= 10) {
                isDragging = true;
                dragType = 'resize';
            } else if (x >= cropX && x <= cropX + cropSize && y >= cropY && y <= cropY + cropSize) {
                isDragging = true;
                dragType = 'move';
                startX = x - cropX;
                startY = y - cropY;
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (dragType === 'move') {
                cropX = x - startX;
                cropY = y - startY;

                // Keep crop within bounds
                cropX = Math.max(0, Math.min(canvas.width - cropSize, cropX));
                cropY = Math.max(0, Math.min(canvas.height - cropSize, cropY));
            } else if (dragType === 'resize') {
                let newSize = Math.max(30, x - cropX, y - cropY); // Minimum size of 30px

                // Keep crop within bounds
                if (cropX + newSize > canvas.width) newSize = canvas.width - cropX;
                if (cropY + newSize > canvas.height) newSize = canvas.height - cropY;

                cropSize = newSize;
            }

            // Update cropParams with current values
            self.cropParams.cropX = cropX;
            self.cropParams.cropY = cropY;
            self.cropParams.cropSize = cropSize;

            drawOverlay();
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            dragType = null;
        });

        canvas.addEventListener('mouseleave', () => {
            isDragging = false;
            dragType = null;
        });

        // Touch events for mobile devices
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            // Check if clicking on resize handle
            const handleX = cropX + cropSize;
            const handleY = cropY + cropSize;
            const distance = Math.sqrt(Math.pow(x - handleX, 2) + Math.pow(y - handleY, 2));

            if (distance <= 10) {
                isDragging = true;
                dragType = 'resize';
            } else if (x >= cropX && x <= cropX + cropSize && y >= cropY && y <= cropY + cropSize) {
                isDragging = true;
                dragType = 'move';
                startX = x - cropX;
                startY = y - cropY;
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (!isDragging) return;

            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            if (dragType === 'move') {
                cropX = x - startX;
                cropY = y - startY;

                // Keep crop within bounds
                cropX = Math.max(0, Math.min(canvas.width - cropSize, cropX));
                cropY = Math.max(0, Math.min(canvas.height - cropSize, cropY));
            } else if (dragType === 'resize') {
                let newSize = Math.max(30, x - cropX, y - cropY); // Minimum size of 30px

                // Keep crop within bounds
                if (cropX + newSize > canvas.width) newSize = canvas.width - cropX;
                if (cropY + newSize > canvas.height) newSize = canvas.height - cropY;

                cropSize = newSize;
            }

            // Update cropParams with current values
            self.cropParams.cropX = cropX;
            self.cropParams.cropY = cropY;
            self.cropParams.cropSize = cropSize;

            drawOverlay();
        });

        canvas.addEventListener('touchend', () => {
            isDragging = false;
            dragType = null;
        });

        // Initial draw
        drawOverlay();

        // Store references for later use
        self.cropParams = { canvas, ctx, img, cropX, cropY, cropSize, drawOverlay };
    },

    /**
     * Get the cropped image as data URL
     */
    getCroppedImage() {
        if (!this.cropParams) return null;

        const { canvas, img, cropX, cropY, cropSize } = this.cropParams;

        // Create a new canvas for the cropped image
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');

        cropCanvas.width = cropSize;
        cropCanvas.height = cropSize;

        // Calculate the scale factor between original image and canvas
        const scaleX = img.naturalWidth / canvas.width;
        const scaleY = img.naturalHeight / canvas.height;

        // Draw the cropped portion
        cropCtx.drawImage(
            img,
            cropX * scaleX, // sx
            cropY * scaleY, // sy
            cropSize * scaleX, // sWidth
            cropSize * scaleY, // sHeight
            0, // dx
            0, // dy
            cropSize, // dWidth
            cropSize // dHeight
        );

        return cropCanvas.toDataURL('image/jpeg', 0.85);
    },

    /**
     * Show large cropping modal for image editing
     */
    showLargeCropModal(imageSrc) {
        let cropModal = document.getElementById('large-crop-modal');
        if (!cropModal) {
            cropModal = document.createElement('div');
            cropModal.id = 'large-crop-modal';
            cropModal.className = 'modal-overlay';
            cropModal.innerHTML = `
                <div class="modal-content" style="max-width: 90%; width: 90%; height: 80vh; display: flex; flex-direction: column; padding: 24px; border-radius: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Cắt ảnh đại diện</h3>
                        <button id="btn-close-crop" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); border: none; color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <div id="crop-container-large" style="flex: 1; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); border-radius: 12px; overflow: hidden; position: relative;">
                            <img id="crop-image-large" src="${imageSrc}" style="display: none;">
                            <canvas id="crop-canvas-large" style="max-width: 100%; max-height: 100%; display: block; cursor: grab;"></canvas>
                            <div id="crop-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></div>
                        </div>
                        <div style="display: flex; gap: 12px; margin-top: 15px;">
                            <button class="btn-close-modal" id="btn-cancel-crop" style="flex: 1; background: rgba(255,255,255,0.05);">Hủy</button>
                            <button id="btn-confirm-crop" style="flex: 1; background: var(--primary); color: white; padding: 12px; border-radius: 12px; font-weight: 600;">Xác nhận</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(cropModal);
        } else {
            document.getElementById('crop-image-large').src = imageSrc;
        }

        // Show the modal
        cropModal.classList.add('show');

        // Initialize the cropping functionality
        this.initializeLargeCropper(imageSrc);

        // Add event listeners
        document.getElementById('btn-close-crop').onclick = () => {
            cropModal.classList.remove('show');
        };

        document.getElementById('btn-cancel-crop').onclick = () => {
            cropModal.classList.remove('show');
        };

        document.getElementById('btn-confirm-crop').onclick = () => {
            const croppedImage = this.getCroppedImageLarge();
            if (croppedImage) {
                // Set the cropped image directly to the profile preview
                const profilePreview = document.getElementById('profile-avatar-preview');
                if (profilePreview) {
                    profilePreview.src = croppedImage;
                }

                // Store the cropped image
                this.croppedImageDataUrl = croppedImage;

                // Close the crop modal
                cropModal.classList.remove('show');

                // Show success message
                this.showToast('Đã cắt ảnh thành công');
            }
        };

        // Close modal when clicking outside
        cropModal.onclick = (e) => {
            if (e.target === cropModal) {
                cropModal.classList.remove('show');
            }
        };
    },

    /**
     * Initialize large cropper functionality using React-inspired approach
     */
    initializeLargeCropper(imageSrc) {
        const img = document.getElementById('crop-image-large');
        const self = this;

        // Initialize crop parameters
        self.zoom = 1;
        self.offset = { x: 0, y: 0 };
        self.dragging = false;
        self.dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
        self.canvasSize = { w: 520, h: 520 };

        // Wait for image to load if needed
        if (img.complete) {
            setupCropper();
        } else {
            img.onload = setupCropper;
        }

        function setupCropper() {
            // Get container
            const container = document.getElementById('crop-container-large');
            const canvas = document.getElementById('crop-canvas-large');
            const overlay = document.getElementById('crop-overlay');

            // Set canvas size
            const containerRect = container.getBoundingClientRect();
            self.canvasSize = {
                w: Math.max(260, Math.round(containerRect.width * 0.9)),
                h: Math.max(260, Math.round(containerRect.height * 0.7))
            };
            canvas.width = self.canvasSize.w;
            canvas.height = self.canvasSize.h;

            // Add zoom controls to the modal
            const controlsDiv = document.createElement('div');
            controlsDiv.id = 'crop-controls';
            controlsDiv.style.cssText = `
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 15px;
                margin: 15px 0;
            `;

            const zoomLabel = document.createElement('label');
            zoomLabel.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--text-main);
                font-size: 14px;
            `;
            zoomLabel.innerHTML = `
                <span>Phóng to:</span>
                <input type="range" min="1" max="3" step="0.05" value="${self.zoom}"
                       style="width: 150px; height: 5px; -webkit-appearance: none; background: var(--bg-secondary); border-radius: 10px; outline: none;">
            `;

            const resetBtn = document.createElement('button');
            resetBtn.textContent = 'Đặt lại';
            resetBtn.style.cssText = `
                background: var(--bg-secondary);
                color: var(--text-main);
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 8px 15px;
                cursor: pointer;
                font-size: 14px;
            `;

            controlsDiv.appendChild(zoomLabel);
            controlsDiv.appendChild(resetBtn);
            container.parentNode.insertBefore(controlsDiv, container.nextSibling);

            const zoomInput = zoomLabel.querySelector('input');
            zoomInput.oninput = (e) => {
                self.zoom = Number(e.target.value);
                drawCropOverlay();
            };

            resetBtn.onclick = () => {
                self.zoom = 1;
                self.offset = { x: 0, y: 0 };
                zoomInput.value = 1;
                drawCropOverlay();
            };

            // Draw the crop overlay
            function drawCropOverlay() {
                if (!img) return;

                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Calculate scale and offsets
                const baseScale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const scale = baseScale * self.zoom;
                const maxOffsetX = Math.max(0, (img.width * scale - canvas.width) / 2);
                const maxOffsetY = Math.max(0, (img.height * scale - canvas.height) / 2);
                const offsetX = self.offset.x * maxOffsetX;
                const offsetY = self.offset.y * maxOffsetY;

                // Draw image
                const drawWidth = img.width * scale;
                const drawHeight = img.height * scale;
                const cx = canvas.width / 2 + offsetX;
                const cy = canvas.height / 2 + offsetY;

                ctx.drawImage(img, cx - drawWidth / 2, cy - drawHeight / 2, drawWidth, drawHeight);

                // Draw grid overlay
                ctx.strokeStyle = "rgba(255,255,255,0.4)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(canvas.width / 3, 0);
                ctx.lineTo(canvas.width / 3, canvas.height);
                ctx.moveTo((canvas.width / 3) * 2, 0);
                ctx.lineTo((canvas.width / 3) * 2, canvas.height);
                ctx.moveTo(0, canvas.height / 3);
                ctx.lineTo(canvas.width, canvas.height / 3);
                ctx.moveTo(0, (canvas.height / 3) * 2);
                ctx.lineTo(canvas.width, (canvas.height / 3) * 2);
                ctx.stroke();

                // Draw crop border
                ctx.strokeStyle = "rgba(0,0,0,0.25)";
                ctx.lineWidth = 1;
                ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
            }

            // Initial draw
            drawCropOverlay();

            // Helper function to clamp values
            function clamp(value, min, max) {
                return Math.min(max, Math.max(min, value));
            }

            // Get scale helper
            function getScale(canvasWidth, canvasHeight) {
                if (!img) return { scale: 1, maxOffsetX: 0, maxOffsetY: 0 };
                const baseScale = Math.max(canvasWidth / img.width, canvasHeight / img.height);
                const scale = baseScale * self.zoom;
                return {
                    scale,
                    maxOffsetX: Math.max(0, (img.width * scale - canvasWidth) / 2),
                    maxOffsetY: Math.max(0, (img.height * scale - canvasHeight) / 2)
                };
            }

            // Event handlers
            function handlePointerDown(e) {
                if (!img) return;
                const { maxOffsetX, maxOffsetY } = getScale(self.canvasSize.w, self.canvasSize.h);
                self.dragging = true;
                self.dragStart = {
                    x: e.clientX,
                    y: e.clientY,
                    ox: self.offset.x,
                    oy: self.offset.y,
                    maxX: maxOffsetX,
                    maxY: maxOffsetY
                };
            }

            function handlePointerMove(e) {
                if (!self.dragging || !img) return;
                const dx = e.clientX - self.dragStart.x;
                const dy = e.clientY - self.dragStart.y;
                const { maxOffsetX, maxOffsetY } = getScale(self.canvasSize.w, self.canvasSize.h);

                const nextX = maxOffsetX > 0 ? clamp(self.dragStart.ox + dx / maxOffsetX, -1, 1) : 0;
                const nextY = maxOffsetY > 0 ? clamp(self.dragStart.oy + dy / maxOffsetY, -1, 1) : 0;

                self.offset = { x: nextX, y: nextY };
                drawCropOverlay();
            }

            function handlePointerUp() {
                self.dragging = false;
            }

            // Add event listeners to canvas
            canvas.onmousedown = handlePointerDown;
            document.addEventListener('mousemove', handlePointerMove);
            document.addEventListener('mouseup', handlePointerUp);

            // Touch events
            canvas.addEventListener('touchstart', (e) => {
                if (!img) return;
                e.preventDefault();
                const touch = e.touches[0];
                const { maxOffsetX, maxOffsetY } = getScale(self.canvasSize.w, self.canvasSize.h);
                self.dragging = true;
                self.dragStart = {
                    x: touch.clientX,
                    y: touch.clientY,
                    ox: self.offset.x,
                    oy: self.offset.y,
                    maxX: maxOffsetX,
                    maxY: maxOffsetY
                };
            });

            document.addEventListener('touchmove', (e) => {
                if (!self.dragging || !img) return;
                e.preventDefault();
                const touch = e.touches[0];
                const dx = touch.clientX - self.dragStart.x;
                const dy = touch.clientY - self.dragStart.y;
                const { maxOffsetX, maxOffsetY } = getScale(self.canvasSize.w, self.canvasSize.h);

                const nextX = maxOffsetX > 0 ? clamp(self.dragStart.ox + dx / maxOffsetX, -1, 1) : 0;
                const nextY = maxOffsetY > 0 ? clamp(self.dragStart.oy + dy / maxOffsetY, -1, 1) : 0;

                self.offset = { x: nextX, y: nextY };
                drawCropOverlay();
            });

            document.addEventListener('touchend', () => {
                self.dragging = false;
            });
        }
    },

    /**
     * Zoom the image
     */
    zoomImage(factor) {
        if (this.cropScale) {
            this.cropScale = Math.max(0.1, Math.min(this.cropScale * factor, 5));
            this.drawCropOverlay && this.drawCropOverlay();
        }
    },

    /**
     * Set move mode
     */
    setMoveMode() {
        // This is handled by the mouse events already
        if (this.drawCropOverlay) {
            const canvas = document.getElementById('crop-canvas-large');
            if (canvas) {
                canvas.style.cursor = 'grab';
            }
        }
    },

    /**
     * Get the cropped image
     */
    getCroppedImageLarge() {
        const img = document.getElementById('crop-image-large');
        if (!img) return null;

        // Create a temporary canvas to draw the cropped image
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');

        // Set the output size (square for avatar)
        const outputWidth = 400;
        const outputHeight = 400;
        cropCanvas.width = outputWidth;
        cropCanvas.height = outputHeight;

        // Calculate the scale and offset for the output
        const baseScale = Math.max(outputWidth / img.width, outputHeight / img.height);
        const scale = baseScale * this.zoom;
        const maxOffsetX = Math.max(0, (img.width * scale - outputWidth) / 2);
        const maxOffsetY = Math.max(0, (img.height * scale - outputHeight) / 2);
        const offsetX = this.offset.x * maxOffsetX;
        const offsetY = this.offset.y * maxOffsetY;

        // Calculate the draw position to center the image
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const cx = outputWidth / 2 + offsetX;
        const cy = outputHeight / 2 + offsetY;

        // Draw the image onto the crop canvas
        cropCtx.drawImage(img, cx - drawWidth / 2, cy - drawHeight / 2, drawWidth, drawHeight);

        return cropCanvas.toDataURL('image/jpeg', 0.85);
    },

    /**
     * Update the header avatar with the new image
     */
    updateHeaderAvatar(imageUrl) {
        const headerAvatar = document.querySelector('.top-bar .avatar img');
        if (headerAvatar) {
            headerAvatar.src = imageUrl;
            headerAvatar.onerror = () => {
                // Fallback to default avatar if the custom one fails
                headerAvatar.src = 'https://github.com/d4m-dev/media/raw/main/ThuVienChinh/favicon/favicon-32x32.png';
            };
        }
    },

    /**
     * Show color picker modal for customizing primary color
     */
    showColorPickerModal() {
        let modal = document.getElementById('color-picker-modal');

        const colors = [
            '#2962ff', '#e91e63', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', // Basic
            '#FF512F', '#DD2476', '#1CB5E0', '#8E2DE2', '#00c6ff', '#fc4a1a'  // Vibrant/Gradient
        ];

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'color-picker-modal';
            modal.className = 'modal-overlay';

            const currentColor = this.state.customPrimaryColor || '#2962ff';
            const colorOptionsHtml = colors.map(c =>
                `<div class="color-option" data-color="${c}" style="width: 40px; height: 40px; border-radius: 50%; background: ${c}; cursor: pointer; border: 2px solid ${currentColor === c ? 'white' : 'transparent'};"></div>`
            ).join('');

            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 85vh; overflow-y: auto; border-radius: 16px; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Tùy chỉnh màu sắc</h3>
                        <button class="btn-close-modal" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); border: none; color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div style="margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                            <label for="color-picker" style="flex: 1; color: var(--text-main);">Chọn màu chủ đạo:</label>
                            <input type="color" id="color-picker" value="${this.state.customPrimaryColor || '#2962ff'}"
                                   style="width: 50px; height: 40px; border: none; border-radius: 8px; cursor: pointer;">
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px;">
                            ${colorOptionsHtml}
                        </div>
                    </div>
                    <div style="margin-bottom: 24px; padding: 15px; background: var(--bg-secondary); border-radius: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <div style="font-weight: 600; color: var(--text-main);">Tự động (thay đổi theo bài hát)</div>
                                <div style="font-size: 13px; color: var(--text-sub);">Màu chủ đề sẽ thay đổi theo ảnh bìa bài hát</div>
                            </div>
                            <div class="toggle-switch ${this.state.autoThemeByCover ? 'active' : ''}" id="auto-theme-cover-toggle-modal" style="cursor: pointer;"></div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn-close-modal" id="btn-cancel-color" style="flex: 1; background: rgba(255,255,255,0.05);">Hủy</button>
                        <button id="btn-save-color" style="flex: 1; background: var(--primary); color: white; padding: 12px; border-radius: 12px; font-weight: 600;">Lưu</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            const currentColor = this.state.customPrimaryColor || '#2962ff';
            document.getElementById('color-picker').value = currentColor;
            // Update color option selections
            document.querySelectorAll('.color-option').forEach(option => {
                option.style.border = option.dataset.color === currentColor ? '2px solid white' : '2px solid transparent';
            });
            
            // Update the toggle switch state
            const autoThemeToggle = document.getElementById('auto-theme-cover-toggle-modal');
            if (autoThemeToggle) {
                autoThemeToggle.classList.toggle('active', this.state.autoThemeByCover);
            }
        }

        // Show the modal
        modal.classList.add('show');

        // Add event listeners
        const colorPicker = document.getElementById('color-picker');
        const colorOptions = document.querySelectorAll('.color-option');
        const btnCancel = document.getElementById('btn-cancel-color');
        const btnSave = document.getElementById('btn-save-color');
        const autoThemeToggle = document.getElementById('auto-theme-cover-toggle-modal');

        // Update color picker when color option is clicked
        colorOptions.forEach(option => {
            option.onclick = () => {
                colorPicker.value = option.dataset.color;
                // Update selection indicators
                colorOptions.forEach(opt => {
                    opt.style.border = opt.dataset.color === option.dataset.color ? '2px solid white' : '2px solid transparent';
                });
                
                // Apply the color immediately if auto theme by cover is disabled
                if (!this.state.autoThemeByCover) {
                    this.setCustomPrimaryColor(option.dataset.color);
                } else {
                    // If auto theme by cover is enabled, still update the custom color for when it's turned off
                    this.state.customPrimaryColor = option.dataset.color;
                    localStorage.setItem('customPrimaryColor', option.dataset.color);
                }
            };
        });

        // Update color option selection when color picker changes
        colorPicker.oninput = () => {
            colorOptions.forEach(opt => {
                opt.style.border = opt.dataset.color === colorPicker.value ? '2px solid white' : '2px solid transparent';
            });
            
            // Apply the color immediately if auto theme by cover is disabled
            if (!this.state.autoThemeByCover) {
                this.setCustomPrimaryColor(colorPicker.value);
            } else {
                // If auto theme by cover is enabled, still update the custom color for when it's turned off
                this.state.customPrimaryColor = colorPicker.value;
                localStorage.setItem('customPrimaryColor', colorPicker.value);
            }
        };

        // Handle the auto theme by cover toggle
        if (autoThemeToggle) {
            autoThemeToggle.onclick = () => {
                // Toggle the auto theme by cover setting
                this.state.autoThemeByCover = !this.state.autoThemeByCover;
                localStorage.setItem('autoThemeByCover', this.state.autoThemeByCover);
                
                // Update UI to reflect the change
                autoThemeToggle.classList.toggle('active', this.state.autoThemeByCover);
                
                // Apply the theme change immediately
                if (this.state.autoThemeByCover && this.state.playlist[this.state.currentIndex]) {
                    // Apply dynamic color from current song's artwork
                    this.applyDynamicUIColors(this.state.playlist[this.state.currentIndex].artwork);
                } else if (!this.state.autoThemeByCover && this.state.customPrimaryColor) {
                    // Revert to custom color if available
                    this.setCustomPrimaryColor(this.state.customPrimaryColor);
                } else if (!this.state.autoThemeByCover) {
                    // If no custom color is set, revert to default
                    this.setCustomPrimaryColor('#2962ff'); // Default color
                }
                
                // Update range inputs and all UI elements to reflect the new color
                setTimeout(() => {
                    this.updateAllRangeInputs();
                    this.updateMuteUI();
                    this.updateHeartButton();
                    
                    // Update navigation elements to reflect the new color
                    if (this.state.autoThemeByCover && this.state.playlist[this.state.currentIndex]) {
                        // Apply dynamic color from current song's artwork
                        this.applyDynamicUIColors(this.state.playlist[this.state.currentIndex].artwork);
                    } else if (!this.state.autoThemeByCover && this.state.customPrimaryColor) {
                        // Revert to custom color if available
                        this.applyColorToUIElements(this.state.customPrimaryColor);
                    } else if (!this.state.autoThemeByCover) {
                        // If no custom color is set, revert to default
                        this.applyColorToUIElements('#2962ff'); // Default color
                    }
                }, 50); // Small delay to ensure DOM updates
            };
        }

        modal.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.onclick = () => modal.classList.remove('show');
        });

        btnCancel.onclick = () => {
            modal.classList.remove('show');
        };

        btnSave.onclick = () => {
            const selectedColor = colorPicker.value;
            this.setCustomPrimaryColor(selectedColor);
            
            // If auto theme by cover is enabled, apply it immediately
            if (this.state.autoThemeByCover && this.state.playlist[this.state.currentIndex]) {
                this.applyDynamicUIColors(this.state.playlist[this.state.currentIndex].artwork);
            }
            
            modal.classList.remove('show');
            this.showToast('Đã cập nhật màu sắc');
        };

        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        };
    },

    /**
     * Set custom primary color
     */
    setCustomPrimaryColor(color) {
        this.state.customPrimaryColor = color;
        localStorage.setItem('customPrimaryColor', color);

        // Update CSS variables
        document.documentElement.style.setProperty('--primary', color);
        document.documentElement.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${color} 0%, ${this.darkenColor(color, 30)} 100%)`);

        // Update theme if light theme is active
        if (this.state.theme === 'light') {
            document.documentElement.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${this.lightenColor(color, 20)} 0%, ${color} 100%)`);
        }

        // Apply color to progress bar, volume bar, and other UI elements
        this.applyColorToUIElements(color);
        this.updateMuteUI();
        this.updateHeartButton();

        // Re-render settings to update status indicators
        if (this.state.currentNav === 3) { // Assuming 3 is the settings page
            this.renderSettings();
        }

        // Update range inputs to reflect the new color
        this.updateAllRangeInputs();
    },

    /**
     * Apply primary color to all UI elements that should match
     */
    applyColorToUIElements(color) {
        // Update CSS variable for primary color
        document.documentElement.style.setProperty('--primary', color);

        // Update the range input styles to use the new primary color
        this.updateAllRangeInputs();
        this.updateMuteUI();
        this.updateHeartButton();

        // Apply to mini player progress fill
        const miniFill = document.getElementById('mini-fill');
        if (miniFill) {
            miniFill.style.background = color;
        }

        // Apply to other progress indicators
        const progressFills = document.querySelectorAll('.progress-fill');
        progressFills.forEach(fill => {
            fill.style.background = color;
        });

        // Apply to active elements like active buttons, etc.
        const activeElements = document.querySelectorAll('.active, .btn.active, .tab-btn.active');
        activeElements.forEach(el => {
            if (el.style) {
                el.style.setProperty('--primary', color, 'important');
            }
        });

        // Update navigation buttons to ensure they reflect the primary color when active
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(nav => {
            // If the nav link is active, make sure it reflects the primary color
            // If inactive, set to default text color
            const icon = nav.querySelector('i');
            const span = nav.querySelector('span');
            
            if (nav.classList.contains('active')) {
                if (icon) icon.style.color = color;
                if (span) span.style.color = color;
            } else {
                if (icon) icon.style.color = 'var(--text-sub)'; // Gray color for inactive
                if (span) span.style.color = 'var(--text-sub)'; // Gray color for inactive
            }
        });

        // Update any other elements that use the primary color
        this.updatePrimaryColorElements(color);

        // Update range inputs to reflect the new color
        this.updateAllRangeInputs();
    },

    /**
     * Update elements that use primary color
     */
    updatePrimaryColorElements(color) {
        // Update any elements that might be using primary color directly
        const elementsWithPrimary = document.querySelectorAll('[style*="--primary"], [style*="var(--primary)"]');
        elementsWithPrimary.forEach(el => {
            let style = el.getAttribute('style') || '';
            if (style.includes('var(--primary)') || style.includes(color)) {
                // Re-apply the style to ensure it updates
                el.style.setProperty('--primary', color);
            }
        });
    },

    /**
     * Lighten a color
     */
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
                (G<255?G<1?0:G:255)*0x100 +
                (B<255?B<1?0:B:255)).toString(16).slice(1);
    },

    /**
     * Darken a color
     */
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R>255?255:R<0?0:R)*0x10000 +
                (G>255?255:G<0?0:G)*0x100 +
                (B>255?255:B<0?0:B)).toString(16).slice(1);
    },

    /**
     * Get display name for font
     */
    getFontDisplayName(fontFamily) {
        const fontNames = {
            'Urbanist': 'Mặc định',
            'Roboto': 'Roboto',
            'Inter': 'Inter',
            'Poppins': 'Poppins',
            'Montserrat': 'Montserrat',
            'Open Sans': 'Open Sans',
            'Nunito': 'Nunito',
            'Lato': 'Lato',
            'Source Sans Pro': 'Source Sans Pro',
            'Noto Sans': 'Noto Sans',
            'Be Vietnam Pro': 'Be Vietnam',
            'LXGW WenKai Mono TC': 'LXGW WenKai Mono TC',
            'Roboto Slab': 'Roboto Slab',
            'Playpen Sans': 'Playpen Sans',
            'Dancing Script': 'Dancing Script',
            'Jura': 'Jura',
            'Protest Revolution': 'Protest Revolution',
            'Cormorant SC': 'Cormorant SC'
        };
        return fontNames[fontFamily] || fontFamily || 'MẶC ĐỊNH';
    },

    /**
     * Get display name for layout
     */
    getLayoutDisplayName(layoutMode) {
        const layoutNames = {
            'standard': 'Tiêu chuẩn',
            'compact': 'Gọn nhẹ',
            'spacious': 'Rộng rãi',
            'minimal': 'Tối giản'
        };
        return layoutNames[layoutMode] || layoutMode || 'TIÊU CHUẨN';
    },

    /**
     * Show font selector modal
     */
    showFontSelectorModal() {
        let modal = document.getElementById('font-selector-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'font-selector-modal';
            modal.className = 'modal-overlay';
            // Create the modal content with proper template literal handling
            const fontFamily = this.state.fontFamily;
            const fontWeight = this.state.fontWeight || '400';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 85vh; overflow-y: auto; border-radius: 16px; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Tùy chỉnh phông chữ</h3>
                        <button class="btn-close-modal" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-secondary); border: none; color: var(--text-main); display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div style="margin-bottom: 24px;">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 10px; color: var(--text-main);">Phông chữ:</label>
                            <select id="font-selector" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--bg-secondary); color: var(--text-main); border: 1px solid var(--border); font-size: 16px;">
                                <option value="Urbanist" ` + (fontFamily === 'Urbanist' ? 'selected' : '') + `>Urbanist (Mặc định)</option>
                                <option value="LXGW WenKai Mono TC" ` + (fontFamily === 'LXGW WenKai Mono TC' ? 'selected' : '') + `>LXGW WenKai Mono TC (Đẹp & Hiện đại)</option>
                                <option value="Roboto Slab" ` + (fontFamily === 'Roboto Slab' ? 'selected' : '') + `>Roboto Slab (Chữ in đậm & Rõ ràng)</option>
                                <option value="Playpen Sans" ` + (fontFamily === 'Playpen Sans' ? 'selected' : '') + `>Playpen Sans (Thư pháp & Trẻ trung)</option>
                                <option value="Dancing Script" ` + (fontFamily === 'Dancing Script' ? 'selected' : '') + `>Dancing Script (Thư pháp & Nghệ thuật)</option>
                                <option value="Jura" ` + (fontFamily === 'Jura' ? 'selected' : '') + `>Jura (Hiện đại & Sạch sẽ)</option>
                                <option value="Protest Revolution" ` + (fontFamily === 'Protest Revolution' ? 'selected' : '') + `>Protest Revolution (Cách mạng & Độc đáo)</option>
                                <option value="Cormorant SC" ` + (fontFamily === 'Cormorant SC' ? 'selected' : '') + `>Cormorant SC (Trang nhã & Cổ điển)</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 10px; color: var(--text-main);">Độ đậm:</label>
                            <select id="font-weight-selector" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--bg-secondary); color: var(--text-main); border: 1px solid var(--border); font-size: 16px;">
                                <option value="300" ` + (fontWeight === '300' ? 'selected' : '') + `>300 - Nhạt</option>
                                <option value="400" ` + (fontWeight === '400' ? 'selected' : '') + `>400 - Thường</option>
                                <option value="500" ` + (fontWeight === '500' ? 'selected' : '') + `>500 - Trung bình</option>
                                <option value="600" ` + (fontWeight === '600' ? 'selected' : '') + `>600 - Đậm vừa</option>
                                <option value="700" ` + (fontWeight === '700' ? 'selected' : '') + `>700 - ��ậm</option>
                                <option value="800" ` + (fontWeight === '800' ? 'selected' : '') + `>800 - Rất đ���m</option>
                                <option value="900" ` + (fontWeight === '900' ? 'selected' : '') + `>900 - Cực đậm</option>
                            </select>
                        </div>
                        
                        <div style="padding: 15px; background: var(--bg-secondary); border-radius: 8px; margin-top: 15px;">
                            <p style="margin: 0; font-size: 18px;" id="font-preview">Việt Nam Vinh Quang, bản quyền thuộc về d4m-dev</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button class="btn-close-modal" id="btn-cancel-font" style="flex: 1; background: rgba(255,255,255,0.05);">Hủy</button>
                        <button id="btn-save-font" style="flex: 1; background: var(--primary); color: white; padding: 12px; border-radius: 12px; font-weight: 600;">Lưu</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            const fontFamily = this.state.fontFamily || 'Urbanist';
            const fontWeight = this.state.fontWeight || '400';
            document.getElementById('font-selector').value = fontFamily;
            document.getElementById('font-weight-selector').value = fontWeight;
            document.getElementById('font-preview').style.fontFamily = fontFamily;
            document.getElementById('font-preview').style.fontWeight = fontWeight;
            document.getElementById('font-preview').textContent = 'Việt Nam Vinh Quang, bản quyền thuộc về d4m-dev';
        }

        // Show the modal
        modal.classList.add('show');

        // Add event listeners
        const fontSelector = document.getElementById('font-selector');
        const fontWeightSelector = document.getElementById('font-weight-selector');
        const fontPreview = document.getElementById('font-preview');
        const btnCancel = document.getElementById('btn-cancel-font');
        const btnSave = document.getElementById('btn-save-font');

        // Update preview when font changes
        fontSelector.onchange = () => {
            const selectedFont = fontSelector.value;
            fontPreview.style.fontFamily = selectedFont;
            fontPreview.textContent = 'Việt Nam Vinh Quang, bản quyền thuộc về d4m-dev';
            
            // Temporarily load the font for preview if not already loaded
            if (selectedFont !== 'Urbanist') {
                const fontRuleId = `preview-${selectedFont.replace(/\s+/g, '-').toLowerCase()}`;
                if (!document.getElementById(fontRuleId)) {
                    // Create a temporary font rule for preview
                    const style = document.createElement('style');
                    style.id = fontRuleId;
                    
                    // Determine the correct path based on font family
                    let fontStylePath = '';
                    switch(selectedFont) {
                        case 'LXGW WenKai Mono TC':
                            fontStylePath = 'font-style/LXGW_WenKai_Mono_TC/LXGWWenKaiMonoTC-Regular.ttf';
                            break;
                        case 'Roboto Slab':
                            fontStylePath = 'font-style/Roboto_Slab/RobotoSlab-VariableFont_wght.ttf';
                            break;
                        case 'Playpen Sans':
                            fontStylePath = 'font-style/Playpen_Sans/PlaypenSans-VariableFont_wght.ttf';
                            break;
                        case 'Dancing Script':
                            fontStylePath = 'font-style/Dancing_Script/DancingScript-VariableFont_wght.ttf';
                            break;
                        case 'Jura':
                            fontStylePath = 'font-style/Jura/Jura-VariableFont_wght.ttf';
                            break;
                        case 'Protest Revolution':
                            fontStylePath = 'font-style/Protest_Revolution/ProtestRevolution-Regular.ttf';
                            break;
                        case 'Cormorant SC':
                            fontStylePath = 'font-style/Cormorant_SC/CormorantSC-Regular.ttf';
                            break;
                        default:
                            const dirName = selectedFont.replace(/\s+/g, '_');
                            fontStylePath = `font-style/${dirName}/${dirName}-Regular.ttf`;
                    }
                    
                    style.textContent = `
                        @font-face {
                            font-family: '${selectedFont}';
                            src: url('src/${fontStylePath}') format('truetype');
                            font-weight: normal;
                            font-style: normal;
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        };

        // Update preview when font weight changes
        fontWeightSelector.onchange = () => {
            fontPreview.style.fontWeight = fontWeightSelector.value;
        };

        modal.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.onclick = () => modal.classList.remove('show');
        });

        btnCancel.onclick = () => {
            modal.classList.remove('show');
        };

        btnSave.onclick = () => {
            const selectedFont = fontSelector.value;
            const selectedWeight = fontWeightSelector.value;
            
            this.setFontFamily(selectedFont, selectedWeight);
            modal.classList.remove('show');
            this.showToast('Đã cập nhật phông chữ');
        };

        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        };
    },

    /**
     * Load local font using @font-face
     */
    loadLocalFont(fontFamily) {
        // Define font file paths based on font family
        let fontStylePath = '';
        let fontFiles = [];
        
        switch(fontFamily) {
            case 'LXGW WenKai Mono TC':
                fontFiles = [
                    { weight: '300', file: 'LXGWWenKaiMonoTC-Light.ttf' },
                    { weight: '400', file: 'LXGWWenKaiMonoTC-Regular.ttf' },
                    { weight: '700', file: 'LXGWWenKaiMonoTC-Bold.ttf' }
                ];
                fontStylePath = 'font-style/LXGW_WenKai_Mono_TC/';
                break;
            case 'Roboto Slab':
                // Use variable font
                fontFiles = [
                    { weight: '100 900', file: 'RobotoSlab-VariableFont_wght.ttf' }
                ];
                fontStylePath = 'font-style/Roboto_Slab/';
                break;
            case 'Playpen Sans':
                // Use variable font
                fontFiles = [
                    { weight: '400', file: 'PlaypenSans-VariableFont_wght.ttf' }
                ];
                fontStylePath = 'font-style/Playpen_Sans/';
                break;
            case 'Dancing Script':
                // Use variable font
                fontFiles = [
                    { weight: '400', file: 'DancingScript-VariableFont_wght.ttf' }
                ];
                fontStylePath = 'font-style/Dancing_Script/';
                break;
            case 'Jura':
                // Use variable font
                fontFiles = [
                    { weight: '100 700', file: 'Jura-VariableFont_wght.ttf' }
                ];
                fontStylePath = 'font-style/Jura/';
                break;
            case 'Protest Revolution':
                fontFiles = [
                    { weight: '400', file: 'ProtestRevolution-Regular.ttf' }
                ];
                fontStylePath = 'font-style/Protest_Revolution/';
                break;
            case 'Cormorant SC':
                fontFiles = [
                    { weight: '300', file: 'CormorantSC-Light.ttf' },
                    { weight: '400', file: 'CormorantSC-Regular.ttf' },
                    { weight: '500', file: 'CormorantSC-Medium.ttf' },
                    { weight: '600', file: 'CormorantSC-SemiBold.ttf' },
                    { weight: '700', file: 'CormorantSC-Bold.ttf' }
                ];
                fontStylePath = 'font-style/Cormorant_SC/';
                break;
            default:
                // For other fonts, try to map them to similar directory structure
                const dirName = fontFamily.replace(/\s+/g, '_');
                fontFiles = [
                    { weight: '400', file: `${dirName}-Regular.ttf` }
                ];
                fontStylePath = `font-style/${dirName}/`;
        }
        
        // Create @font-face rules for each font file using CSS injection
        fontFiles.forEach(font => {
            // Check if this specific font face rule already exists to prevent duplicates
            const existingStyle = Array.from(document.head.querySelectorAll('style')).find(style => 
                style.textContent.includes(`font-family: '${fontFamily}'`) && 
                style.textContent.includes(`url('src/${fontStylePath}${font.file}')`)
            );
            
            if (!existingStyle) {
                const style = document.createElement('style');
                style.textContent = `
                    @font-face {
                        font-family: '${fontFamily}';
                        src: url('src/${fontStylePath}${font.file}') format('truetype');
                        font-weight: ${font.weight};
                        font-style: normal;
                    }
                `;
                document.head.appendChild(style);
                
                // Preload the font by creating a temporary element
                const preloadSpan = document.createElement('span');
                preloadSpan.style.fontFamily = fontFamily;
                preloadSpan.style.visibility = 'hidden';
                preloadSpan.style.position = 'absolute';
                preloadSpan.textContent = 'preload';
                document.body.appendChild(preloadSpan);
                
                // Remove the preload element after a short delay
                setTimeout(() => {
                    if (preloadSpan.parentNode) {
                        preloadSpan.parentNode.removeChild(preloadSpan);
                    }
                }, 100);
            }
        });
    },

    /**
     * Set font family and weight
     */
    setFontFamily(fontFamily, fontWeight = '400') {
        this.state.fontFamily = fontFamily;
        this.state.fontWeight = fontWeight;
        
        localStorage.setItem('fontFamily', fontFamily);
        localStorage.setItem('fontWeight', fontWeight);

        // Update CSS
        document.documentElement.style.setProperty('font-family', `${fontFamily}, sans-serif`);
        document.documentElement.style.setProperty('font-weight', fontWeight);

        // Load the font if it's not the default
        if (fontFamily !== 'Urbanist') {
            this.loadLocalFont(fontFamily);
        }

        // Apply font to all elements that might not inherit it properly
        this.applyFontToAllElements(fontFamily, fontWeight);

        // Re-render settings to update status indicators
        if (this.state.currentNav === 3) { // Assuming 3 is the settings page
            this.renderSettings();
        }
    },
    
    /**
     * Apply font to all elements that might not inherit it properly
     */
    applyFontToAllElements(fontFamily, fontWeight = '400') {
        // Apply font to common text elements that might not inherit from root
        const elements = document.querySelectorAll(`
            body, div, p, span, h1, h2, h3, h4, h5, h6, 
            button, input, textarea, select, label, 
            a, li, td, th, caption, figcaption,
            .text-h1, .text-h2, .track-title, .track-artist, 
            .mini-title, .mini-status, .settings-name, .settings-desc,
            #full-title, #full-artist, #mini-title, #mini-artist,
            .lyric-row, .history-title, .history-artist,
            .list-header h2, .list-header p,
            .modal-content, .settings-item, .chip,
            .tab-btn, .vol-wrapper, .controls-row,
            .progress-container, .slider-group,
            .bottom-nav, .nav-link, .nav-link span,
            .top-bar, .logo, .avatar,
            .search-box input, .search-box,
            .chips-row, .chips-wrapper,
            .player-controls, .meta-info,
            .marquee-content, .marquee-wrapper,
            .options-menu, .menu-item,
            .toast, .toast-msg,
            .context-menu, .context-queue-container,
            .queue-item, .queue-header, .queue-list,
            .swipe-hint-text, .swipe-hint-icon,
            .status-indicator, .toggle-switch,
            .btn-icon, .btn-close-modal,
            .timer-btn, .dl-btn, .preset-btn,
            .eq-slider, .presets-section,
            .keypad-container, .keypad-btn,
            .audio-controls, .eq-controls,
            .reset-warning, .warning,
            .explore-title, .section-header,
            .btn-see-all, .history-item,
            .settings-section, .settings-title
        `);
        
        elements.forEach(element => {
            element.style.fontFamily = `${fontFamily}, sans-serif`;
            element.style.fontWeight = fontWeight;
        });
        
        // Specifically target bottom navigation elements to ensure proper font application
        const navLinks = document.querySelectorAll('.nav-link, .nav-link span');
        navLinks.forEach(element => {
            element.style.fontFamily = `${fontFamily}, sans-serif`;
            element.style.fontWeight = fontWeight;
        });
        
        // Also update the root element to ensure inheritance
        document.documentElement.style.setProperty('font-family', `${fontFamily}, sans-serif`);
        document.documentElement.style.setProperty('font-weight', fontWeight);
        
        // Refresh the lyrics canvas if it exists to apply the new font
        if (this.lyricsCanvas && this.isLyricsCanvasActive) {
            const activeId = this.getCurrentLyricId(); // Get current active lyric ID
            this.updateLyricsCanvas(activeId);
        }
    },
    
    /**
     * Get current active lyric ID based on current time
     */
    getCurrentLyricId() {
        if (!this.lyricsData || !this.lyricsData.length) return null;
        
        let currentTime = 0;
        if (this.currentSongHasVideo) {
            currentTime = this.video.currentTime;
        } else if (this.state.isBeatMode) {
            currentTime = this.beatAudio.currentTime;
        } else {
            currentTime = this.audio.currentTime;
        }
        
        let activeId = null;
        for (let i = 0; i < this.lyricsData.length; i++) {
            if (this.lyricsData[i].time <= currentTime) activeId = this.lyricsData[i].id;
            else break;
        }
        
        return activeId;
    },

    /**
     * Check if Pro features are unlocked, if not show keypad
     */
    checkProAccess(callback) {
        if (this.state.isProUnlocked) {
            callback();
        } else {
            this.showUnlockModal(callback);
        }
    },

    /**
     * Show Unlock Modal with Keypad
     */
    showUnlockModal(callback) {
        let modal = document.getElementById('unlock-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'unlock-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 300px; width: 90%; border-radius: 24px; padding: 24px;">
                    <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; text-align: center;">Nhập mã mở khóa</h3>
                    <div style="margin-bottom: 20px;">
                        <input type="password" id="unlock-code-input" placeholder="PIN" readonly style="width: 100%; padding: 15px; border-radius: 16px; background: var(--bg-secondary); color: var(--text-main); border: 1px solid var(--border); text-align: center; font-size: 24px; letter-spacing: 5px; margin-bottom: 20px; outline: none;">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                            ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="unlock-key" data-key="${n}" style="padding: 15px; border-radius: 14px; background: var(--bg-secondary); color: var(--text-main); font-size: 20px; font-weight: 600; border: 1px solid var(--border);">${n}</button>`).join('')}
                            <button class="unlock-key" data-key="C" style="padding: 15px; border-radius: 14px; background: rgba(255, 71, 87, 0.1); color: #ff4757; font-size: 18px; font-weight: 700; border: 1px solid rgba(255, 71, 87, 0.2);">C</button>
                            <button class="unlock-key" data-key="0" style="padding: 15px; border-radius: 14px; background: var(--bg-secondary); color: var(--text-main); font-size: 20px; font-weight: 600; border: 1px solid var(--border);">0</button>
                            <button class="unlock-key" data-key="OK" style="padding: 15px; border-radius: 14px; background: var(--primary); color: white; font-size: 18px; font-weight: 700; border: none;">OK</button>
                        </div>
                    </div>
                    <button class="btn-close-modal" style="width: 100%; padding: 12px; background: transparent; color: var(--text-sub); font-weight: 600; border: none;">Hủy bỏ</button>
                </div>
            `;
            document.body.appendChild(modal);
            
            const input = document.getElementById('unlock-code-input');
            modal.querySelectorAll('.unlock-key').forEach(btn => {
                btn.onclick = () => {
                    const key = btn.dataset.key;
                    if (key === 'C') input.value = '';
                    else if (key === 'OK') {
                        if (input.value === '5555') {
                            this.state.isProUnlocked = true;
                            localStorage.setItem('isProUnlocked', 'true');
                            this.showToast('Đã mở khóa tính năng Pro');
                            modal.classList.remove('show');
                            if (this.pendingUnlockCallback) this.pendingUnlockCallback();
                        } else {
                            this.showToast('Mã không đúng');
                            input.value = '';
                            modal.classList.add('shake');
                            setTimeout(() => modal.classList.remove('shake'), 500);
                        }
                    } else {
                        if (input.value.length < 4) input.value += key;
                    }
                };
            });
            
            modal.querySelector('.btn-close-modal').onclick = () => modal.classList.remove('show');
            modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('show'); };
        }
        
        this.pendingUnlockCallback = callback;
        document.getElementById('unlock-code-input').value = '';
        modal.classList.add('show');
    },

    // --- UI RENDERING & UPDATES (tiếp theo) ---
    /**
     * Kiểm tra và kích hoạt hiệu ứng marquee cho tiêu đề bài hát nếu quá dài.
     */
    checkMarquee() {
        const t = document.getElementById('full-title');
        const b = t ? t.closest('.marquee-wrapper') : null;
        if (!t || !b) return;

        t.parentElement.classList.remove('animate'); void t.offsetWidth;
        
        if (t.scrollWidth > b.clientWidth) { 
            t.parentElement.classList.add('animate'); 
            if (!t.getAttribute('d')) { t.innerHTML += ` &nbsp; • &nbsp; ${t.innerHTML}`; t.setAttribute('d', '1'); } 
        }
    },
    /**
     * Hiển thị thông báo toast.
     * @param {string} msg - Nội dung thông báo.
     */
    showToast(msg) { this.elements.toastMsg.innerText = msg; this.elements.toast.classList.add('show'); setTimeout(() => this.elements.toast.classList.remove('show'), 3000); },
    /**
     * Chuyển đổi giữa các mục điều hướng chính (Trang chủ, Khám phá, Yêu thích).
     * @param {number} i - Chỉ số của mục điều hướng.
     */
    switchNavigation(i) {
        if (this.state.currentNav === i) return;

        this.elements.list.style.opacity = '0';
        this.elements.list.style.transform = 'translateY(10px)';

        setTimeout(() => {
            document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active')); document.querySelectorAll('.nav-link')[i].classList.add('active');

            this.state.currentNav = i; this.state.currentFilter = 'all'; this.state.searchQuery = '';
            const titles = ['Danh sách phát', 'Khám phá', 'Bài hát yêu thích', 'Cài đặt'];
            const subtitles = [
                'Cập nhật hôm nay • Dành riêng cho bạn',
                'Khám phá các thể loại nhạc mới',
                'Danh sách bài hát bạn yêu thích',
                'Tùy chỉnh cài đặt ứng dụng'
            ];

            document.querySelector('.list-header h2').innerText = titles[i];
            const subtitleEl = document.querySelector('.list-header p');
            if (subtitleEl) subtitleEl.innerText = subtitles[i];

            document.getElementById('sort-controls').style.display = (i===0) ? 'flex' : 'none';
            this.elements.searchInput.placeholder = i === 3 ? 'Tìm kiếm cài đặt...' : 'Tìm kiếm bài hát, nghệ sĩ...';

            const chips = document.querySelector('.chips-wrapper');
            if (chips) chips.style.display = 'none';

            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            const chip = document.querySelector('.chip');
            if (chip) chip.classList.add('active');

            if (i===2) this.state.currentFilter = 'favorites';

            if (i === 1) this.renderExplore();
            else if (i === 3) this.renderSettings();
            else this.renderPlaylist();

            if (this.elements.scrollContainer) this.elements.scrollContainer.scrollTop = 0;

            this.elements.list.style.opacity = '1';
            this.elements.list.style.transform = 'translateY(0)';

            // Close the player overlay when navigating to any section to prevent empty player
            // The overlay should only be opened intentionally by user interaction
            this.elements.overlay.classList.remove('open');

            // Update navigation colors to reflect the active/inactive state
            const navLinks = document.querySelectorAll('.nav-link');
            const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2962ff';
            
            navLinks.forEach((nav, index) => {
                const icon = nav.querySelector('i');
                const span = nav.querySelector('span');
                
                if (index === i) {
                    // Active navigation item
                    if (icon) icon.style.color = primaryColor;
                    if (span) span.style.color = primaryColor;
                } else {
                    // Inactive navigation item
                    if (icon) icon.style.color = 'var(--text-sub)';
                    if (span) span.style.color = 'var(--text-sub)';
                }
            });

            // Ensure search bar visibility is handled correctly after navigation
            setTimeout(() => {
                const searchWrapper = this.elements.searchInput.closest('.search-wrapper') || this.elements.searchInput.parentElement;
                if (this.elements.scrollContainer.scrollTop > 60) {
                    searchWrapper.classList.add('hidden');
                } else {
                    searchWrapper.classList.remove('hidden');
                }
            }, 250); // Slightly after the animation completes
        }, 200);
    },
    changeSortOrder(s) { this.state.sortBy = s; document.querySelectorAll('.btn-sort').forEach(b => b.classList.remove('active')); document.querySelector(`[data-sort="${s}"]`).classList.add('active'); this.renderPlaylist(); },
    
    /**
     * Share current song to social media
     */
    async shareCurrentSong() {
        const currentSong = this.state.playlist[this.state.currentIndex];
        if (!currentSong) return;

        const shareData = {
            title: currentSong.name,
            text: `Nghe bài "${currentSong.name}" bởi ${currentSong.artist} trên Music Pro Ultimate`,
            url: window.location.href
        };

        // Check if Web Share API is supported
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                this.showToast('Đã chia sẻ bài hát!');
            } catch (err) {
                console.error('Error sharing:', err);
                this.copyShareLink(); // Fallback to copying link
            }
        } else {
            // Fallback: copy link to clipboard
            this.copyShareLink();
        }
    },

    /**
     * Copy share link to clipboard
     */
    copyShareLink() {
        const currentSong = this.state.playlist[this.state.currentIndex];
        if (!currentSong) return;

        const shareText = `Nghe bài "${currentSong.name}" bởi ${currentSong.artist} trên Music Pro Ultimate\n${window.location.href}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                this.showToast('Liên kết đã được sao chép!');
            }).catch(() => {
                this.fallbackCopyText(shareText);
            });
        } else {
            this.fallbackCopyText(shareText);
        }
    },

    /**
     * Fallback method to copy text to clipboard
     */
    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.showToast('Liên kết đã được sao chép!');
    },

    /**
     * Reset toàn bộ ứng dụng về cài đặt gốc.
     */
    resetApp() {
        // Clear all localStorage data
        localStorage.clear();

        // Show confirmation message
        this.showToast('Đã khôi phục cài đặt gốc thành công!');

        // Reload the page after a short delay
        setTimeout(() => {
            location.reload();
        }, 1500);
    },


};
