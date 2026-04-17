import { useState, useEffect } from "react";

export interface BabyProfile {
  id: string;
  momName: string;
  dadName: string;
  babyName: string;
  birthDate: string;
}

const DEFAULT_BABY = (): BabyProfile => ({
  id: Date.now().toString(),
  momName: "",
  dadName: "",
  babyName: "",
  birthDate: "",
});

function loadBabies(): BabyProfile[] {
  try {
    const raw = localStorage.getItem("mapagi-babies");
    if (raw) return JSON.parse(raw);
    // migrate old single-baby data
    const old = localStorage.getItem("mapagi-family");
    if (old) {
      const parsed = JSON.parse(old);
      const baby: BabyProfile = { id: "1", ...parsed };
      return [baby];
    }
  } catch {}
  return [DEFAULT_BABY()];
}

function saveBabies(babies: BabyProfile[]) {
  localStorage.setItem("mapagi-babies", JSON.stringify(babies));
  // keep legacy key in sync with active baby
}

export function getActiveBaby(): BabyProfile | null {
  try {
    const babies = loadBabies();
    const activeId = localStorage.getItem("mapagi-active-baby") || babies[0]?.id;
    return babies.find(b => b.id === activeId) || babies[0] || null;
  } catch { return null; }
}

function getDaysSinceBirth(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  birth.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - birth.getTime();
  if (diff < 0) return null;
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function getDaysUntilBirth(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  birth.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = birth.getTime() - today.getTime();
  if (diff <= 0) return null;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getWeeksUntilBirth(birthDate: string): number | null {
  const days = getDaysUntilBirth(birthDate);
  if (days === null) return null;
  return Math.floor(days / 7);
}

function getPregnancyWeek(birthDate: string): number | null {
  // 출산 예정일 기준으로 현재 임신 주수 계산 (40주 기준)
  const days = getDaysUntilBirth(birthDate);
  if (days === null) return null;
  const weeksPassed = 40 - Math.ceil(days / 7);
  if (weeksPassed < 0) return null;
  return weeksPassed;
}

function getAgeText(days: number): string {
  if (days < 30) return `${days}일째`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    const remDays = days % 30;
    return remDays > 0 ? `${months}개월 ${remDays}일째` : `${months}개월째`;
  }
  const years = Math.floor(days / 365);
  const remMonths = Math.floor((days % 365) / 30);
  return remMonths > 0 ? `${years}살 ${remMonths}개월째` : `${years}살째`;
}

function formatBirthDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const ORDINAL = ["첫째", "둘째", "셋째", "넷째", "다섯째"];

export default function Home() {
  const [babies, setBabies] = useState<BabyProfile[]>(loadBabies);
  const [activeId, setActiveId] = useState<string>(() => {
    return localStorage.getItem("mapagi-active-baby") || loadBabies()[0]?.id || "";
  });
  const [saved, setSaved] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const activeBaby = babies.find(b => b.id === activeId) || babies[0];

  function selectBaby(id: string) {
    setActiveId(id);
    localStorage.setItem("mapagi-active-baby", id);
    setSaved(false);
  }

  function handleChange(field: keyof BabyProfile, value: string) {
    setBabies(prev => prev.map(b => b.id === activeBaby?.id ? { ...b, [field]: value } : b));
    setSaved(false);
  }

  function handleSave() {
    saveBabies(babies);
    // legacy key sync
    if (activeBaby) localStorage.setItem("mapagi-family", JSON.stringify(activeBaby));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addBaby() {
    const nb = DEFAULT_BABY();
    const updated = [...babies, nb];
    setBabies(updated);
    setActiveId(nb.id);
    localStorage.setItem("mapagi-active-baby", nb.id);
    setAddingNew(false);
    setSaved(false);
  }

  function removeBaby(id: string) {
    if (babies.length <= 1) return;
    const updated = babies.filter(b => b.id !== id);
    setBabies(updated);
    saveBabies(updated);
    const newActive = updated[0].id;
    setActiveId(newActive);
    localStorage.setItem("mapagi-active-baby", newActive);
  }

  const days = activeBaby ? getDaysSinceBirth(activeBaby.birthDate) : null;
  const daysUntil = activeBaby ? getDaysUntilBirth(activeBaby.birthDate) : null;
  const isFuture = daysUntil !== null;
  const pregWeek = activeBaby ? getPregnancyWeek(activeBaby.birthDate) : null;

  const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <div className="min-h-screen app-bg flex flex-col items-center py-10 px-4">
      {/* Title */}
      <div className="title-section mb-10 text-center">
        <h1 className="main-title">
          <span className="normal-char">엄</span>
          <span className="highlight-char">마</span>
          <span className="normal-char">, 아</span>
          <span className="highlight-char">빠</span>
          <span className="normal-char">, 아</span>
          <span className="highlight-char">기</span>
        </h1>
        <p className="subtitle">우리 가족 아기 성장 기록</p>
      </div>

      {/* Baby selector tabs */}
      {babies.length > 0 && (
        <div className="baby-tabs-wrap w-full max-w-md mb-4">
          <div className="baby-tabs">
            {babies.map((b, idx) => (
              <button
                key={b.id}
                className={`baby-tab ${b.id === activeBaby?.id ? "active" : ""}`}
                onClick={() => selectBaby(b.id)}
              >
                <span className="baby-tab-icon">👶</span>
                <span>{b.babyName || ORDINAL[idx] || `아기${idx + 1}`}</span>
                {babies.length > 1 && b.id === activeBaby?.id && (
                  <button className="baby-tab-del" onClick={e => { e.stopPropagation(); removeBaby(b.id); }}>×</button>
                )}
              </button>
            ))}
            {babies.length < 5 && (
              <button className="baby-tab add-tab" onClick={addBaby}>
                + 아기 추가
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input Card */}
      {activeBaby && (
        <div className="card w-full max-w-md mb-8">
          <h2 className="card-title mb-6">가족 정보 입력</h2>

          <div className="field-group">
            <label className="field-label">
              <span className="label-icon">👩</span> 엄마 이름
            </label>
            <input
              className="field-input"
              type="text"
              placeholder="엄마 이름을 입력하세요"
              value={activeBaby.momName}
              onChange={e => handleChange("momName", e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              <span className="label-icon">👨</span> 아빠 이름
            </label>
            <input
              className="field-input"
              type="text"
              placeholder="아빠 이름을 입력하세요"
              value={activeBaby.dadName}
              onChange={e => handleChange("dadName", e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              <span className="label-icon">👶</span> 아기 이름
            </label>
            <input
              className="field-input"
              type="text"
              placeholder="아기 이름을 입력하세요"
              value={activeBaby.babyName}
              onChange={e => handleChange("babyName", e.target.value)}
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              <span className="label-icon">🎂</span> 태어난(날) 날
              <span className="field-hint"> (과거·현재·미래 모두 입력 가능)</span>
            </label>
            <input
              className="field-input"
              type="date"
              value={activeBaby.birthDate}
              onChange={e => handleChange("birthDate", e.target.value)}
            />
          </div>

          <button
            className={`save-btn ${saved ? "saved" : ""}`}
            onClick={handleSave}
          >
            {saved ? "✓ 저장되었습니다!" : "저장하기"}
          </button>
        </div>
      )}

      {/* Day Counter / Pregnancy Card */}
      {activeBaby?.birthDate && (
        <div className="card w-full max-w-md day-card">
          <div className="day-card-header">
            <span className="baby-emoji">{isFuture ? "🤰" : "🍼"}</span>
            <h2 className="day-card-title">
              {activeBaby.babyName || "아기"}의 {isFuture ? "탄생 카운트다운" : "성장"}
            </h2>
          </div>

          <div className="birth-info">
            <span className="birth-label">{isFuture ? "출산 예정일" : "태어난 날"}</span>
            <span className="birth-date">{formatBirthDate(activeBaby.birthDate)}</span>
          </div>

          <div className="today-info">
            <span className="today-label">오늘</span>
            <span className="today-date">{todayStr}</span>
          </div>

          {isFuture ? (
            <div className="day-counter pregnancy-counter">
              <div className="day-number">{daysUntil}</div>
              <div className="day-text">일 후 탄생 🌟</div>
              {pregWeek !== null && pregWeek >= 0 && (
                <div className="age-text">임신 {pregWeek}주차</div>
              )}
              <div className="age-text">D-{daysUntil} ({getWeeksUntilBirth(activeBaby.birthDate)}주 남음)</div>
              {activeBaby.momName && activeBaby.dadName && (
                <div className="parents-love">
                  💕 {activeBaby.momName}와 {activeBaby.dadName}의 소중한 아기를 기다리는 중
                </div>
              )}
            </div>
          ) : days !== null ? (
            <div className="day-counter">
              <div className="day-number">{days.toLocaleString()}</div>
              <div className="day-text">일</div>
              <div className="age-text">{getAgeText(days)}</div>
              {activeBaby.momName && activeBaby.dadName && (
                <div className="parents-love">
                  💕 {activeBaby.momName}와 {activeBaby.dadName}의 사랑스러운 아기
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {!activeBaby?.birthDate && (
        <div className="empty-hint">
          <span>👆</span>
          <p>위에서 가족 정보와 아기 태어난(날) 날을 입력해 보세요!</p>
        </div>
      )}
    </div>
  );
}
