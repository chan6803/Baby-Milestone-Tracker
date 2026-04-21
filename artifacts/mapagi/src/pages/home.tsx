import { useState, useEffect } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";
import { getFamilyId, syncFamilyInfo } from "@/lib/family-sync";
import ScrollDatePicker from "@/components/ScrollDatePicker";

export interface BabyProfile {
  id: string;
  momName: string;
  dadName: string;
  babyName: string;
  nickname: string;   // 태명 (선택)
  birthDate: string;
}

const DEFAULT_BABY = (): BabyProfile => ({
  id: Date.now().toString(),
  momName: "", dadName: "", babyName: "", nickname: "", birthDate: "",
});

function loadBabies(): BabyProfile[] {
  try {
    const raw = localStorage.getItem("mapagi-babies");
    if (raw) return JSON.parse(raw).map((b: BabyProfile) => ({ nickname: "", ...b }));
    const old = localStorage.getItem("mapagi-family");
    if (old) return [{ id: "1", nickname: "", ...JSON.parse(old) }];
  } catch {}
  return [DEFAULT_BABY()];
}

function saveBabies(babies: BabyProfile[]) {
  localStorage.setItem("mapagi-babies", JSON.stringify(babies));
}

export function getActiveBaby(): BabyProfile | null {
  try {
    const babies = loadBabies();
    const activeId = localStorage.getItem("mapagi-active-baby") || babies[0]?.id;
    return babies.find(b => b.id === activeId) || babies[0] || null;
  } catch { return null; }
}

// 아기 이름(태명) 형식으로 표시
export function getBabyDisplayName(baby: BabyProfile | null): string {
  if (!baby) return "아기";
  if (baby.babyName && baby.nickname) return `${baby.babyName}(${baby.nickname})`;
  return baby.babyName || baby.nickname || "아기";
}

function getDaysSinceBirth(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate), today = new Date();
  birth.setHours(0,0,0,0); today.setHours(0,0,0,0);
  const diff = today.getTime() - birth.getTime();
  return diff < 0 ? null : Math.floor(diff / 86400000) + 1;
}

function getDaysUntilBirth(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate), today = new Date();
  birth.setHours(0,0,0,0); today.setHours(0,0,0,0);
  const diff = birth.getTime() - today.getTime();
  return diff <= 0 ? null : Math.ceil(diff / 86400000);
}

function getAgeText(days: number): string {
  if (days < 30) return `${days}일째`;
  if (days < 365) {
    const m = Math.floor(days/30), r = days%30;
    return r > 0 ? `${m}개월 ${r}일째` : `${m}개월째`;
  }
  const y = Math.floor(days/365), m = Math.floor((days%365)/30);
  return m > 0 ? `${y}살 ${m}개월째` : `${y}살째`;
}

