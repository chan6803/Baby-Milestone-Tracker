import { useState, useEffect } from "react";

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
  feedInterval: number;
  feedings: FeedingEntry[];
  sleeps: SleepEntry[];
  notes: SpecialNote[];
  alarmEnabled: boolean;
  lastAlarmTime: string;
}

const todayKey = () => new Date().toISOString().split("T")[0];

function loadToday(): DailyData {
  try {
    const raw = localStorage.getItem(`mapagi-daily-${todayKey()}`);
    return raw ? JSON.parse(raw) : { feedInterval: 3, feedings: [], sleeps: [], notes: [], alarmEnabled: false, lastAlarmTime: "" };
  } catch { return { feedInterval: 3, feedings: [], sleeps: [], notes: [], alarmEnabled: false, lastAlarmTime: "" }; }
}

function saveToday(data: DailyData) {
  localStorage.setItem(`mapagi-daily-${todayKey()}`, JSON.stringify(data));
}

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
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

const FEED_TYPE_LABELS = { formula: "분유", breast: "모유", mixed: "혼합" };
const NOTE_CATEGORIES = { health: "건강", milestone: "성장", other: "기타" };

export default function DailyPage() {
  const savedFamily = (() => { try { return JSON.parse(localStorage.getItem("mapagi-family") || "{}"); } catch { return {}; } })();
  const babyName: string = savedFamily.babyName || "아기";

  const [data, setData] = useState<DailyData>(loadToday);
  const [tab, setTab] = useState<"feed" | "sleep" | "note">("feed");

  const [newFeed, setNewFeed] = useState<Omit<FeedingEntry, "id">>({ time: nowTime(), amount: 120, type: "formula", note: "" });
  const [newSleep, setNewSleep] = useState<Omit<SleepEntry, "id">>({ startTime: nowTime(), endTime: "", note: "" });
  const [newNote, setNewNote] = useState<Omit<SpecialNote, "id">>({ time: nowTime(), content: "", category: "other" });

  const [alarmSet, setAlarmSet] = useState(false);

  function update(partial: Partial<DailyData>) {
    const next = { ...data, ...partial };
    setData(next);
    saveToday(next);
  }

  const lastFeeding = data.feedings.length > 0 ? data.feedings[data.feedings.length - 1] : null;
  const nextFeedTime = lastFeeding ? addMinutes(lastFeeding.time, data.feedInterval * 60) : null;

  function addFeeding() {
    const entry: FeedingEntry = { ...newFeed, id: Date.now().toString() };
    update({ feedings: [...data.feedings, entry] });
    setNewFeed({ time: nowTime(), amount: 120, type: "formula", note: "" });

    if (data.alarmEnabled && "Notification" in window) {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") {
          const next = addMinutes(entry.time, data.feedInterval * 60);
          setAlarmSet(true);
          setTimeout(() => setAlarmSet(false), 3000);
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">📋 오늘 기록</h2>
        <p className="page-subtitle">{babyName}의 오늘 하루를 기록해요</p>
        <div className="daily-date">{new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric", weekday:"long" })}</div>
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
            <div className="next-feed-sub">({data.feedInterval}시간 주기 · 마지막 {lastFeeding?.time})</div>
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

      {/* Interval selector */}
      <div className="interval-selector">
        <span className="interval-label">수유 주기</span>
        <div className="interval-options">
          {[2, 2.5, 3, 3.5, 4].map(h => (
            <button key={h} className={`interval-btn ${data.feedInterval === h ? "active" : ""}`}
              onClick={() => update({ feedInterval: h })}>
              {h}시간
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
            <textarea className="add-textarea" placeholder="내용을 입력하세요 (체온, 대소변, 웃음, 뒤집기 등...)"
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
