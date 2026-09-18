const TRACKS_URL = 'src/tracks.js';

// Giữ nguyên hàm chuẩn hóa siêu việt của sếp
const normalizeTracks = (items = []) => items.map((item) => ({
    id: item.id,
    name: item.title || item.name || '',
    artist: item.artist || '',
    artwork: item.cover || item.artwork || '',
    path: item.audioSrc || item.path || '',
    instrumental: item.instrumentalSrc || item.instrumental || '',
    vid: item.videoSrc || item.vid || '',
    lyric: item.lyricSrc || item.lyric || ''
}));

// 🚀 NÂNG CẤP HÀM LOAD DATA: Ưu tiên lấy từ API, nếu sập thì fallback về tracks.js
const loadRemoteTracks = async () => {
    try {
        console.log("⏳ Đang kết nối tới Máy chủ Music Core...");
        const res = await fetch('/api/music/list');
        const data = await res.json();
        
        if (data.status === 'success' && data.songs && data.songs.length > 0) {
            // "Biến hình" dữ liệu API thành cấu trúc tĩnh quen thuộc của sếp
            const apiTracks = data.songs.map(song => {
                return {
                    id: song.id,
                    title: song.title,
                    artist: song.artist,
                    cover: song.cover_api,
                    // Dùng cờ động từ backend để gắn đúng link stream
                    audioSrc: song.flags.vocal ? `/api/music/stream/${song.id}/${song.flags.vocal}` : '',
                    instrumentalSrc: song.flags.beat ? `/api/music/stream/${song.id}/${song.flags.beat}` : '',
                    videoSrc: song.flags.video ? `/api/music/stream/${song.id}/${song.flags.video}` : '',
                    // Trỏ thẳng đến API bóc tách Lyrics của Backend
                    lyricSrc: song.flags.lyrics ? `/api/music/lyrics/${song.id}` : ''
                };
            });
            
            console.log(`✅ Đã đồng bộ thành công ${apiTracks.length} bài hát từ Máy chủ!`);
            return apiTracks;
        }
    } catch (e) { 
        console.error('⚠️ Không thể kết nối API. Kích hoạt chế độ Offline...', e); 
    }

    // 🛡️ CHẾ ĐỘ OFFLINE FALLBACK (Giữ lại logic cũ của sếp)
    if (Array.isArray(window.TRACKS) && window.TRACKS.length) return window.TRACKS;
    try {
        const res = await fetch(TRACKS_URL + '?v=' + Date.now(), { cache: 'no-cache' });
        if (res.ok) {
            const text = await res.text();
            const sandbox = {};
            const getter = new Function('window', `${text}; return window.TRACKS || [];`);
            return getter(sandbox) || [];
        }
    } catch (e) { console.error('Lỗi khi lấy dữ liệu track dự phòng', e); }
    
    return [];
};

window.MusicProModules = window.MusicProModules || {};
window.MusicProModules.helpers = { TRACKS_URL, normalizeTracks, loadRemoteTracks };