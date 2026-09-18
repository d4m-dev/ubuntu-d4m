window.MusicProModules = window.MusicProModules || {};
const __seen = new Set();
window.MusicProModules.tracking = {
    _post(action, song) {
        try {
            fetch("/api/dmusic/library/interact", { method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, song_id: String(song.id) }) }).catch(() => {});
        } catch (e) {}
    },
    reportView(song) { if (!song || __seen.has(song.id)) return; __seen.add(song.id); this._post("view", song); },
    reportDownload(song) { if (song) this._post("download", song); }
};
