// 🎵 D4M: id bài hát là folder-slug từ backend -> playlist chủ đề suy theo TÊN BÀI
window.PLAYLIST_REMIX = []; window.PLAYLIST_TET = []; window.PLAYLIST_LOFI = [];
(function () {
    const by = (re) => (window.app?.state?.playlist || [])
        .filter(t => re.test((t.name || "") + " " + (t.artist || ""))).map(t => String(t.id));
    const rebuild = () => {
        if (!window.app?.state?.playlist?.length) return false;
        window.PLAYLIST_REMIX = by(/remix|mix\s|dj\b|nonstop|vinahouse/i);
        window.PLAYLIST_TET   = by(/tết|tet\b|xuân|xuan\b|chúc\s*xuân|nhà\s*nhà/i);
        window.PLAYLIST_LOFI  = by(/lofi|lo-fi|chill\b|acoustic|piano/i);
        return true;
    };
    const t = setInterval(() => { if (rebuild()) { clearInterval(t); try { window.app.renderPlaylist(); } catch (e) {} } }, 500);
    setTimeout(() => clearInterval(t), 15000);
})();
