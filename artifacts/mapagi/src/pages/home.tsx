import { useState, useEffect } from "react";

interface FamilyInfo {
  momName: string;
  dadName: string;
  babyName: string;
  birthDate: string;
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

export default function Home() {
  const [family, setFamily] = useState<FamilyInfo>(() => {
    try {
      const saved = localStorage.getItem("mapagi-family");
      return saved ? JSON.parse(saved) : { momName: "", dadName: "", babyName: "", birthDate: "" };
    } catch {
      return { momName: "", dadName: "", babyName: "", birthDate: "" };
    }
  });

  const [saved, setSaved] = useState(false);
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const days = getDaysSinceBirth(family.birthDate);

  function handleChange(field: keyof FamilyInfo, value: string) {
    setFamily(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem("mapagi-family", JSON.stringify(family));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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
          <span className="normal-char">, 그리고 아</span>
          <span className="highlight-char">기</span>
        </h1>
        <p className="subtitle">우리 가족 아기 성장 기록</p>
      </div>

      {/* Input Card */}
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
            value={family.momName}
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
            value={family.dadName}
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
            value={family.babyName}
            onChange={e => handleChange("babyName", e.target.value)}
          />
        </div>

        <div className="field-group">
          <label className="field-label">
            <span className="label-icon">🎂</span> 태어난 날
          </label>
          <input
            className="field-input"
            type="date"
            value={family.birthDate}
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

      {/* Day Counter Card */}
      {family.birthDate && (
        <div className="card w-full max-w-md day-card">
          <div className="day-card-header">
            <span className="baby-emoji">🍼</span>
            <h2 className="day-card-title">
              {family.babyName || "아기"}의 성장
            </h2>
          </div>

          <div className="birth-info">
            <span className="birth-label">태어난 날</span>
            <span className="birth-date">{formatBirthDate(family.birthDate)}</span>
          </div>

          <div className="today-info">
            <span className="today-label">오늘</span>
            <span className="today-date">{todayStr}</span>
          </div>

          {days !== null ? (
            <div className="day-counter">
              <div className="day-number">{days.toLocaleString()}</div>
              <div className="day-text">일</div>
              <div className="age-text">{getAgeText(days)}</div>
              {family.momName && family.dadName && (
                <div className="parents-love">
                  💕 {family.momName}와 {family.dadName}의 사랑스러운 아기
                </div>
              )}
            </div>
          ) : (
            <div className="future-birth">
              <p>아직 태어나지 않은 날짜입니다 🌟</p>
            </div>
          )}
        </div>
      )}

      {!family.birthDate && (
        <div className="empty-hint">
          <span>👆</span>
          <p>위에서 가족 정보와 아기 태어난 날을 입력해 보세요!</p>
        </div>
      )}
    </div>
  );
}
