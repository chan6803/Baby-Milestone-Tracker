import { useState } from "react";

interface FeedingEntry {
  id: string;
  time: string;
  amount: number;
  type: "formula" | "breast" | "mixed";
  note: string;
}

interface SleepEntry {
  id: string;
  startTime: string;
  endTime: string;
  note: string;
}

interface SpecialNote {
  id: string;
  time: string;
  content: string;
  category: "health" | "milestone" | "other";
}

interface DailyData {
  feedIntervalHours: number;
  feedIntervalMins: number;
  feedings: FeedingEntry[];
  sleeps: SleepEntry[];
  notes: SpecialNote[];
  alarmEnabled: boolean;
  lastAlarmTime: string;
}

// 일수별 권장 수유량 (ml/회)
function getRecommendedFeedingAmount(days: number | null): { min: number; max: number; perDay: number } | null {
  if (days === null) return null;
  if (days <= 3)   return { min: 20,  max: 30,  perDay: 8 };
  if (days <= 7)   return { min: 30,  max: 60,  perDay: 8 };
  if (days <= 14)  return { min: 60,  max: 90,  perDay: 8 };
  if (days <= 30)  return { min: 90,  max: 120, perDay: 8 };
  if (days <= 60)  return { min: 120, max: 150, perDay: 7 };
  if (days <= 90)  return { min: 150, max: 180, perDay: 6 };
  if (days <= 120) return { min: 150, max: 200, perDay: 6 };
  if (days <= 180) return { min: 180, max: 240, perDay: 5 };
  if (days <= 270) return { min: 200, max: 240, perDay: 4 };
  return { min: 200, max: 240, perDay: 3 };
}

// 일수별 권장 수면 시간
function getRecommendedSleep(days: number | null): { hours: string; info: string } | null {
  if (days === null) return null;
  if (days <= 30)  return { hours: "16~18시간", info: "신생아는 2~3시간마다 깨서 수유해요" };
  if (days <= 90)  return { hours: "15~17시간", info: "낮잠 3~4회, 밤잠 5~6시간씩 잘 수 있어요" };
  if (days <= 180) return { hours: "14~16시간", info: "낮잠 2~3회, 밤에 더 길게 잠들기 시작해요" };
  if (days <= 365) return { hours: "12~15시간", info: "낮잠 2회, 밤잠 10~12시간으로 정착돼요" };
  return { hours: "11~14시간", info: "낮잠 1회, 규칙적인 수면 패턴이 형성돼요" };
}

// 일수별 발달 이정표
interface Milestone {
  title: string;
  desc: string;
}
function getMilestones(days: number | null): Milestone[] {
  if (days === null) return [];
  if (days <= 30)  return [
    { title: "반사 행동", desc: "빨기·잡기·모로반사 등 기본 반사 반응이 활발해요" },
    { title: "얼굴 응시", desc: "20~30cm 거리의 얼굴을 응시할 수 있어요" },
    { title: "소리 반응", desc: "큰 소리에 놀라는 반응을 보여요" },
  ];
  if (days <= 60)  return [
    { title: "사회적 미소", desc: "엄마·아빠를 보고 미소 지을 수 있어요 😊" },
    { title: "소리 내기", desc: "'아~', '우~' 같은 소리를 내요" },
    { title: "목 가누기 시작", desc: "엎드렸을 때 잠깐 머리를 들 수 있어요" },
  ];
  if (days <= 90)  return [
    { title: "목 가누기", desc: "머리를 90도 들 수 있어요" },
    { title: "옹알이", desc: "다양한 소리로 옹알이를 해요" },
    { title: "손 바라보기", desc: "자신의 손을 바라보고 관심 보여요" },
  ];
  if (days <= 150) return [
    { title: "뒤집기 준비", desc: "옆으로 굴러가기 시작해요" },
    { title: "웃음 소리", desc: "소리 내어 웃을 수 있어요" },
    { title: "물건 잡기", desc: "손으로 딸랑이를 잡을 수 있어요" },
  ];
  if (days <= 210) return [
    { title: "뒤집기", desc: "앞뒤로 완전히 뒤집기가 가능해요" },
    { title: "이앓이", desc: "잇몸이 간지러울 수 있어요 🦷" },
    { title: "이유식 준비", desc: "이유식을 시작할 준비가 됐어요" },
  ];
  if (days <= 270) return [
    { title: "혼자 앉기", desc: "지지 없이 혼자 앉을 수 있어요" },
    { title: "낯가림", desc: "낯선 사람을 보고 울 수 있어요" },
    { title: "손 내밀기", desc: "원하는 물건에 손을 뻗어요" },
  ];
  if (days <= 365) return [
    { title: "기기", desc: "네 발로 기어 다닐 수 있어요" },
    { title: "잡고 서기", desc: "가구를 잡고 설 수 있어요 🧍" },
    { title: "엄마·아빠", desc: "'엄마', '아빠' 단어를 말할 수 있어요" },
  ];
  return [
    { title: "걸음마", desc: "혼자 걷기를 시작해요 👟" },
    { title: "단어 말하기", desc: "2~5개 단어를 사용할 수 있어요" },
    { title: "컵 사용", desc: "컵으로 음료를 마실 수 있어요" },
  ];
}

