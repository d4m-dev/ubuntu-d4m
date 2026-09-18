window.MusicProModules = window.MusicProModules || {};

window.MusicProModules.utils = {
    // --- UTILITIES ---
    /**
     * Định dạng thời gian từ giây sang định dạng "phút:giây".
     * @param {number} s - Thời gian tính bằng giây.
     */
    formatTime(s) { if (isNaN(s)) return "0:00"; const m = Math.floor(s/60), sec = Math.floor(s%60); return `${m}:${sec<10?'0':''}${sec}`; },

    // --- ENHANCED: AUDIO UTILITIES ---
    /**
     * Initialize AudioContext with proper error handling and resume capability
     */
    initAudioContext() {
        if (!window.AudioContext && !window.webkitAudioContext) {
            console.warn('Web Audio API not supported in this browser');
            return null;
        }

        const AudioContext = window.AudioContext || window.webkitAudioContext;

        if (!this.audioContext) {
            try {
                this.audioContext = new AudioContext();
                console.log('AudioContext initialized successfully');
            } catch (e) {
                console.error('Failed to initialize AudioContext:', e);
                return null;
            }
        }

        // Resume if suspended (autoplay policy compliance)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume()
                .then(() => console.log('AudioContext resumed'))
                .catch(e => console.error('Failed to resume AudioContext:', e));
        }

        return this.audioContext;
    },

    /**
     * Create audio processing nodes for equalizer
     */
    createEqualizer() {
        if (!this.audioContext) return null;

        try {
            // Create a chain of BiquadFilter nodes for EQ bands
            const eqBands = [
                { freq: 60,   type: 'lowshelf',  gain: 0 }, // Bass
                { freq: 230,  type: 'peaking',   gain: 0 }, // Low-mid
                { freq: 910,  type: 'peaking',   gain: 0 }, // Mid
                { freq: 3500, type: 'peaking',   gain: 0 }, // Upper-mid
                { freq: 14000, type: 'highshelf', gain: 0 } // Treble
            ];

            const filterNodes = eqBands.map(band => {
                const filter = this.audioContext.createBiquadFilter();
                filter.type = band.type;
                filter.frequency.value = band.freq;
                filter.gain.value = band.gain;
                filter.Q.value = 1;
                return filter;
            });

            // Connect the filter chain
            filterNodes.reduce((prev, curr, index, array) => {
                if (index === 0) return prev;
                prev.connect(curr);
                return curr;
            });

            return { nodes: filterNodes, bands: eqBands };
        } catch (e) {
            console.error('Failed to create equalizer:', e);
            return null;
        }
    },

    /**
     * Apply equalizer settings from UI controls
     */
    applyEqualizer(eqNodes, settings) {
        if (!eqNodes || !eqNodes.nodes || !settings) return;

        try {
            eqNodes.nodes[0].gain.value = settings.low || 0;      // 60Hz
            eqNodes.nodes[1].gain.value = settings.midLow || 0;   // 230Hz
            eqNodes.nodes[2].gain.value = settings.mid || 0;      // 910Hz
            eqNodes.nodes[3].gain.value = settings.midHigh || 0;  // 3.5kHz
            eqNodes.nodes[4].gain.value = settings.high || 0;     // 14kHz
        } catch (e) {
            console.error('Failed to apply equalizer settings:', e);
        }
    },

    /**
     * Create stereo panner for spatial audio
     */
    createSpatialAudio() {
        if (!this.audioContext) return null;

        try {
            const panner = this.audioContext.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;
            panner.coneInnerAngle = 360;
            panner.coneOuterAngle = 0;
            panner.coneOuterGain = 0;
            return panner;
        } catch (e) {
            console.error('Failed to create spatial audio panner:', e);
            return null;
        }
    }
};

// Initialize static properties
window.MusicProModules.utils.audioContext = null;