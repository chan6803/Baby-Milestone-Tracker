import { useState, useRef, useCallback } from "react";

interface PhotoEntry {
  id: string;
  dataUrl: string;
  date: string;
  caption: string;
  createdAt: string;
}

function loadPhotos(): PhotoEntry[] {
  try {
    return JSON.parse(localStorage.getItem("mapagi-gallery") || "[]");
  } catch { return []; }
}

function savePhotos(photos: PhotoEntry[]) {
  try {
    localStorage.setItem("mapagi-gallery", JSON.stringify(photos));
  } catch (e) {
    alert("저장 공간이 부족합니다. 오래된 사진을 삭제해 주세요.");
  }
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function groupByDate(photos: PhotoEntry[]): Record<string, PhotoEntry[]> {
  const groups: Record<string, PhotoEntry[]> = {};
  for (const p of photos) {
    if (!groups[p.date]) groups[p.date] = [];
    groups[p.date].push(p);
  }
  return groups;
}

function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height / width) * maxWidth;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function GalleryPage() {
  const savedFamily = (() => { try { return JSON.parse(localStorage.getItem("mapagi-family") || "{}"); } catch { return {}; } })();
  const babyName: string = savedFamily.babyName || "아기";

  const [photos, setPhotos] = useState<PhotoEntry[]>(loadPhotos);
  const [viewPhoto, setViewPhoto] = useState<PhotoEntry | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [captionInput, setCaptionInput] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setLoading(true);
    const newPhotos: PhotoEntry[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const dataUrl = await compressImage(file);
        const photoDate = todayStr;
        newPhotos.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          dataUrl,
          date: photoDate,
          caption: "",
          createdAt: new Date().toISOString(),
        });
      } catch { /* skip */ }
    }
    if (newPhotos.length > 0) {
      if (newPhotos.length === 1) {
        setPendingPhoto(newPhotos[0].dataUrl);
        setCaptionInput("");
      } else {
        const updated = [...newPhotos, ...photos];
        setPhotos(updated);
        savePhotos(updated);
      }
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function confirmAddPhoto() {
    if (!pendingPhoto) return;
    const entry: PhotoEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      dataUrl: pendingPhoto,
      date: todayStr,
      caption: captionInput.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...photos];
    setPhotos(updated);
    savePhotos(updated);
    setPendingPhoto(null);
    setCaptionInput("");
  }

  function deletePhoto(id: string) {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    savePhotos(updated);
    setDeleteConfirm(null);
    if (viewPhoto?.id === id) setViewPhoto(null);
  }

  function saveCaption(id: string) {
    const updated = photos.map(p => p.id === id ? { ...p, caption: editCaption } : p);
    setPhotos(updated);
    savePhotos(updated);
    setViewPhoto(prev => prev ? { ...prev, caption: editCaption } : null);
  }

  const groups = groupByDate([...photos].sort((a, b) => b.date.localeCompare(a.date)));
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div className="page-container gallery-page">
      <div className="page-header">
        <h2 className="page-title">📸 우리 아기 사진첩</h2>
        <p className="page-subtitle">{babyName}의 소중한 순간들</p>
        <div className="gallery-count">{photos.length}장의 사진</div>
      </div>

      {/* Upload buttons */}
      <div className="gallery-upload-row">
        <button className="upload-btn camera-btn" onClick={() => cameraInputRef.current?.click()} disabled={loading}>
          <span>📷</span> 사진 촬영
        </button>
        <button className="upload-btn file-btn" onClick={() => fileInputRef.current?.click()} disabled={loading}>
          <span>🖼️</span> 사진 업로드
        </button>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
          style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
        <input ref={fileInputRef} type="file" accept="image/*" multiple
          style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
      </div>

      {loading && (
        <div className="gallery-loading">
          <div className="loading-spinner" />
          <span>사진을 처리하는 중...</span>
        </div>
      )}

      {/* Pending photo preview */}
      {pendingPhoto && (
        <div className="pending-card">
          <img src={pendingPhoto} alt="미리보기" className="pending-img" />
          <div className="pending-caption-row">
            <input
              className="pending-caption-input"
              type="text"
              placeholder="이 사진에 한 마디를 남겨요 😊 (선택)"
              value={captionInput}
              onChange={e => setCaptionInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && confirmAddPhoto()}
            />
          </div>
          <div className="pending-buttons">
            <button className="btn-cancel" onClick={() => setPendingPhoto(null)}>취소</button>
            <button className="btn-save" style={{ background: "linear-gradient(135deg,#e8457a,#c060d0)" }} onClick={confirmAddPhoto}>
              저장하기 ✓
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && !pendingPhoto && (
        <div className="gallery-empty">
          <div className="gallery-empty-icon">📷</div>
          <p className="gallery-empty-title">아직 사진이 없어요</p>
          <p className="gallery-empty-sub">위 버튼으로 {babyName}의 첫 사진을 추가해 보세요!</p>
        </div>
      )}

      {/* Photo groups by date */}
      <div className="gallery-groups">
        {sortedDates.map(date => (
          <div key={date} className="gallery-group">
            <div className="gallery-group-date">
              <span className="group-date-text">{formatDisplayDate(date)}</span>
              <span className="group-date-count">{groups[date].length}장</span>
            </div>
            <div className="gallery-grid">
              {groups[date].map(photo => (
                <div key={photo.id} className="gallery-thumb" onClick={() => { setViewPhoto(photo); setEditCaption(photo.caption); }}>
                  <img src={photo.dataUrl} alt={photo.caption || "아기 사진"} className="thumb-img" />
                  {photo.caption && (
                    <div className="thumb-caption">{photo.caption}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Full-screen viewer */}
      {viewPhoto && (
        <div className="viewer-overlay" onClick={() => setViewPhoto(null)}>
          <div className="viewer-card" onClick={e => e.stopPropagation()}>
            <button className="viewer-close" onClick={() => setViewPhoto(null)}>✕</button>
            <img src={viewPhoto.dataUrl} alt={viewPhoto.caption || "아기 사진"} className="viewer-img" />
            <div className="viewer-info">
              <div className="viewer-date">{formatDisplayDate(viewPhoto.date)}</div>
              <div className="viewer-caption-row">
                <input
                  className="viewer-caption-input"
                  type="text"
                  placeholder="코멘트를 입력하세요..."
                  value={editCaption}
                  onChange={e => setEditCaption(e.target.value)}
                />
                <button className="viewer-caption-save" onClick={() => saveCaption(viewPhoto.id)}>저장</button>
              </div>
              <button className="viewer-delete" onClick={() => setDeleteConfirm(viewPhoto.id)}>
                🗑️ 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: "#e04060" }}>사진 삭제</h3>
            <p className="modal-disease">이 사진을 삭제할까요? 복구할 수 없어요.</p>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>취소</button>
              <button className="btn-save" style={{ background: "#e04060" }} onClick={() => deletePhoto(deleteConfirm)}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
