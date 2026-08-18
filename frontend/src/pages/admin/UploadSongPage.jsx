// src/pages/admin/UploadSongPage.jsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import { SONGS_UPLOAD } from "../../config/urls";
import { getToken } from "../../api/client";
import { showToast } from "../../lib/toast";
import PageShell from "../../components/common/PageShell";

/**
 * 🎵 Upload Nhạc Toàn Diện (5-in-1) — Hệ thống tự động hóa hoàn chỉnh
 * - Slugify folder_name từ title
 * - Debounce check-folder → hiển thị trạng thái từng mục file (xanh/vàng/đỏ)
 * - Preview: nghe nhạc, play video, xem ảnh bìa, xem LRC
 * - Upload ngay + tự động ghi SQL (INSERT/UPDATE) khi bấm tải lên
 */
export default function UploadSongPage() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [folder, setFolder] = useState("");
  const [folderTouched, setFolderTouched] = useState(false);

  // Files (5 loại) + file URL preview
  const [files, setFiles] = useState({
    audio_file: null, beat_file: null, video_file: null, cover_image: null, lyric_file: null,
  });
  const fileInputs = {
    audio_file: useRef(null), beat_file: useRef(null), video_file: useRef(null),
    cover_image: useRef(null), lyric_file: useRef(null),
  };

  // Trạng thái check-folder
  const [checkInfo, setCheckInfo] = useState(null); // {exists, files, song}
  const [checking, setChecking] = useState(false);

  // Upload progress
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [lyricPreview, setLyricPreview] = useState(""); // text LRC đã có

  // ---------- SLUGIFY ----------
  const slugify = useCallback((text) => {
    if (!text) return "";
    return text
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
  }, []);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    if (!folderTouched) setFolder(slugify(e.target.value));
  };

  // ---------- DEBOUNCE CHECK-FOLDER ----------
  const checkTimer = useRef(null);
  const runCheck = useCallback(async (folderName) => {
    if (!folderName) { setCheckInfo(null); setLyricPreview(""); return; }
    setChecking(true);
    try {
      const token = getToken();
      const res = await axios.get(SONGS_UPLOAD.CHECK_FOLDER(folderName), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCheckInfo(res.data);
      // load preview LRC nếu có file lyric
      const lrc = (res.data.files || []).find((f) => f.endsWith(".lrc") || f.endsWith(".txt"));
      if (lrc) {
        try {
          const txt = await (await fetch(`/api/admin/preview/music/${folderName}/${lrc}`)).text();
          setLyricPreview(txt.slice(0, 1500));
        } catch { setLyricPreview(""); }
      } else {
        setLyricPreview("");
      }
    } catch (e) {
      if (e.response?.status === 404) setCheckInfo(null);
      else showToast("Lỗi kiểm tra thư mục: " + (e.response?.data?.detail || e.message), "error");
    } finally {
      setChecking(false);
    }
  }, []);

  const handleFolderChange = (e) => {
    setFolderTouched(true);
    setFolder(e.target.value);
    clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(() => runCheck(e.target.value), 500);
  };

  // ---------- FILE SELECT + VALIDATE ----------
  const onFileSelect = (field, e) => {
    const file = e.target.files[0];
    if (!file) return;
    // validate định dạng theo loại
    const meta = fieldMetaMap[field];
    const ok = meta.allowed.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!ok) {
      showToast(`Định dạng không hợp lệ cho ${meta.label}. Chỉ chấp nhận: ${meta.allowed.join(", ")}`, "error");
      e.target.value = "";
      setFiles((f) => ({ ...f, [field]: { ...f[field], error: true, file: null } }));
      return;
    }
    setFiles((f) => ({ ...f, [field]: { file, error: false } }));
  };

  const pickFile = (field) => fileInputs[field].current?.click();

  // ---------- XÁC ĐỊNH TRẠNG THÁI & PREVIEW FILE ĐÃ TỒN TẠI ----------
  // Dựa vào folder + danh sách files từ checkInfo
  const getExistingFile = useCallback((field) => {
    if (!checkInfo?.files || !folder) return null;
    const fl = checkInfo.files;
    const base = folder;
    switch (field) {
      case "audio_file":
        return fl.find((f) => f === `${base}.mp3` || f === `${base}.m4a` || f === `${base}.wav` || f === `${base}.ogg` || f === `${base}.flac`) || null;
      case "beat_file":
        return fl.find((f) => f.startsWith(`${base}_beat`)) || null;
      case "video_file":
        return fl.find((f) => f.startsWith(base) && /\.(mp4|mov|mkv|webm)$/.test(f)) || null;
      case "cover_image":
        return fl.find((f) => f.startsWith(base) && /\.(jpg|jpeg|png|webp)$/.test(f)) || null;
      case "lyric_file":
        return fl.find((f) => f.endsWith(".lrc") || f.endsWith(".txt")) || null;
      default:
        return null;
    }
  }, [checkInfo, folder]);

  // URL preview cho file đã tồn tại
  const getPreviewUrl = (field, fileName) => {
    if (!fileName) return null;
    return `/api/admin/preview/music/${folder}/${fileName}`;
  };

  // Trạng thái tổng hợp cho từng mục: 'none' | 'exists' | 'selected' | 'error'
  const getFieldStatus = (field) => {
    const sel = files[field];
    if (sel?.error) return "error";
    if (sel?.file) return "selected";
    if (getExistingFile(field)) return "exists";
    return "none";
  };

  const fieldMetaList = [
    { key: "audio_file", label: "Audio", icon: "fa-solid fa-music", color: "#1ed760", allowed: [".mp3",".m4a",".wav",".ogg",".flac"] },
    { key: "beat_file", label: "Beat", icon: "fa-solid fa-drum", color: "#3b82f6", allowed: [".mp3",".m4a",".wav",".ogg",".flac"] },
    { key: "video_file", label: "Video", icon: "fa-solid fa-film", color: "#ec4899", allowed: [".mp4",".mov",".mkv",".webm"] },
    { key: "cover_image", label: "Ảnh bìa", icon: "fa-solid fa-image", color: "#f59e0b", allowed: [".jpg",".jpeg",".png",".webp"] },
    { key: "lyric_file", label: "Lời (LRC)", icon: "fa-solid fa-scroll", color: "#8b5cf6", allowed: [".lrc",".txt"] },
  ];
  const fieldMetaMap = Object.fromEntries(fieldMetaList.map((m) => [m.key, m]));

  // ---------- UPLOAD (tự động ghi SQL) ----------
  const doUpload = async () => {
    if (!folder.trim()) { showToast("Vui lòng nhập tên thư mục!", "error"); return; }
    const hasAny = Object.values(files).some((f) => f && !f.error);
    if (!hasAny && !checkInfo?.song) { showToast("Chọn ít nhất 1 file hoặc bài đã tồn tại!", "error"); return; }

    setUploading(true);
    setProgress(0);
    const form = new FormData();
    form.append("folder_name", folder);
    if (title.trim()) form.append("title", title.trim());
    if (artist.trim()) form.append("artist", artist.trim());
    ["audio_file", "beat_file", "video_file", "cover_image", "lyric_file"].forEach((f) => {
      const fobj = files[f];
      if (fobj && fobj.file) form.append(f, fobj.file);
    });

    try {
      const token = getToken();
      const res = await axios.post(SONGS_UPLOAD.UPLOAD, form, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setProgress(100);
      showToast(res.data.message, "success");
      // Tự động hóa hoàn chỉnh: sau upload -> refresh check-folder để cập nhật trạng thái
      setFiles({ audio_file: null, beat_file: null, video_file: null, cover_image: null, lyric_file: null });
      ["audio_file","beat_file","video_file","cover_image","lyric_file"].forEach((f) => { if (fileInputs[f].current) fileInputs[f].current.value = ""; });
      setLyricPreview("");
      await runCheck(folder);
    } catch (e) {
      showToast(e.response?.data?.detail || "Upload thất bại!", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClick = () => {
    if (checkInfo?.exists && Object.values(files).some((f) => f && !f.error)) {
      setShowOverwriteDialog(true);
    } else {
      doUpload();
    }
  };

  // Render preview cho từng loại (file đã tồn tại)
  const renderPreview = (field) => {
    const existing = getExistingFile(field);
    const sel = files[field];
    const url = sel?.file
      ? URL.createObjectURL(sel.file)
      : existing ? getPreviewUrl(field, existing) : null;
    if (!url) return null;
    if (field === "audio_file" || field === "beat_file") {
      return <audio controls src={url} style={{ width: "100%", height: 40, marginTop: 8 }} />;
    }
    if (field === "video_file") {
      return <video controls src={url} style={{ width: "100%", marginTop: 8, borderRadius: 8 }} />;
    }
    if (field === "cover_image") {
      return <img src={url} alt="cover" style={{ width: "100%", maxHeight: 120, objectFit: "contain", marginTop: 8, borderRadius: 8 }} />;
    }
    if (field === "lyric_file" && !sel?.file) {
      return lyricPreview ? (
        <pre style={{ fontSize: 11, color: "#a5b4fc", whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto", marginTop: 8 }}>{lyricPreview}</pre>
      ) : null;
    }
    return null;
  };

  return (
    <PageShell
      title="Upload Nhạc Toàn Diện"
      subtitle="Tải 5 file nhạc (audio, beat, video, ảnh bìa, lời) — tự động ghi CSDL"
      icon="fa-solid fa-cloud-arrow-up"
      maxWidth={1200}
    >
      <div className="d4m-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: "1.25rem" }}>
        {/* ===== KHU VỰC 1: THÔNG TIN BÀI HÁT ===== */}
        <div className="d4m-card">
          <h3 className="d4m-section-title" style={{ marginTop: 0 }}>Thông tin bài hát</h3>

          <div className="d4m-field">
            <label className="d4m-label">Tiêu đề bài hát</label>
            <input className="d4m-input" value={title} onChange={handleTitleChange} placeholder="VD: Ải Hồng Nhan" />
          </div>
          <div className="d4m-field">
            <label className="d4m-label">Nghệ sĩ</label>
            <input className="d4m-input" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="VD: Cần Vinh x Lee Ken" />
          </div>
          <div className="d4m-field">
            <label className="d4m-label">Tên thư mục (Folder)</label>
            <input className="d4m-input" value={folder} onChange={handleFolderChange} placeholder="ai-hong-nhan" />
            {checking && <p className="hint">Đang kiểm tra...</p>}
          </div>

          {/* Banner tổng thể */}
          {checkInfo?.exists && (
            <div className="d4m-card" style={{ background: "rgba(240,180,41,.1)", borderColor: "rgba(240,180,41,.4)", marginTop: ".75rem" }}>
              <p style={{ color: "#fde047", fontWeight: 700, margin: 0 }}>
                ⚠️ Bài hát này đã tồn tại — chế độ Cập nhật/Ghi đè.
              </p>
              {checkInfo.song && (
                <p className="hint" style={{ color: "#f0c96b", margin: ".25rem 0 0" }}>
                  {checkInfo.song.title} — {checkInfo.song.artist}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ===== KHU VỰC 2: UPLOAD 5 FILE (mỗi mục có trạng thái + preview) ===== */}
        <div className="d4m-card">
          <h3 className="d4m-section-title" style={{ marginTop: 0 }}>Tải file lên</h3>
          <div className="d4m-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: ".9rem" }}>
            {fieldMetaList.map((f) => {
              const status = getFieldStatus(f.key);
              const sel = files[f.key];
              // Màu theo trạng thái
              const colors = {
                none: { border: "rgba(255,255,255,.1)", bg: "rgba(255,255,255,.03)", text: "#64748b", label: "Chưa có" },
                exists: { border: "rgba(250,204,21,.5)", bg: "rgba(250,204,21,.08)", text: "#fde047", label: "Đã có trên server" },
                selected: { border: "rgba(34,197,94,.5)", bg: "rgba(34,197,94,.08)", text: "#4ade80", label: "Đã chọn file mới" },
                error: { border: "rgba(244,63,94,.5)", bg: "rgba(244,63,94,.08)", text: "#f87171", label: "Sai định dạng" },
              }[status];
              const iconColor = status === "selected" ? "#4ade80" : status === "exists" ? "#fde047" : status === "error" ? "#f87171" : f.color;
              return (
                <div key={f.key} className="d4m-card" style={{ padding: ".85rem", borderColor: colors.border, background: colors.bg }}>
                  <input
                    ref={fileInputs[f.key]}
                    type="file"
                    accept={f.allowed.join(",")}
                    className="hidden"
                    onChange={(e) => onFileSelect(f.key, e)}
                  />
                  <button
                    className="d4m-btn w-full"
                    onClick={() => pickFile(f.key)}
                    style={{ borderColor: "transparent", background: "rgba(255,255,255,.03)", flexDirection: "column", gap: ".4rem", padding: ".85rem" }}
                  >
                    <i className={f.icon} style={{ fontSize: 24, color: iconColor }} />
                    <span className="text-sm">{f.label}</span>
                  </button>

                  {/* Trạng thái + tên file */}
                  <div className="flex items-center gap-1.5" style={{ marginTop: ".5rem", justifyContent: "center", fontSize: ".72rem", fontWeight: 700, color: colors.text }}>
                    <span>{status === "selected" ? "●" : status === "exists" ? "◉" : status === "error" ? "✕" : "○"}</span>
                    <span>{sel?.file ? sel.file.name : colors.label}</span>
                  </div>

                  {/* Preview */}
                  {renderPreview(f.key)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== NÚT UPLOAD + PROGRESS ===== */}
      <div className="d4m-card" style={{ marginTop: "1.5rem" }}>
        <button
          className="d4m-btn d4m-btn-primary w-full"
          onClick={handleUploadClick}
          disabled={uploading || !folder.trim()}
          style={{ width: "100%", padding: ".9rem", fontSize: "1rem" }}
        >
          {uploading ? (
            <><i className="fa-solid fa-circle-notch fa-spin" /> Đang tải lên + ghi CSDL... {progress}%</>
          ) : (
            <><i className="fa-solid fa-cloud-arrow-up" /> {checkInfo?.exists ? "Cập nhật / Ghi đè bài hát" : "Upload bài hát mới"} — tự động ghi CSDL</>
          )}
        </button>
        {uploading && (
          <div className="progress" style={{ marginTop: "1rem", height: 8, background: "rgba(255,255,255,.1)", borderRadius: 4 }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#1ed760,#3b82f6)", borderRadius: 4, transition: "width .2s" }} />
          </div>
        )}
      </div>

      {/* ===== DIALOG XÁC NHẬN GHI ĐÈ ===== */}
      {showOverwriteDialog && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)", padding: "1rem" }}
             onClick={(e) => { if (e.target === e.currentTarget) setShowOverwriteDialog(false); }}>
          <div className="d4m-card" style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: ".5rem" }}>⚠️</div>
            <h3 className="font-heading font-bold text-lg">Xác nhận ghi đè</h3>
            <p className="hint" style={{ lineHeight: 1.6 }}>
              Bài hát <strong>{checkInfo?.song?.title || folder}</strong> đã tồn tại. Bạn có chắc muốn ghi đè lên {Object.values(files).filter((f) => f && !f.error).length} file đã chọn? Hệ thống sẽ upload + cập nhật CSDL ngay lập tức.
            </p>
            <div className="d4m-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginTop: "1rem" }}>
              <button className="d4m-btn" onClick={() => setShowOverwriteDialog(false)}>Hủy</button>
              <button className="d4m-btn d4m-btn-primary" onClick={() => { setShowOverwriteDialog(false); doUpload(); }}>
                Xác nhận & Upload ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
