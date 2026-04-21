import { useState, useRef, useEffect } from "react";
import { isFirebaseConfigured, authReady } from "@/lib/firebase";
import {
  getLocalFamilyId,
  uploadPhoto, deletePhotoFromStorage,
  savePhotoMeta, deletePhotoMeta, listenPhotos
} from "@/lib/family-sync";

interface PhotoEntry {
  id: string;
  dataUrl: string;       // 로컬 base64 (오프라인 모드)
  storageUrl?: string;   // Firebase Storage URL (동기화 모드)
  date: string;
  caption: string;
  createdAt: string;
}

function loadLocalPhotos(): PhotoEntry[] {
  try { return JSON.parse(localStorage.getItem("mapagi-gallery") || "[]"); } catch { return []; }
}

function saveLocalPhotos(photos: PhotoEntry[]) {
  try {
    const toSave = photos.map(p => ({ ...p, dataUrl: p.storageUrl ? "" : p.dataUrl }));
    localStorage.setItem("mapagi-gallery", JSON.stringify(toSave));
  } catch {}
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
        if (width > maxWidth) { height = (height / width) * maxWidth; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
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
  const savedFamily = (() => {
    try {
      const babies = JSON.parse(localStorage.getItem("mapagi-babies") || "[]");
      const activeId = localStorage.getItem("mapagi-active-baby");
      const baby = babies.find((b: any) => b.id === activeId) || babies[0];
      if (baby) return baby;
      return JSON.parse(localStorage.getItem("mapagi-family") || "{}");
    } catch { return {}; }
  })();
  const babyName: string = savedFamily.babyName || "아기";

  const familyId = getLocalFamilyId();
  const isSynced = !!(isFirebaseConfigured && familyId);

  const [photos, setPhotos]           = useState<PhotoEntry[]>(loadLocalPhotos);
  const [viewPhoto, setViewPhoto]     = useState<PhotoEntry | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [captionInput, setCaptionInput] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const todayStr = new Date().toISOString().split("T")[0];

  // Firebase 실시간 구독 (authReady 대기 후)
  useEffect(() => {
    if (!isSynced) return;
    let unsub: (() => void) | null = null;
    authReady.then(() => {
      unsub = listenPhotos(familyId, (firebasePhotos) => {
        const mapped: PhotoEntry[] = firebasePhotos.map(fp => ({
          id:         fp.id as string,
          dataUrl:    "",
          storageUrl: fp.storageUrl as string,
          date:       fp.date as string,
          caption:    fp.caption as string,
          createdAt:  fp.createdAt as string,
        }));
        setPhotos(mapped);
        saveLocalPhotos(mapped);
      });
    });
    return () => { if (unsub) unsub(); };
  }, [familyId, isSynced]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setLoading(true);
    const newPhotos: PhotoEntry[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const dataUrl = await compressImage(file);
        newPhotos.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          dataUrl, date: todayStr, caption: "", createdAt: new Date().toISOString(),
        });
      } catch {}
    }
    if (newPhotos.length > 0) {
      if (newPhotos.length === 1) {
        setPendingPhoto(newPhotos[0].dataUrl);
        setCaptionInput("");
      } else {
        for (const photo of newPhotos) await uploadAndSave(photo);
      }
    }
    setLoading(false);
    if (fileInputRef.current)   fileInputRef.current.value   = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function uploadAndSave(entry: PhotoEntry) {
    if (isSynced && entry.dataUrl) {
      setUploadProgress("☁️ 업로드 중...");
      try {
        await authReady;
        const storageUrl = await uploadPhoto(familyId, entry.id, entry.dataUrl);
        await savePhotoMeta(familyId, entry.id, {
          storageUrl, date: entry.date, caption: entry.caption, createdAt: entry.createdAt,
        });
        // listenPhotos가 자동으로 상태 업데이트
      } catch (e) {
        console.error("사진 업로드 실패:", e);
        const updated = [entry, ...photos];
        setPhotos(updated); saveLocalPhotos(updated);
      }
      setUploadProgress("");
    } else {
      const updated = [entry, ...photos];
      setPhotos(updated); saveLocalPhotos(updated);
    }
  }

  async function confirmAddPhoto() {
    if (!pendingPhoto) return;
    setLoading(true);
    const entry: PhotoEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      dataUrl: pendingPhoto, date: todayStr,
      caption: captionInput.trim(), createdAt: new Date().toISOString(),
    };
    await uploadAndSave(entry);
    setPendingPhoto(null); setCaptionInput(""); setLoading(false);
  }

  async function handleDeletePhoto(id: string) {
    if (isSynced) {
      await authReady;
      await deletePhotoFromStorage(familyId, id);
      await deletePhotoMeta(familyId, id);
    } else {
      const updated = photos.filter(p => p.id !== id);
      setPhotos(updated); saveLocalPhotos(updated);
    }
    setDeleteConfirm(null);
    if (viewPhoto?.id === id) setViewPhoto(null);
  }

  async function saveCaption(id: string) {
    if (isSynced) {
      await authReady;
      await savePhotoMeta(familyId, id, { caption: editCaption });
    } else {
      const updated = photos.map(p => p.id === id ? { ...p, caption: editCaption } : p);
      setPhotos(updated); saveLocalPhotos(updated);
    }
    setViewPhoto(prev => prev ? { ...prev, caption: editCaption } : null);
  }

  const displayUrl = (photo: PhotoEntry) => photo.storageUrl || photo.dataUrl;
  const groups = groupByDate([...photos].sort((a, b) => b.date.localeCompare(a.date)));
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div className="page-container gallery-page">
      <div className="page-header">
        <h2 className="page-title">📸 우리 아기 사진첩</h2>
        <p className="page-subtitle">{babyName}의 소중한 순간들</p>
        <div className="gallery-count">{photos.length}장의 사진</div>
        {isSynced && <div className="sync-badge">☁️ 가족 간 공유 중</div>}
      </div>

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

      {(loading || uploadProgress) && (
        <div className="gallery-loading">
          <div className="loading-spinner" />
          <span>{uploadProgress || "사진을 처리하는 중..."}</span>
        </div>
      )}

      {pendingPhoto && (
        <div className="pending-card">
          <img src={pendingPhoto} alt="미리보기" className="pending-img" />
          <div className="pending-caption-row">
            <input className="pending-caption-input" type="text"
              placeholder="이 사진에 한 마디를 남겨요 😊 (선택)"
              value={captionInput} onChange={e => setCaptionInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && confirmAddPhoto()} />
          </div>
          <div className="pending-buttons">
            <button className="btn-cancel" onClick={() => setPendingPhoto(null)}>취소</button>
            <button className="btn-save" style={{ background: "linear-gradient(135deg,#e8457a,#c060d0)" }}
              onClick={confirmAddPhoto} disabled={loading}>
              {loading ? "저장 중..." : "저장하기 ✓"}
            </button>
          </div>
        </div>
      )}

      {photos.length === 0 && !pendingPhoto && (
        <div className="gallery-empty">
          <div className="gallery-empty-icon">📷</div>
          <p className="gallery-empty-title">아직 사진이 없어요</p>
          <p className="gallery-empty-sub">위 버튼으로 {babyName}의 첫 사진을 추가해 보세요!</p>
        </div>
      )}

      <div className="gallery-groups">
        {sortedDates.map(date => (
          <div key={date} className="gallery-group">
            <div className="gallery-group-date">
              <span className="group-date-text">{formatDisplayDate(date)}</span>
              <span className="group-date-count">{groups[date].length}장</span>
            </div>
            <div className="gallery-grid">
              {groups[date].map(photo => (
                <div key={photo.id} className="gallery-thumb"
                  onClick={() => { setViewPhoto(photo); setEditCaption(photo.caption); }}>
                  <img src={displayUrl(photo)} alt={photo.caption || "아기 사진"} className="thumb-img" />
                  {photo.caption && <div className="thumb-caption">{photo.caption}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {viewPhoto && (
        <div className="viewer-overlay" onClick={() => setViewPhoto(null)}>
          <div className="viewer-card" onClick={e => e.stopPropagation()}>
            <button className="viewer-close" onClick={() => setViewPhoto(null)}>✕</button>
            <img src={displayUrl(viewPhoto)} alt={viewPhoto.caption || "아기 사진"} className="viewer-img" />
            <div className="viewer-info">
              <div className="viewer-date">{formatDisplayDate(viewPhoto.date)}</div>
              <div className="viewer-caption-row">
                <input className="viewer-caption-input" type="text" placeholder="코멘트를 입력하세요..."
                  value={editCaption} onChange={e => setEditCaption(e.target.value)} />
                <button className="viewer-caption-save" onClick={() => saveCaption(viewPhoto.id)}>저장</button>
              </div>
              <button className="viewer-delete" onClick={() => setDeleteConfirm(viewPhoto.id)}>🗑️ 삭제</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: "#e04060" }}>사진 삭제</h3>
            <p className="modal-disease">이 사진을 삭제할까요? 복구할 수 없어요.</p>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>취소</button>
              <button className="btn-save" style={{ background: "#e04060" }}
                onClick={() => handleDeletePhoto(deleteConfirm)}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
