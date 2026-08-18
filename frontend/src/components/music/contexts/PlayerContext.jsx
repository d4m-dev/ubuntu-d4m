import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { api } from "../../../api/client";
import { DMUSIC } from "../../../config/urls";
import { useAuth } from "./AuthContext";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const { user } = useAuth();
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = new Audio();

  const [current, setCurrent] = useState(null); // bài đang phát
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false); // 'off' | 'all' | 'one'
  const [lyrics, setLyrics] = useState([]);
  const [lyricsActive, setLyricsActive] = useState(-1);
  const [audioError, setAudioError] = useState(false);

  // ---- refs để tránh stale closure trong next/prev ----
  const queueIndexRef = useRef(-1);
  const queueRef = useRef([]);
  const shuffleRef = useRef(false);
  const repeatRef = useRef(false);
  const viewRecordedRef = useRef(false);
  const nextRef = useRef(null);

  // Đồng bộ ref <-> state
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);

  // ---- volume ----
  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  // ---- audio error handling ----
  useEffect(() => {
    const a = audioRef.current;
    const onError = () => setAudioError(true);
    const onPlaying = () => setAudioError(false);
    a.addEventListener("error", onError);
    a.addEventListener("playing", onPlaying);
    return () => {
      a.removeEventListener("error", onError);
      a.removeEventListener("playing", onPlaying);
    };
  }, []);

  // ---- tìm index lời bài hát theo thời gian (O(log n) binary search) ----
  const findLyricIndex = useCallback((timeMs) => {
    const L = lyrics;
    if (!L.length) return -1;
    // binary search: tìm dòng cuối có time <= timeMs
    let lo = 0, hi = L.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (L[mid].time <= timeMs) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }, [lyrics]);

  // ---- events ----
  useEffect(() => {
    const a = audioRef.current;
    const onTime = () => {
      setTime(a.currentTime);
      setDuration(a.duration || 0);
      setLyricsActive(findLyricIndex(a.currentTime * 1000));
    };
    const onEnded = () => {
      if (repeatRef.current === "one") {
        a.currentTime = 0;
        a.play().catch(() => {});
      } else if (nextRef.current) {
        nextRef.current();
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("loadedmetadata", () => setDuration(a.duration || 0));

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [findLyricIndex]);

  // ---- load lyrics ----
  useEffect(() => {
    if (!current) return;
    setLyrics([]);
    setLyricsActive(-1);
    setAudioError(false);
    viewRecordedRef.current = false;
    if (current.lyrics) {
      api
        .get(current.lyrics)
        .then((d) => {
          if (d && d.status === "success" && Array.isArray(d.lyrics)) setLyrics(d.lyrics);
        })
        .catch(() => {});
    }
  }, [current]);

  // ---- ghi nhận lượt nghe (mỗi lần phát bài mới; reset khi đổi bài) ----
  useEffect(() => {
    if (!current || !playing || viewRecordedRef.current) return;
    viewRecordedRef.current = true;
    const t = setTimeout(() => {
      api.post(DMUSIC.LIBRARY.INTERACT, {
        song_id: current.id,
        action: "view",
      }).catch(() => {});
    }, 15000);
    return () => clearTimeout(t);
  }, [current, playing]);

  const playTrack = useCallback((track, index) => {
    setCurrent(track);
    setAudioError(false);
    audioRef.current.src = track.audio;
    audioRef.current.play().then(() => setPlaying(true)).catch(() => setAudioError(true));
  }, []);

  const playNow = useCallback((track) => {
    setQueue([track]);
    setQueueIndex(0);
    queueRef.current = [track];
    queueIndexRef.current = 0;
    playTrack(track, 0);
  }, [playTrack]);

  const playQueue = useCallback((tracks, startIndex = 0) => {
    if (!tracks || tracks.length === 0) return;
    setQueue(tracks);
    setQueueIndex(startIndex);
    queueRef.current = tracks;
    queueIndexRef.current = startIndex;
    playTrack(tracks[startIndex], startIndex);
  }, [playTrack]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!current) return;
    if (a.paused) a.play().catch(() => setAudioError(true));
    else a.pause();
  }, [current]);

  const seek = useCallback((value) => {
    const a = audioRef.current;
    a.currentTime = value;
    setTime(value);
  }, []);

  const setVolume = useCallback((v) => setVolumeState(v), []);

  // next/prev dùng ref để không bị stale closure khi spam
  const next = useCallback(() => {
    const q = queueRef.current;
    if (!q.length) return;
    let idx;
    if (shuffleRef.current) {
      idx = Math.floor(Math.random() * q.length);
    } else {
      idx = (queueIndexRef.current + 1) % q.length;
    }
    queueIndexRef.current = idx;
    setQueueIndex(idx);
    playTrack(q[idx], idx);
  }, [playTrack]);

  // Gán hàm next mới nhất vào ref để onEnded luôn gọi đúng
  useEffect(() => { nextRef.current = next; }, [next]);

  const prev = useCallback(() => {
    const a = audioRef.current;
    if (a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    const q = queueRef.current;
    if (!q.length) return;
    const idx = (queueIndexRef.current - 1 + q.length) % q.length;
    queueIndexRef.current = idx;
    setQueueIndex(idx);
    playTrack(q[idx], idx);
  }, [playTrack]);

  const toggleLike = useCallback(async (track) => {
    if (!user) {
      throw new Error("Cần đăng nhập để thả tim.");
    }
    const res = await api.post(DMUSIC.LIBRARY.TOGGLE_LIKE, {
      song_id: track.id,
    });
    // cập nhật trạng thái bài hát hiện tại & trong queue
    setCurrent((c) => (c && c.id === track.id ? { ...c, liked: res.liked, total_likes: res.total_likes } : c));
    setQueue((q) => q.map((s) => (s.id === track.id ? { ...s, liked: res.liked, total_likes: res.total_likes } : s)));
    return res;
  }, [user]);

  const value = {
    current,
    queue,
    queueIndex,
    playing,
    time,
    duration,
    volume,
    shuffle,
    repeat,
    lyrics,
    lyricsActive,
    audioError,
    playNow,
    playQueue,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    setShuffle,
    setRepeat,
    toggleLike,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  return useContext(PlayerContext);
}
