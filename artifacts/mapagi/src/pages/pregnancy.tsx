import { useState } from "react";

interface PregnancyNote {
  id: string;
  week: number;
  date: string;
  category: "health" | "checkup" | "diet" | "exercise" | "emotion" | "other";
  content: string;
}

const CATEGORIES = {
  health: "건강",
  checkup: "검진",
  diet: "식단",
  exercise: "운동",
  emotion: "감정",
  other: "기타",
};

const WEEKLY_TIPS: Record<number, { baby: string; mom: string; checkpoints: string[] }> = {
  4:  { baby: "수정란이 자궁에 착상되었어요 🌱", mom: "임신 초기 피로감이 올 수 있어요", checkpoints: ["엽산 복용 시작", "카페인 줄이기", "임신 확인 검사"] },
  8:  { baby: "심장 박동이 시작돼요 💓", mom: "입덧이 심해질 수 있어요", checkpoints: ["첫 산전 검사 예약", "엽산·철분 보충제", "음주·흡연 완전 금지"] },
  12: { baby: "손가락·발가락이 생겨요 🤲", mom: "입덧이 점차 줄어들어요", checkpoints: ["NT 초음파 검사", "혈액 검사", "목덜미 투명대 검사"] },
  16: { baby: "태동을 느낄 수 있어요 🐣", mom: "배가 눈에 띄게 불러요", checkpoints: ["양수 검사 고려", "기형아 검사 2차", "철분 보충제 복용"] },
  20: { baby: "성별 확인 가능해요 👶", mom: "임신선·튼살이 생길 수 있어요", checkpoints: ["정밀 초음파 (20주)", "성별 확인", "튼살 크림 사용"] },
  24: { baby: "청각이 발달해 소리에 반응해요 👂", mom: "허리 통증이 올 수 있어요", checkpoints: ["임신성 당뇨 검사", "태동 기록 시작", "허리 쿠션 사용"] },
  28: { baby: "눈을 뜨고 감을 수 있어요 👁", mom: "손발 부종이 시작될 수 있어요", checkpoints: ["빈혈 검사", "3차 초음파", "조기 진통 증상 숙지"] },
  32: { baby: "체중이 빠르게 늘어요 ⚖️", mom: "숨이 차고 소화가 어려울 수 있어요", checkpoints: ["산전 진찰 2주마다", "분만 병원 확정", "출산 교실 참여"] },
  36: { baby: "두개골이 단단해지고 있어요 🦴", mom: "골반이 열리기 시작해요", checkpoints: ["GBS 검사", "출산 가방 준비", "분만 계획서 작성"] },
  40: { baby: "출산 예정! 건강하게 태어날 준비 완료 🎉", mom: "가진통과 진진통 구분 연습하세요", checkpoints: ["진통 시작 시 병원 연락", "파수 시 즉시 병원", "마지막 초음파 확인"] },
};

function getWeekTip(week: number) {
  const keys = Object.keys(WEEKLY_TIPS).map(Number).sort((a, b) => a - b);
  let matched = keys[0];
  for (const k of keys) { if (week >= k) matched = k; else break; }
  return WEEKLY_TIPS[matched];
}