function formatDate(d: string): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}년 ${dt.getMonth()+1}월 ${dt.getDate()}일`;
}

const ORDINAL = ["첫째","둘째","셋째","넷째","다섯째"];

interface HomeProps {
  onLogout?: () => void;
}

export default function Home({ onLogout }: HomeProps = {}) {
  const [babies, setBabies]   = useState<BabyProfile[]>(loadBabies);
  const [activeId, setActiveId] = useState<string>(
    () => localStorage.getItem("mapagi-active-baby") || loadBabies()[0]?.id || ""
  );
  const [saved, setSaved]         = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [syncing, setSyncing]     = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle"|"synced"|"error">("idle");
  const isLoggedIn = !!localStorage.getItem("mapagi-family-id");
  const [today, setToday]         = useState(new Date());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const activeBaby = babies.find(b => b.id === activeId) || babies[0];

  function selectBaby(id: string) {
    setActiveId(id);
    localStorage.setItem("mapagi-active-baby", id);
    setSaved(false);
  }

  function handleChange(field: keyof BabyProfile, value: string) {
    setBabies(prev => prev.map(b => b.id === activeBaby?.id ? {...b, [field]: value} : b));
    setSaved(false);
    setHasChanges(true);
  }

  async function handleSave() {
    saveBabies(babies);
    if (activeBaby) localStorage.setItem("mapagi-family", JSON.stringify(activeBaby));
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 2000);

    if (isFirebaseConfigured && activeBaby?.momName && activeBaby?.dadName && activeBaby?.babyName) {
      setSyncing(true);
      try {
        const fid = await getFamilyId(activeBaby.momName, activeBaby.dadName, activeBaby.babyName);
        localStorage.setItem("mapagi-family-id", fid);
        await syncFamilyInfo(fid, { babies, updatedAt: new Date().toISOString() });
        setSyncStatus("synced");
      } catch { setSyncStatus("error"); }
      finally { setSyncing(false); setTimeout(() => setSyncStatus("idle"), 3000); }
    }
  }

  function addBaby() {
    const nb = DEFAULT_BABY();
    setBabies(p => [...p, nb]);
    setActiveId(nb.id);
    localStorage.setItem("mapagi-active-baby", nb.id);
  }

  function removeBaby(id: string) {
    if (babies.length <= 1) return;
    const updated = babies.filter(b => b.id !== id);
    setBabies(updated); saveBabies(updated);
    const na = updated[0].id;
    setActiveId(na); localStorage.setItem("mapagi-active-baby", na);
  }

  const days      = activeBaby ? getDaysSinceBirth(activeBaby.birthDate) : null;
  const daysUntil = activeBaby ? getDaysUntilBirth(activeBaby.birthDate) : null;
  const isFuture  = daysUntil !== null;
  const pregWeek  = daysUntil ? Math.max(0, 40 - Math.ceil(daysUntil / 7)) : null;
  const todayStr  = `${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일`;
  const displayName = getBabyDisplayName(activeBaby || null);

  // 로그인된 가족 이름 (헤더 표시용)
  const loginMom  = localStorage.getItem("mapagi-login-mom") || activeBaby?.momName || "";
  const loginDad  = localStorage.getItem("mapagi-login-dad") || activeBaby?.dadName || "";

  return (
    <div className="min-h-screen app-bg flex flex-col items-center py-10 px-4">

      {/* 타이틀 + 로그아웃 */}
      <div className="title-section mb-6 text-center w-full max-w-md relative">
        <h1 className="main-title">
          <span className="normal-char">엄</span><span className="highlight-char">마</span>
          <span className="normal-char">, 아</span><span className="highlight-char">빠</span>
          <span className="normal-char">, 아</span><span className="highlight-char">기</span>
        </h1>
        <p className="subtitle">우리 가족 아기 성장 기록</p>

        {/* 로그인 정보 + 로그아웃 버튼 */}
        {onLogout && (
          <div className="logout-bar">
            <span className="logout-user">
              {loginMom && loginDad ? `${loginMom} · ${loginDad}` : "가족"}
            </span>
            {!showLogoutConfirm ? (
              <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>
                로그아웃
              </button>
            ) : (
              <span className="logout-confirm-wrap">
                <span className="logout-confirm-text">정말요?</span>
                <button className="logout-confirm-yes" onClick={onLogout}>예</button>
                <button className="logout-confirm-no" onClick={() => setShowLogoutConfirm(false)}>아니오</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 동기화 상태 */}
      {!isFirebaseConfigured && (
        <div className="sync-notice w-full max-w-md mb-4">
          <span>☁️</span><span>Firebase 설정 후 가족 간 데이터 공유가 가능해요!</span>
        </div>
      )}
      {syncStatus === "synced" && (
        <div className="sync-ok w-full max-w-md mb-4"><span>✅ 가족 데이터 동기화 완료!</span></div>
      )}
      {syncStatus === "error" && (
        <div className="sync-error w-full max-w-md mb-4"><span>⚠️ 동기화 실패. 인터넷을 확인해주세요.</span></div>
      )}

      {/* 아기 탭 */}
      <div className="baby-tabs-wrap w-full max-w-md mb-4">
        <div className="baby-tabs">
          {babies.map((b, idx) => (
            <button key={b.id} className={`baby-tab ${b.id === activeBaby?.id ? "active" : ""}`}
              onClick={() => selectBaby(b.id)}>
              <span className="baby-tab-icon">👶</span>
              <span>{getBabyDisplayName(b) !== "아기" ? getBabyDisplayName(b) : (ORDINAL[idx] || `아기${idx+1}`)}</span>
              {babies.length > 1 && b.id === activeBaby?.id && (
                <button className="baby-tab-del" onClick={e => { e.stopPropagation(); removeBaby(b.id); }}>×</button>
              )}
            </button>
          ))}
          {babies.length < 5 && (
            <button className="baby-tab add-tab" onClick={addBaby}>+ 아기 추가</button>
          )}
        </div>
      </div>

      {/* 가족 정보 입력 폼 */}
      {activeBaby && (
        <div className="card w-full max-w-md mb-8">
          <h2 className="card-title mb-6">가족 정보</h2>

          <div className="field-group">
            <label className="field-label"><span className="label-icon">👩</span> 엄마 이름</label>
            <input className="field-input" type="text" placeholder="엄마 이름을 입력하세요"
              value={activeBaby.momName} onChange={e => handleChange("momName", e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label"><span className="label-icon">👨</span> 아빠 이름</label>
            <input className="field-input" type="text" placeholder="아빠 이름을 입력하세요"
              value={activeBaby.dadName} onChange={e => handleChange("dadName", e.target.value)} />
          </div>

          {/* 아기 이름 */}
          <div className="field-group">
            <label className="field-label"><span className="label-icon">👶</span> 아기 이름</label>
            <input className="field-input" type="text" placeholder="아기 이름을 입력하세요"
              value={activeBaby.babyName} onChange={e => handleChange("babyName", e.target.value)} />
          </div>

          {/* 태명 — 아기 이름 바로 아래 */}
          <div className="field-group">
            <label className="field-label">
              <span className="label-icon">🌸</span> 태명
              <span className="field-hint"> (선택)</span>
            </label>
            <input className="field-input" type="text" placeholder="태명을 입력하세요 (예: 복덩이)"
              value={activeBaby.nickname} onChange={e => handleChange("nickname", e.target.value)} />
            {activeBaby.babyName && activeBaby.nickname && (
              <div className="nickname-preview">
                표시 이름: <strong>{activeBaby.babyName}({activeBaby.nickname})</strong>
              </div>
            )}
          </div>

          {/* 태어난 날(예정일) */}
          <div className="field-group">
            <label className="field-label">
              <span className="label-icon">🎂</span> 태어난 날(예정일)
              <span className="field-hint"> (과거·미래 모두 가능)</span>
            </label>
            <ScrollDatePicker
              value={activeBaby.birthDate}
              onChange={v => handleChange("birthDate", v)}
            />
            {activeBaby.birthDate && (
              <div className="sdp-display-val">
                {activeBaby.birthDate.slice(0,4)}년 {parseInt(activeBaby.birthDate.slice(5,7))}월 {parseInt(activeBaby.birthDate.slice(8,10))}일 선택됨
              </div>
            )}
          </div>

          {isFirebaseConfigured && (
            <div className="sync-info-box">
              <span>☁️</span>
              <span>엄마·아빠·아기 이름이 같으면 가족 간 기록이 자동 공유됩니다</span>
            </div>
          )}

          <button
            className={`save-btn ${saved ? "saved" : ""} ${isLoggedIn && !hasChanges && !saved ? "logged-in-btn" : ""}`}
            onClick={handleSave}
            disabled={syncing}
          >
            {syncing ? "⏳ 동기화 중..."
              : saved ? "✓ 저장되었습니다!"
              : isLoggedIn && !hasChanges ? "✓ 로그인 되었습니다"
              : "저장하기"}
          </button>
        </div>
      )}

      {/* 성장 카운터 */}
      {activeBaby?.birthDate && (
        <div className="card w-full max-w-md day-card">
          <div className="day-card-header">
            <span className="baby-emoji">{isFuture ? "🤰" : "🍼"}</span>
            <h2 className="day-card-title">{displayName}의 {isFuture ? "탄생 카운트다운" : "성장"}</h2>
          </div>
          <div className="birth-info">
            <span className="birth-label">{isFuture ? "출산 예정일" : "태어난 날"}</span>
            <span className="birth-date">{formatDate(activeBaby.birthDate)}</span>
          </div>
          <div className="today-info">
            <span className="today-label">오늘</span>
            <span className="today-date">{todayStr}</span>
          </div>
          {isFuture ? (
            <div className="day-counter pregnancy-counter">
              <div className="day-number">{daysUntil}</div>
              <div className="day-text">일 후 탄생 🌟</div>
              {pregWeek !== null && <div className="age-text">임신 {pregWeek}주차 · D-{daysUntil}</div>}
              {activeBaby.momName && activeBaby.dadName && (
                <div className="parents-love">💕 {activeBaby.momName}와 {activeBaby.dadName}의 소중한 아기</div>
              )}
            </div>
          ) : days !== null ? (
            <div className="day-counter">
              <div className="day-number">{days.toLocaleString()}</div>
              <div className="day-text">일</div>
              <div className="age-text">{getAgeText(days)}</div>
              {activeBaby.momName && activeBaby.dadName && (
                <div className="parents-love">💕 {activeBaby.momName}와 {activeBaby.dadName}의 사랑스러운 {displayName}</div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {!activeBaby?.birthDate && (
        <div className="empty-hint">
          <span>👆</span>
          <p>위에서 가족 정보와 태어난 날(예정일)을 입력해 보세요!</p>
        </div>
      )}
    </div>
  );
}