const todayKey = () => new Date().toISOString().split("T")[0];

function loadToday(): DailyData {
  try {
    const raw = localStorage.getItem(`mapagi-daily-${todayKey()}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      // migrate old feedInterval
      if (parsed.feedInterval !== undefined && parsed.feedIntervalHours === undefined) {
        parsed.feedIntervalHours = Math.floor(parsed.feedInterval);
        parsed.feedIntervalMins = Math.round((parsed.feedInterval % 1) * 60);
      }
      return parsed;
    }
  } catch {}
  return { feedIntervalHours: 3, feedIntervalMins: 0, feedings: [], sleeps: [], notes: [], alarmEnabled: false, lastAlarmTime: "" };
}

function saveToday(data: DailyData) {
  localStorage.setItem(`mapagi-daily-${todayKey()}`, JSON.stringify(data));
}

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
}

function addMinutes(time: string, totalMins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + totalMins;
  return `${String(Math.floor(total / 60) % 24).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
}

function calcSleepDuration(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
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

const FEED_TYPE_LABELS = { formula: "분유", breast: "모유", mixed: "혼합" };
const NOTE_CATEGORIES = { health: "건강", milestone: "성장", other: "기타" };

export default function DailyPage() {
  const savedFamily = (() => {
    try {
      // try active baby first
      const babies = JSON.parse(localStorage.getItem("mapagi-babies") || "[]");
      const activeId = localStorage.getItem("mapagi-active-baby");
      const baby = babies.find((b: any) => b.id === activeId) || babies[0];
      if (baby) return baby;
      return JSON.parse(localStorage.getItem("mapagi-family") || "{}");
    } catch { return {}; }
  })();
  const babyName: string = savedFamily.babyName || "아기";
  const birthDate: string = savedFamily.birthDate || "";
  const days = getDaysSinceBirth(birthDate);

  const [data, setData] = useState<DailyData>(loadToday);
  const [tab, setTab] = useState<"feed" | "sleep" | "note">("feed");

  const [newFeed, setNewFeed] = useState<Omit<FeedingEntry, "id">>({ time: nowTime(), amount: 120, type: "formula", note: "" });
  const [newSleep, setNewSleep] = useState<Omit<SleepEntry, "id">>({ startTime: nowTime(), endTime: "", note: "" });
  const [newNote, setNewNote] = useState<Omit<SpecialNote, "id">>({ time: nowTime(), content: "", category: "other" });

  function update(partial: Partial<DailyData>) {
    const next = { ...data, ...partial };
    setData(next);
    saveToday(next);
  }

  const totalIntervalMins = data.feedIntervalHours * 60 + data.feedIntervalMins;
  const lastFeeding = data.feedings.length > 0 ? data.feedings[data.feedings.length - 1] : null;
  const nextFeedTime = lastFeeding ? addMinutes(lastFeeding.time, totalIntervalMins) : null;

  function addFeeding() {
    const entry: FeedingEntry = { ...newFeed, id: Date.now().toString() };
    update({ feedings: [...data.feedings, entry] });
    setNewFeed({ time: nowTime(), amount: 120, type: "formula", note: "" });

    if (data.alarmEnabled && "Notification" in window) {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") {
          setTimeout(() => setData(d => d), 500);
        }
      });
    }
  }

  function addSleep() {
    const entry: SleepEntry = { ...newSleep, id: Date.now().toString() };
    update({ sleeps: [...data.sleeps, entry] });
    setNewSleep({ startTime: nowTime(), endTime: "", note: "" });
  }

  function addNote() {
    if (!newNote.content.trim()) return;
    const entry: SpecialNote = { ...newNote, id: Date.now().toString() };
    update({ notes: [...data.notes, entry] });
    setNewNote({ time: nowTime(), content: "", category: "other" });
  }

  function removeFeeding(id: string) { update({ feedings: data.feedings.filter(f => f.id !== id) }); }
  function removeSleep(id: string) { update({ sleeps: data.sleeps.filter(s => s.id !== id) }); }
  function removeNote(id: string) { update({ notes: data.notes.filter(n => n.id !== id) }); }

  const totalFeedAmount = data.feedings.reduce((sum, f) => sum + f.amount, 0);
  const totalSleepMins = data.sleeps.reduce((sum, s) => {
    if (!s.startTime || !s.endTime) return sum;
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    let m = (eh * 60 + em) - (sh * 60 + sm);
    if (m < 0) m += 24 * 60;
    return sum + m;
  }, 0);

  const recFeeding = getRecommendedFeedingAmount(days);
  const recSleep = getRecommendedSleep(days);
  const milestones = getMilestones(days);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">📋 오늘 기록</h2>
        <p className="page-subtitle">{babyName}의 오늘 하루를 기록해요</p>
        <div className="daily-date">{new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric", weekday:"long" })}</div>
        {days !== null && <div className="baby-days-badge">생후 {days}일째</div>}
      </div>

      {/* Summary bar */}
      <div className="daily-summary">
        <div className="summary-item">
          <span className="summary-icon">🍼</span>
          <div>
            <div className="summary-val">{data.feedings.length}회</div>
            <div className="summary-label">총 수유</div>
          </div>
        </div>
        <div className="summary-divider"/>
        <div className="summary-item">
          <span className="summary-icon">💧</span>
          <div>
            <div className="summary-val">{totalFeedAmount}ml</div>
            <div className="summary-label">총 수유량</div>
          </div>
        </div>
        <div className="summary-divider"/>
        <div className="summary-item">
          <span className="summary-icon">😴</span>
          <div>
            <div className="summary-val">{Math.floor(totalSleepMins/60)}h {totalSleepMins%60}m</div>
            <div className="summary-label">총 수면</div>
          </div>
        </div>
      </div>

      {/* Next feeding & alarm */}
      {nextFeedTime && (
        <div className="next-feed-card">
          <div className="next-feed-left">
            <div className="next-feed-label">다음 수유 예정</div>
            <div className="next-feed-time">{nextFeedTime}</div>
            <div className="next-feed-sub">({data.feedIntervalHours}시간 {data.feedIntervalMins > 0 ? `${data.feedIntervalMins}분` : ""} 주기 · 마지막 {lastFeeding?.time})</div>
          </div>
          <div className="next-feed-right">
            <label className="alarm-toggle">
              <input type="checkbox" checked={data.alarmEnabled}
                onChange={e => {
                  update({ alarmEnabled: e.target.checked });
                  if (e.target.checked && "Notification" in window) Notification.requestPermission();
                }} />
              <span className="alarm-slider"/>
            </label>
            <div className="alarm-label">{data.alarmEnabled ? "🔔 알람 ON" : "🔕 알람 OFF"}</div>
          </div>
        </div>
      )}

      {/* Interval selector - direct input */}
      <div className="interval-selector">
        <span className="interval-label">수유 주기</span>
        <div className="interval-direct-input">
          <div className="interval-field">
            <input
              type="number" min={0} max={12} value={data.feedIntervalHours}
              onChange={e => update({ feedIntervalHours: Math.max(0, Math.min(12, Number(e.target.value))) })}
            />
            <span className="interval-unit">시간</span>
          </div>
          <div className="interval-field">
            <input
              type="number" min={0} max={59} step={5} value={data.feedIntervalMins}
              onChange={e => update({ feedIntervalMins: Math.max(0, Math.min(59, Number(e.target.value))) })}
            />
            <span className="interval-unit">분</span>
          </div>
        </div>
        <div className="interval-presets">
          {[[2,0],[2,30],[3,0],[3,30],[4,0]].map(([h,m]) => (
            <button key={`${h}:${m}`}
              className={`interval-btn ${data.feedIntervalHours === h && data.feedIntervalMins === m ? "active" : ""}`}
              onClick={() => update({ feedIntervalHours: h, feedIntervalMins: m })}>
              {h}시간{m > 0 ? `${m}분` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="daily-tabs">
        <button className={`dtab ${tab === "feed" ? "active" : ""}`} onClick={() => setTab("feed")}>🍼 수유</button>
        <button className={`dtab ${tab === "sleep" ? "active" : ""}`} onClick={() => setTab("sleep")}>😴 수면</button>
        <button className={`dtab ${tab === "note" ? "active" : ""}`} onClick={() => setTab("note")}>📝 특이사항</button>
      </div>

      {/* Feed tab */}
      {tab === "feed" && (
        <div className="tab-content">
          {/* Recommended feeding info */}
          {recFeeding && (
            <div className="rec-info-card feed-rec">
              <span className="rec-icon">📊</span>
              <div>
                <div className="rec-title">생후 {days}일 권장 수유량</div>
                <div className="rec-value">1회 {recFeeding.min}~{recFeeding.max}ml · 하루 {recFeeding.perDay}회</div>
                <div className="rec-today">오늘 목표: 약 {recFeeding.min * recFeeding.perDay}~{recFeeding.max * recFeeding.perDay}ml</div>
              </div>
            </div>
          )}
          <div className="add-card">
            <h4 className="add-title">수유 기록 추가</h4>
            <div className="add-row">
              <div className="add-field">
                <label>시간</label>
                <input type="time" value={newFeed.time} onChange={e => setNewFeed(p => ({...p, time: e.target.value}))} />
              </div>
              <div className="add-field">
                <label>수유량(ml)</label>
                <input type="number" min={0} max={500} step={10} value={newFeed.amount}
                  onChange={e => setNewFeed(p => ({...p, amount: Number(e.target.value)}))} />
              </div>
            </div>
            <div className="feed-type-row">
              {(["formula","breast","mixed"] as const).map(t => (
                <button key={t} className={`type-btn ${newFeed.type === t ? "active" : ""}`}
                  onClick={() => setNewFeed(p => ({...p, type: t}))}>
                  {FEED_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <input className="add-input-full" type="text" placeholder="메모 (선택)" value={newFeed.note}
              onChange={e => setNewFeed(p => ({...p, note: e.target.value}))} />
            <button className="btn-add" onClick={addFeeding}>+ 수유 기록 추가</button>
          </div>
          <div className="record-list">
            {data.feedings.length === 0 && <div className="empty-record">수유 기록이 없어요 🍼</div>}
            {[...data.feedings].reverse().map(f => (
              <div key={f.id} className="record-item">
                <div className="record-time">{f.time}</div>
                <div className="record-main">
                  <span className="record-title">{FEED_TYPE_LABELS[f.type]} {f.amount}ml</span>
                  {f.note && <span className="record-note">{f.note}</span>}
                </div>
                <button className="record-del" onClick={() => removeFeeding(f.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sleep tab */}
      {tab === "sleep" && (
        <div className="tab-content">
          {/* Recommended sleep info */}
          {recSleep && (
            <div className="rec-info-card sleep-rec">
              <span className="rec-icon">🌙</span>
              <div>
                <div className="rec-title">생후 {days}일 권장 수면</div>
                <div className="rec-value">하루 {recSleep.hours}</div>
                <div className="rec-today">{recSleep.info}</div>
              </div>
            </div>
          )}
          <div className="add-card">
            <h4 className="add-title">수면 기록 추가</h4>
            <div className="add-row">
              <div className="add-field">
                <label>잠든 시간</label>
                <input type="time" value={newSleep.startTime} onChange={e => setNewSleep(p => ({...p, startTime: e.target.value}))} />
              </div>
              <div className="add-field">
                <label>일어난 시간</label>
                <input type="time" value={newSleep.endTime} onChange={e => setNewSleep(p => ({...p, endTime: e.target.value}))} />
              </div>
            </div>
            <input className="add-input-full" type="text" placeholder="메모 (선택)" value={newSleep.note}
              onChange={e => setNewSleep(p => ({...p, note: e.target.value}))} />
            <button className="btn-add" onClick={addSleep}>+ 수면 기록 추가</button>
          </div>
          <div className="record-list">
            {data.sleeps.length === 0 && <div className="empty-record">수면 기록이 없어요 😴</div>}
            {[...data.sleeps].reverse().map(s => (
              <div key={s.id} className="record-item">
                <div className="record-time">{s.startTime}</div>
                <div className="record-main">
                  <span className="record-title">{s.endTime ? `~ ${s.endTime}` : "자는 중..."} {s.endTime && <span className="sleep-dur">({calcSleepDuration(s.startTime, s.endTime)})</span>}</span>
                  {s.note && <span className="record-note">{s.note}</span>}
                </div>
                <button className="record-del" onClick={() => removeSleep(s.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note tab */}
      {tab === "note" && (
        <div className="tab-content">
          {/* Milestones hint */}
          {milestones.length > 0 && (
            <div className="milestone-hint-card">
              <div className="milestone-hint-title">✨ 생후 {days}일 발달 이정표</div>
              <div className="milestone-hint-list">
                {milestones.map((m, i) => (
                  <div key={i} className="milestone-hint-item">
                    <span className="milestone-badge">{m.title}</span>
                    <span className="milestone-desc">{m.desc}</span>
                  </div>
                ))}
              </div>
              <div className="milestone-hint-tip">💡 위 내용을 특이사항으로 기록해 보세요!</div>
            </div>
          )}
          <div className="add-card">
            <h4 className="add-title">특이사항 기록</h4>
            <div className="add-row">
              <div className="add-field">
                <label>시간</label>
                <input type="time" value={newNote.time} onChange={e => setNewNote(p => ({...p, time: e.target.value}))} />
              </div>
              <div className="add-field">
                <label>분류</label>
                <select value={newNote.category} onChange={e => setNewNote(p => ({...p, category: e.target.value as any}))}>
                  {(Object.entries(NOTE_CATEGORIES) as [string,string][]).map(([k,v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <textarea className="add-textarea" placeholder="내용을 입력하세요 (체온, 대소변, 미소, 뒤집기 등...)"
              value={newNote.content} onChange={e => setNewNote(p => ({...p, content: e.target.value}))} />
            <button className="btn-add" onClick={addNote}>+ 특이사항 추가</button>
          </div>
          <div className="record-list">
            {data.notes.length === 0 && <div className="empty-record">특이사항 기록이 없어요 📝</div>}
            {[...data.notes].reverse().map(n => (
              <div key={n.id} className="record-item">
                <div className="record-time">{n.time}</div>
                <div className="record-main">
                  <span className="note-cat">{NOTE_CATEGORIES[n.category]}</span>
                  <span className="record-title">{n.content}</span>
                </div>
                <button className="record-del" onClick={() => removeNote(n.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