function getCurrentPregnancyWeek(birthDate: string): number {
  if (!birthDate) return 0;
  const due = new Date(birthDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const week = 40 - Math.ceil(daysLeft / 7);
  return Math.max(1, Math.min(40, week));
}

const ESSENTIAL_CHECKLIST = [
  { category: "임신 초기 (1~12주)", items: ["엽산 복용", "산부인과 첫 방문", "임신 보험 가입 검토", "직장 임신 보고", "카페인·술·담배 금지", "구역감 대비 소화제·생강차"] },
  { category: "임신 중기 (13~27주)", items: ["기형아 검사", "임신성 당뇨 검사", "철분제 복용 시작", "태교 음악 & 독서", "태동 일지 시작", "출산 병원 결정"] },
  { category: "임신 후기 (28~40주)", items: ["분만 가방 준비", "신생아 물품 구매", "출산 교실 수강", "GBS 검사", "수유 준비 (유축기·수유 패드)", "산후도우미 예약"] },
];

export default function PregnancyPage() {
  const savedFamily = (() => { try { return JSON.parse(localStorage.getItem("mapagi-family") || "{}"); } catch { return {}; } })();
  const birthDate: string = savedFamily.birthDate || "";
  const babyName: string = savedFamily.babyName || "아기";
  const momName: string = savedFamily.momName || "엄마";

  const currentWeek = getCurrentPregnancyWeek(birthDate);
  const tip = getWeekTip(currentWeek);

  const [notes, setNotes] = useState<PregnancyNote[]>(() => {
    try { return JSON.parse(localStorage.getItem("mapagi-pregnancy-notes") || "[]"); } catch { return []; }
  });

  const [newNote, setNewNote] = useState<Omit<PregnancyNote, "id">>({
    week: currentWeek,
    date: new Date().toISOString().split("T")[0],
    category: "other",
    content: "",
  });

  const [activeTab, setActiveTab] = useState<"journal" | "checklist" | "weekly">("weekly");

  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("mapagi-pregnancy-checklist") || "{}"); } catch { return {}; }
  });

  function saveNote() {
    if (!newNote.content.trim()) return;
    const entry: PregnancyNote = { ...newNote, id: Date.now().toString() };
    const updated = [...notes, entry];
    setNotes(updated);
    localStorage.setItem("mapagi-pregnancy-notes", JSON.stringify(updated));
    setNewNote(p => ({ ...p, content: "" }));
  }

  function removeNote(id: string) {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem("mapagi-pregnancy-notes", JSON.stringify(updated));
  }

  function toggleCheck(key: string) {
    const updated = { ...checklist, [key]: !checklist[key] };
    setChecklist(updated);
    localStorage.setItem("mapagi-pregnancy-checklist", JSON.stringify(updated));
  }

  const daysLeft = birthDate ? Math.max(0, Math.ceil((new Date(birthDate).getTime() - new Date().setHours(0,0,0,0)) / (1000*60*60*24))) : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">🤰 임신일지</h2>
        <p className="page-subtitle">{momName}의 소중한 임신 여정을 기록해요</p>
        {birthDate && daysLeft !== null && (
          <div className="pregnancy-countdown">
            <span className="countdown-num">D-{daysLeft}</span>
            <span className="countdown-label"> · 임신 {currentWeek}주차</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {currentWeek > 0 && (
        <div className="preg-progress-wrap">
          <div className="preg-progress-label">{currentWeek}주 / 40주</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(currentWeek / 40) * 100}%`, background: "#f472b6" }} />
          </div>
        </div>
      )}

      {/* Tab nav */}
      <div className="daily-tabs">
        <button className={`dtab ${activeTab === "weekly" ? "active" : ""}`} onClick={() => setActiveTab("weekly")}>📅 주차 정보</button>
        <button className={`dtab ${activeTab === "journal" ? "active" : ""}`} onClick={() => setActiveTab("journal")}>📓 일지</button>
        <button className={`dtab ${activeTab === "checklist" ? "active" : ""}`} onClick={() => setActiveTab("checklist")}>✅ 체크리스트</button>
      </div>

      {/* Weekly info tab */}
      {activeTab === "weekly" && tip && (
        <div className="tab-content">
          <div className="week-tip-card">
            <div className="week-tip-header">
              <span className="week-tip-week">{currentWeek}주차</span>
              <span className="week-tip-title">이번 주 태아 정보</span>
            </div>
            <div className="week-tip-baby">👶 {tip.baby}</div>
            <div className="week-tip-mom">💝 엄마: {tip.mom}</div>
            <div className="week-tip-checkpoints">
              <div className="wtp-label">이번 주 체크포인트</div>
              {tip.checkpoints.map((c, i) => (
                <div key={i} className="wtp-item">✓ {c}</div>
              ))}
            </div>
          </div>

          {/* Week navigator */}
          <div className="week-nav">
            {[4, 8, 12, 16, 20, 24, 28, 32, 36, 40].map(w => (
              <button key={w} className={`week-nav-btn ${currentWeek >= w ? "done" : ""} ${currentWeek >= w && (WEEKLY_TIPS[w] ? true : false) ? "current" : ""}`}>
                {w}주
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Journal tab */}
      {activeTab === "journal" && (
        <div className="tab-content">
          <div className="add-card">
            <h4 className="add-title">임신 일지 기록</h4>
            <div className="add-row">
              <div className="add-field">
                <label>날짜</label>
                <input type="date" value={newNote.date} onChange={e => setNewNote(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="add-field">
                <label>임신 주차</label>
                <input type="number" min={1} max={40} value={newNote.week}
                  onChange={e => setNewNote(p => ({ ...p, week: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="add-field" style={{ marginBottom: 8 }}>
              <label>분류</label>
              <select value={newNote.category} onChange={e => setNewNote(p => ({ ...p, category: e.target.value as any }))}>
                {(Object.entries(CATEGORIES) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <textarea className="add-textarea" placeholder="오늘의 태동, 몸 상태, 감정, 음식 등을 기록해 보세요..."
              value={newNote.content} onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))} />
            <button className="btn-add" onClick={saveNote}>+ 일지 추가</button>
          </div>
          <div className="record-list">
            {notes.length === 0 && <div className="empty-record">아직 일지가 없어요 📓</div>}
            {[...notes].reverse().map(n => (
              <div key={n.id} className="record-item">
                <div className="record-time">{n.date}</div>
                <div className="record-main">
                  <span className="note-cat">{CATEGORIES[n.category]} · {n.week}주</span>
                  <span className="record-title">{n.content}</span>
                </div>
                <button className="record-del" onClick={() => removeNote(n.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist tab */}
      {activeTab === "checklist" && (
        <div className="tab-content">
          {ESSENTIAL_CHECKLIST.map(section => (
            <div key={section.category} className="checklist-section">
              <h4 className="checklist-section-title">{section.category}</h4>
              {section.items.map(item => {
                const key = `${section.category}-${item}`;
                return (
                  <label key={key} className={`checklist-item ${checklist[key] ? "checked" : ""}`}>
                    <input type="checkbox" checked={!!checklist[key]} onChange={() => toggleCheck(key)} />
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
