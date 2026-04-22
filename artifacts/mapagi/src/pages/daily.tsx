import { useState, useEffect, useRef } from "react";
import { isFirebaseConfigured, authReady } from "@/lib/firebase";
import {
  getLocalFamilyId, getLocalBabyId,
  syncDailyRecord, listenDailyRecord,
  syncGrowthEntry, deleteGrowthEntry, listenGrowthRecords,
  syncNoteEntry, deleteNoteEntry, listenNoteRecords,
} from "@/lib/family-sync";

// ── 타입 정의 ────────────────────────────────────────────────────
interface FeedingEntry {
  id: string; time: string; endTime?: string;
  amount: number;
  type: "formula" | "breast" | "mixed" | "weaning" | "snack";
  note: string;
}
interface SleepEntry {
  id: string; startTime: string; endTime: string; note: string;
}
// 키/몸무게: 누적 (날짜 포함)
interface GrowthEntry {
  id: string; date: string;
  height: number | ""; weight: number | ""; note: string;
}
// 특이사항: 누적 (날짜 포함)
interface SpecialNote {
  id: string; date: string; time: string; content: string;
  category: "health" | "milestone" | "other";
}
// 하루 기록 (수유·수면만)
interface DailyData {
  feedIntervalHours: number; feedIntervalMins: number;
  feedings: FeedingEntry[]; sleeps: SleepEntry[];
  alarmEnabled: boolean; lastAlarmTime: string;
}

// ── 권장량 / 수면 / 이정표 ────────────────────────────────────────
function getRecommendedFeedingAmount(days: number | null) {
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
function getRecommendedSleep(days: number | null) {
  if (days === null) return null;
  if (days <= 30)  return { hours: "16~18시간", info: "신생아는 2~3시간마다 깨서 수유해요" };
  if (days <= 90)  return { hours: "15~17시간", info: "낮잠 3~4회, 밤잠 5~6시간씩 잘 수 있어요" };
  if (days <= 180) return { hours: "14~16시간", info: "낮잠 2~3회, 밤에 더 길게 잠들기 시작해요" };
  if (days <= 365) return { hours: "12~15시간", info: "낮잠 2회, 밤잠 10~12시간으로 정착돼요" };
  return { hours: "11~14시간", info: "낮잠 1회, 규칙적인 수면 패턴이 형성돼요" };
}
interface Milestone { title: string; desc: string; }
function getMilestones(days: number | null): Milestone[] {
  if (days === null) return [];
  if (days <= 30)  return [{ title:"반사 행동",desc:"빨기·잡기·모로반사 등 기본 반사 반응이 활발해요" },{ title:"얼굴 응시",desc:"20~30cm 거리의 얼굴을 응시할 수 있어요" },{ title:"소리 반응",desc:"큰 소리에 놀라는 반응을 보여요" }];
  if (days <= 60)  return [{ title:"사회적 미소",desc:"엄마·아빠를 보고 미소 지을 수 있어요 😊" },{ title:"소리 내기",desc:"'아~', '우~' 같은 소리를 내요" },{ title:"목 가누기 시작",desc:"엎드렸을 때 잠깐 머리를 들 수 있어요" }];
  if (days <= 90)  return [{ title:"목 가누기",desc:"머리를 90도 들 수 있어요" },{ title:"옹알이",desc:"다양한 소리로 옹알이를 해요" },{ title:"손 바라보기",desc:"자신의 손을 바라보고 관심 보여요" }];
  if (days <= 150) return [{ title:"뒤집기 준비",desc:"옆으로 굴러가기 시작해요" },{ title:"웃음 소리",desc:"소리 내어 웃을 수 있어요" },{ title:"물건 잡기",desc:"손으로 딸랑이를 잡을 수 있어요" }];
  if (days <= 210) return [{ title:"뒤집기",desc:"앞뒤로 완전히 뒤집기가 가능해요" },{ title:"이앓이",desc:"잇몸이 간지러울 수 있어요 🦷" },{ title:"이유식 준비",desc:"이유식을 시작할 준비가 됐어요" }];
  if (days <= 270) return [{ title:"혼자 앉기",desc:"지지 없이 혼자 앉을 수 있어요" },{ title:"낯가림",desc:"낯선 사람을 보고 울 수 있어요" },{ title:"손 내밀기",desc:"원하는 물건에 손을 뻗어요" }];
  if (days <= 365) return [{ title:"기기",desc:"네 발로 기어 다닐 수 있어요" },{ title:"잡고 서기",desc:"가구를 잡고 설 수 있어요 🧍" },{ title:"엄마·아빠",desc:"'엄마', '아빠' 단어를 말할 수 있어요" }];
  return [{ title:"걸음마",desc:"혼자 걷기를 시작해요 👟" },{ title:"단어 말하기",desc:"2~5개 단어를 사용할 수 있어요" },{ title:"컵 사용",desc:"컵으로 음료를 마실 수 있어요" }];
}

// ── 유틸 ─────────────────────────────────────────────────────────
const todayKey = () => new Date().toISOString().split("T")[0];

const DEFAULT_DAILY: DailyData = {
  feedIntervalHours: 3, feedIntervalMins: 0,
  feedings: [], sleeps: [],
  alarmEnabled: false, lastAlarmTime: ""
};

function loadToday(): DailyData {
  try {
    const raw = localStorage.getItem(`mapagi-daily-${todayKey()}`);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.feedInterval !== undefined && p.feedIntervalHours === undefined) {
        p.feedIntervalHours = Math.floor(p.feedInterval);
        p.feedIntervalMins  = Math.round((p.feedInterval % 1) * 60);
      }
      return { ...DEFAULT_DAILY, ...p };
    }
  } catch {}
  return { ...DEFAULT_DAILY };
}
function saveLocalToday(d: DailyData) {
  localStorage.setItem(`mapagi-daily-${todayKey()}`, JSON.stringify(d));
}

// 키/몸무게·특이사항: 누적 localStorage
function loadGrowths(babyId: string): GrowthEntry[] {
  try { return JSON.parse(localStorage.getItem(`mapagi-growth-${babyId}`) || "[]"); } catch { return []; }
}
function saveGrowths(babyId: string, g: GrowthEntry[]) {
  localStorage.setItem(`mapagi-growth-${babyId}`, JSON.stringify(g));
}
function loadNotes(babyId: string): SpecialNote[] {
  try { return JSON.parse(localStorage.getItem(`mapagi-notes-${babyId}`) || "[]"); } catch { return []; }
}
function saveNotes(babyId: string, n: SpecialNote[]) {
  localStorage.setItem(`mapagi-notes-${babyId}`, JSON.stringify(n));
}

function nowTime() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
}
function addMinutes(t: string, m: number) {
  const [h, mm] = t.split(":").map(Number);
  const tot = h * 60 + mm + m;
  return `${String(Math.floor(tot/60)%24).padStart(2,"0")}:${String(tot%60).padStart(2,"0")}`;
}
function calcDuration(start: string, end: string) {
  if (!start || !end) return "";
  const [sh,sm] = start.split(":").map(Number);
  const [eh,em] = end.split(":").map(Number);
  let mins = (eh*60+em)-(sh*60+sm);
  if (mins < 0) mins += 1440;
  const h = Math.floor(mins/60), m = mins%60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}
function getDaysSinceBirth(b: string): number | null {
  if (!b) return null;
  const birth = new Date(b), today = new Date();
  birth.setHours(0,0,0,0); today.setHours(0,0,0,0);
  const d = today.getTime() - birth.getTime();
  return d < 0 ? null : Math.floor(d / 86400000) + 1;
}
function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}년 ${dt.getMonth()+1}월 ${dt.getDate()}일`;
}

const FEED_TYPE_LABELS: Record<string, string> = {
  formula:"분유", breast:"모유", mixed:"혼합", weaning:"이유식", snack:"간식"
};
const FEED_UNIT: Record<string, string> = {
  formula:"ml", breast:"ml", mixed:"ml", weaning:"g", snack:"g"
};
const NOTE_CATS = { health:"건강", milestone:"성장", other:"기타" };

type EditModal =
  | { type:"feed";   entry:FeedingEntry }
  | { type:"sleep";  entry:SleepEntry }
  | { type:"growth"; entry:GrowthEntry }
  | { type:"note";   entry:SpecialNote }
  | null;

// ── 날짜별 그룹핑 헬퍼 ───────────────────────────────────────────
function groupByDate<T extends { date: string }>(items: T[]): { date: string; items: T[] }[] {
  const map: Record<string, T[]> = {};
  for (const it of items) {
    if (!map[it.date]) map[it.date] = [];
    map[it.date].push(it);
  }
  return Object.entries(map)
    .sort(([a],[b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
}

// ════════════════════════════════════════════════════════════════
export default function DailyPage() {
  const savedFamily = (() => {
    try {
      const babies = JSON.parse(localStorage.getItem("mapagi-babies") || "[]");
      const activeId = localStorage.getItem("mapagi-active-baby");
      const baby = babies.find((b: any) => b.id === activeId) || babies[0];
      if (baby) return baby;
      return JSON.parse(localStorage.getItem("mapagi-family") || "{}");
    } catch { return {}; }
  })();
  const babyName: string  = savedFamily.babyName  || "아기";
  const birthDate: string = savedFamily.birthDate || "";
  const days = getDaysSinceBirth(birthDate);

  const familyId = getLocalFamilyId();
  const babyId   = getLocalBabyId();
  const isSynced = !!(isFirebaseConfigured && familyId && babyId);

  // ── 상태 ─────────────────────────────────────────────────────
  const [data, setData]             = useState<DailyData>(loadToday);
  const [growths, setGrowths]       = useState<GrowthEntry[]>(() => loadGrowths(babyId));
  const [notes, setNotes]           = useState<SpecialNote[]>(() => loadNotes(babyId));
  const [tab, setTab]               = useState<"feed"|"sleep"|"growth"|"note">("feed");
  const [syncStatus, setSyncStatus] = useState<"idle"|"syncing"|"synced">("idle");
  const [editModal, setEditModal]   = useState<EditModal>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [newFeed,   setNewFeed]   = useState<Omit<FeedingEntry,"id">>({ time:nowTime(), endTime:"", amount:120, type:"formula", note:"" });
  const [newSleep,  setNewSleep]  = useState<Omit<SleepEntry,"id">>({ startTime:nowTime(), endTime:"", note:"" });
  const [newGrowth, setNewGrowth] = useState<Omit<GrowthEntry,"id">>({ date:todayKey(), height:"", weight:"", note:"" });
  const [newNote,   setNewNote]   = useState<Omit<SpecialNote,"id">>({ date:todayKey(), time:nowTime(), content:"", category:"other" });

  // ── Firebase 구독: 수유·수면 (오늘 하루) ─────────────────────
  useEffect(() => {
    if (!isSynced) return;
    let unsub: (() => void) | null = null;
    authReady.then(() => {
      unsub = listenDailyRecord(familyId, babyId, todayKey(), (fb) => {
        if (fb) {
          const merged = { ...DEFAULT_DAILY, ...fb } as DailyData;
          setData(merged);
          saveLocalToday(merged);
        }
      });
    });
    return () => { if (unsub) unsub(); };
  }, [familyId, babyId, isSynced]);

  // ── Firebase 구독: 키/몸무게 (누적) ─────────────────────────
  useEffect(() => {
    if (!isSynced) return;
    let unsub: (() => void) | null = null;
    authReady.then(() => {
      unsub = listenGrowthRecords(familyId, babyId, (fb) => {
        const mapped = fb as GrowthEntry[];
        setGrowths(mapped);
        saveGrowths(babyId, mapped);
      });
    });
    return () => { if (unsub) unsub(); };
  }, [familyId, babyId, isSynced]);

  // ── Firebase 구독: 특이사항 (누적) ──────────────────────────
  useEffect(() => {
    if (!isSynced) return;
    let unsub: (() => void) | null = null;
    authReady.then(() => {
      unsub = listenNoteRecords(familyId, babyId, (fb) => {
        const mapped = fb as SpecialNote[];
        setNotes(mapped);
        saveNotes(babyId, mapped);
      });
    });
    return () => { if (unsub) unsub(); };
  }, [familyId, babyId, isSynced]);

  // ── 수유·수면 동기화 (디바운스) ──────────────────────────────
  async function syncToFirebase(nextData: DailyData) {
    if (!isSynced) return;
    setSyncStatus("syncing");
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        await authReady;
        await syncDailyRecord(familyId, babyId, todayKey(), nextData);
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 2000);
      } catch (e) { console.error("동기화 실패:", e); setSyncStatus("idle"); }
    }, 800);
  }

  function update(partial: Partial<DailyData>) {
    const next = { ...data, ...partial };
    setData(next); saveLocalToday(next); syncToFirebase(next);
  }

  // ── 수유 ──────────────────────────────────────────────────────
  function addFeeding() {
    update({ feedings: [...data.feedings, { ...newFeed, id: Date.now().toString() }] });
    setNewFeed({ time:nowTime(), endTime:"", amount:120, type:"formula", note:"" });
  }
  function removeFeeding(id: string) { update({ feedings: data.feedings.filter(f => f.id !== id) }); }

  // ── 수면 ──────────────────────────────────────────────────────
  function addSleep() {
    update({ sleeps: [...data.sleeps, { ...newSleep, id: Date.now().toString() }] });
    setNewSleep({ startTime:nowTime(), endTime:"", note:"" });
  }
  function removeSleep(id: string) { update({ sleeps: data.sleeps.filter(s => s.id !== id) }); }

  // ── 키/몸무게 (누적) ─────────────────────────────────────────
  async function addGrowth() {
    if (!newGrowth.height && !newGrowth.weight) return;
    const entry: GrowthEntry = { ...newGrowth, id: Date.now().toString() };
    const updated = [entry, ...growths].sort((a,b) => b.date.localeCompare(a.date));
    setGrowths(updated); saveGrowths(babyId, updated);
    if (isSynced) { await authReady; await syncGrowthEntry(familyId, babyId, entry.id, entry); }
    setNewGrowth({ date:todayKey(), height:"", weight:"", note:"" });
  }
  async function removeGrowth(id: string) {
    const updated = growths.filter(g => g.id !== id);
    setGrowths(updated); saveGrowths(babyId, updated);
    if (isSynced) { await authReady; await deleteGrowthEntry(familyId, babyId, id); }
  }
  async function saveGrowthEdit(entry: GrowthEntry) {
    const updated = growths.map(g => g.id === entry.id ? entry : g);
    setGrowths(updated); saveGrowths(babyId, updated);
    if (isSynced) { await authReady; await syncGrowthEntry(familyId, babyId, entry.id, entry); }
    setEditModal(null);
  }

  // ── 특이사항 (누적) ──────────────────────────────────────────
  async function addNote() {
    if (!newNote.content.trim()) return;
    const entry: SpecialNote = { ...newNote, id: Date.now().toString() };
    const updated = [entry, ...notes].sort((a,b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    setNotes(updated); saveNotes(babyId, updated);
    if (isSynced) { await authReady; await syncNoteEntry(familyId, babyId, entry.id, entry); }
    setNewNote({ date:todayKey(), time:nowTime(), content:"", category:"other" });
  }
  async function removeNote(id: string) {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated); saveNotes(babyId, updated);
    if (isSynced) { await authReady; await deleteNoteEntry(familyId, babyId, id); }
  }
  async function saveNoteEdit(entry: SpecialNote) {
    const updated = notes.map(n => n.id === entry.id ? entry : n);
    setNotes(updated); saveNotes(babyId, updated);
    if (isSynced) { await authReady; await syncNoteEntry(familyId, babyId, entry.id, entry); }
    setEditModal(null);
  }

  // ── 수유·수면 edit modal 저장 ────────────────────────────────
  function saveEdit() {
    if (!editModal) return;
    if (editModal.type === "feed") {
      update({ feedings: data.feedings.map(f => f.id === editModal.entry.id ? editModal.entry : f) });
    } else if (editModal.type === "sleep") {
      update({ sleeps: data.sleeps.map(s => s.id === editModal.entry.id ? editModal.entry : s) });
    } else if (editModal.type === "growth") {
      saveGrowthEdit(editModal.entry); return;
    } else if (editModal.type === "note") {
      saveNoteEdit(editModal.entry); return;
    }
    setEditModal(null);
  }

  // ── 집계 ──────────────────────────────────────────────────────
  const totalIntervalMins = data.feedIntervalHours * 60 + data.feedIntervalMins;
  const lastFeeding = data.feedings.length > 0 ? data.feedings[data.feedings.length - 1] : null;
  const nextFeedTime = lastFeeding ? addMinutes(lastFeeding.time, totalIntervalMins) : null;
  const totalFeedAmount = data.feedings.reduce((s, f) => s + (f.amount||0), 0);
  const totalSleepMins  = data.sleeps.reduce((s, sl) => {
    if (!sl.startTime || !sl.endTime) return s;
    const [sh,sm] = sl.startTime.split(":").map(Number);
    const [eh,em] = sl.endTime.split(":").map(Number);
    let m = (eh*60+em)-(sh*60+sm); if (m<0) m+=1440; return s+m;
  }, 0);

  const recFeeding = getRecommendedFeedingAmount(days);
  const recSleep   = getRecommendedSleep(days);
  const milestones = getMilestones(days);
  const growthGroups = groupByDate(growths);
  const noteGroups   = groupByDate(notes);

  return (
    <div className="page-container">
      {/* 헤더 */}
      <div className="page-header">
        <h2 className="page-title">📋 육아일지</h2>
        <p className="page-subtitle">{babyName}의 오늘 하루를 기록해요</p>
        <div className="daily-date">{new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"long"})}</div>
        {days !== null && <div className="baby-days-badge">생후 {days}일째</div>}
        {isSynced && (
          <div className="sync-badge">
            {syncStatus==="syncing"?"⏳ 동기화 중...":syncStatus==="synced"?"✅ 동기화 완료":"☁️ 가족 간 공유 중"}
          </div>
        )}
      </div>

      {/* 요약 */}
      <div className="daily-summary">
        <div className="summary-item">
          <span className="summary-icon">🍼</span>
          <div><div className="summary-val">{data.feedings.length}회</div><div className="summary-label">총 수유</div></div>
        </div>
        <div className="summary-divider"/>
        <div className="summary-item">
          <span className="summary-icon">💧</span>
          <div><div className="summary-val">{totalFeedAmount}ml</div><div className="summary-label">총 수유량</div></div>
        </div>
        <div className="summary-divider"/>
        <div className="summary-item">
          <span className="summary-icon">😴</span>
          <div><div className="summary-val">{Math.floor(totalSleepMins/60)}h {totalSleepMins%60}m</div><div className="summary-label">총 수면</div></div>
        </div>
        {growths[0] && (<>
          <div className="summary-divider"/>
          <div className="summary-item">
            <span className="summary-icon">📏</span>
            <div>
              <div className="summary-val">{growths[0].height ? `${growths[0].height}cm` : `${growths[0].weight}kg`}</div>
              <div className="summary-label">최근 측정</div>
            </div>
          </div>
        </>)}
      </div>

      {/* 다음 수유 예정 */}
      {nextFeedTime && (
        <div className="next-feed-card">
          <div className="next-feed-left">
            <div className="next-feed-label">다음 수유 예정</div>
            <div className="next-feed-time">{nextFeedTime}</div>
            <div className="next-feed-sub">({data.feedIntervalHours}시간 {data.feedIntervalMins>0?`${data.feedIntervalMins}분`:""} 주기 · 마지막 {lastFeeding?.time})</div>
          </div>
          <div className="next-feed-right">
            <label className="alarm-toggle">
              <input type="checkbox" checked={data.alarmEnabled}
                onChange={e => { update({alarmEnabled:e.target.checked}); if(e.target.checked&&"Notification" in window) Notification.requestPermission(); }} />
              <span className="alarm-slider"/>
            </label>
            <div className="alarm-label">{data.alarmEnabled?"🔔 알람 ON":"🔕 알람 OFF"}</div>
          </div>
        </div>
      )}

      {/* 수유 주기 */}
      <div className="interval-selector">
        <span className="interval-label">수유 주기</span>
        <div className="interval-direct-input">
          <div className="interval-field">
            <input type="number" min={0} max={12} value={data.feedIntervalHours}
              onChange={e => update({feedIntervalHours:Math.max(0,Math.min(12,Number(e.target.value)))})} />
            <span className="interval-unit">시간</span>
          </div>
          <div className="interval-field">
            <input type="number" min={0} max={59} step={5} value={data.feedIntervalMins}
              onChange={e => update({feedIntervalMins:Math.max(0,Math.min(59,Number(e.target.value)))})} />
            <span className="interval-unit">분</span>
          </div>
        </div>
        <div className="interval-presets">
          {([[2,0],[2,30],[3,0],[3,30],[4,0]] as [number,number][]).map(([h,m]) => (
            <button key={`${h}:${m}`} className={`interval-btn ${data.feedIntervalHours===h&&data.feedIntervalMins===m?"active":""}`}
              onClick={() => update({feedIntervalHours:h,feedIntervalMins:m})}>
              {h}시간{m>0?`${m}분`:""}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="daily-tabs">
        <button className={`dtab ${tab==="feed"   ?"active":""}`} onClick={()=>setTab("feed")}>🍼 수유</button>
        <button className={`dtab ${tab==="sleep"  ?"active":""}`} onClick={()=>setTab("sleep")}>😴 수면</button>
        <button className={`dtab ${tab==="growth" ?"active":""}`} onClick={()=>setTab("growth")}>📏 키/몸무게</button>
        <button className={`dtab ${tab==="note"   ?"active":""}`} onClick={()=>setTab("note")}>📝 특이사항</button>
      </div>

      {/* ── 수유 탭 ── */}
      {tab === "feed" && (
        <div className="tab-content">
          {recFeeding && (
            <div className="rec-info-card feed-rec">
              <span className="rec-icon">📊</span>
              <div>
                <div className="rec-title">생후 {days}일 권장 수유량</div>
                <div className="rec-value">1회 {recFeeding.min}~{recFeeding.max}ml · 하루 {recFeeding.perDay}회</div>
                <div className="rec-today">오늘 목표: 약 {recFeeding.min*recFeeding.perDay}~{recFeeding.max*recFeeding.perDay}ml</div>
              </div>
            </div>
          )}
          <div className="add-card">
            <h4 className="add-title">수유 기록 추가</h4>
            <div className="add-row">
              <div className="add-field">
                <label>시작 시간</label>
                <div className="time-now-row">
                  <input type="time" value={newFeed.time} onChange={e=>setNewFeed(p=>({...p,time:e.target.value}))} />
                  <button className="btn-now" onClick={()=>setNewFeed(p=>({...p,time:nowTime()}))}>지금</button>
                </div>
              </div>
              <div className="add-field">
                <label>끝난 시간</label>
                <div className="time-now-row">
                  <input type="time" value={newFeed.endTime||""} onChange={e=>setNewFeed(p=>({...p,endTime:e.target.value}))} />
                  <button className="btn-now" onClick={()=>setNewFeed(p=>({...p,endTime:nowTime()}))}>지금</button>
                </div>
              </div>
            </div>
            <div className="add-row">
              <div className="add-field">
                <label>수유량({FEED_UNIT[newFeed.type]})</label>
                <input type="number" min={0} max={1000} step={10} value={newFeed.amount}
                  onChange={e=>setNewFeed(p=>({...p,amount:Number(e.target.value)}))} />
              </div>
            </div>
            <div className="feed-type-row">
              {(["formula","breast","mixed","weaning","snack"] as const).map(t=>(
                <button key={t} className={`type-btn ${newFeed.type===t?"active":""}`}
                  onClick={()=>setNewFeed(p=>({...p,type:t}))}>{FEED_TYPE_LABELS[t]}</button>
              ))}
            </div>
            <input className="add-input-full" type="text" placeholder="메모 (선택)" value={newFeed.note}
              onChange={e=>setNewFeed(p=>({...p,note:e.target.value}))} />
            <button className="btn-add" onClick={addFeeding}>+ 수유 기록 추가</button>
          </div>
          <div className="record-list">
            {data.feedings.length===0 && <div className="empty-record">수유 기록이 없어요 🍼</div>}
            {[...data.feedings].reverse().map(f=>(
              <div key={f.id} className="record-item">
                <div className="record-time">{f.time}{f.endTime?`~${f.endTime}`:""}</div>
                <div className="record-main">
                  <span className="record-title">{FEED_TYPE_LABELS[f.type]} {f.amount}{FEED_UNIT[f.type]}</span>
                  {f.endTime&&f.time&&<span className="sleep-dur">({calcDuration(f.time,f.endTime)})</span>}
                  {f.note&&<span className="record-note">{f.note}</span>}
                </div>
                <button className="record-edit" onClick={()=>setEditModal({type:"feed",entry:{...f}})}>✏️</button>
                <button className="record-del" onClick={()=>removeFeeding(f.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 수면 탭 ── */}
      {tab === "sleep" && (
        <div className="tab-content">
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
                <div className="time-now-row">
                  <input type="time" value={newSleep.startTime} onChange={e=>setNewSleep(p=>({...p,startTime:e.target.value}))} />
                  <button className="btn-now" onClick={()=>setNewSleep(p=>({...p,startTime:nowTime()}))}>지금</button>
                </div>
              </div>
              <div className="add-field">
                <label>일어난 시간</label>
                <div className="time-now-row">
                  <input type="time" value={newSleep.endTime} onChange={e=>setNewSleep(p=>({...p,endTime:e.target.value}))} />
                  <button className="btn-now" onClick={()=>setNewSleep(p=>({...p,endTime:nowTime()}))}>지금</button>
                </div>
              </div>
            </div>
            <input className="add-input-full" type="text" placeholder="메모 (선택)" value={newSleep.note}
              onChange={e=>setNewSleep(p=>({...p,note:e.target.value}))} />
            <button className="btn-add" onClick={addSleep}>+ 수면 기록 추가</button>
          </div>
          <div className="record-list">
            {data.sleeps.length===0 && <div className="empty-record">수면 기록이 없어요 😴</div>}
            {[...data.sleeps].reverse().map(s=>(
              <div key={s.id} className="record-item">
                <div className="record-time">{s.startTime}</div>
                <div className="record-main">
                  <span className="record-title">{s.endTime?`~ ${s.endTime}`:"자는 중..."} {s.endTime&&<span className="sleep-dur">({calcDuration(s.startTime,s.endTime)})</span>}</span>
                  {s.note&&<span className="record-note">{s.note}</span>}
                </div>
                <button className="record-edit" onClick={()=>setEditModal({type:"sleep",entry:{...s}})}>✏️</button>
                <button className="record-del" onClick={()=>removeSleep(s.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 키/몸무게 탭 (누적) ── */}
      {tab === "growth" && (
        <div className="tab-content">
          <div className="add-card">
            <h4 className="add-title">키 / 몸무게 기록</h4>
            <div className="add-row">
              <div className="add-field">
                <label>날짜</label>
                <input type="date" value={newGrowth.date} onChange={e=>setNewGrowth(p=>({...p,date:e.target.value}))} />
              </div>
            </div>
            <div className="add-row">
              <div className="add-field">
                <label>키 (cm)</label>
                <input type="number" min={0} max={200} step={0.1} placeholder="예: 58.5"
                  value={newGrowth.height} onChange={e=>setNewGrowth(p=>({...p,height:e.target.value===""?"":Number(e.target.value)}))} />
              </div>
              <div className="add-field">
                <label>몸무게 (kg)</label>
                <input type="number" min={0} max={30} step={0.01} placeholder="예: 5.2"
                  value={newGrowth.weight} onChange={e=>setNewGrowth(p=>({...p,weight:e.target.value===""?"":Number(e.target.value)}))} />
              </div>
            </div>
            <input className="add-input-full" type="text" placeholder="메모 (예: 병원 측정, 집 체중계)"
              value={newGrowth.note} onChange={e=>setNewGrowth(p=>({...p,note:e.target.value}))} />
            <button className="btn-add" onClick={addGrowth}>+ 키/몸무게 기록 추가</button>
          </div>
          {growths.length===0
            ? <div className="empty-record">키/몸무게 기록이 없어요 📏<br/><small>기록이 날짜별로 누적됩니다</small></div>
            : growthGroups.map(g => (
              <div key={g.date} className="cumulative-group">
                <div className="cumulative-date-header">{fmtDate(g.date)}</div>
                {g.items.map(entry => (
                  <div key={entry.id} className="record-item">
                    <div className="record-main" style={{flex:1}}>
                      {entry.height ? <span className="record-title">키 {entry.height}cm</span> : null}
                      {entry.weight ? <span className="record-title" style={{marginLeft:entry.height?"0.5rem":0}}>몸무게 {entry.weight}kg</span> : null}
                      {entry.note && <span className="record-note">{entry.note}</span>}
                    </div>
                    <button className="record-edit" onClick={()=>setEditModal({type:"growth",entry:{...entry}})}>✏️</button>
                    <button className="record-del" onClick={()=>removeGrowth(entry.id)}>×</button>
                  </div>
                ))}
              </div>
            ))
          }
        </div>
      )}

      {/* ── 특이사항 탭 (누적) ── */}
      {tab === "note" && (
        <div className="tab-content">
          {milestones.length > 0 && (
            <div className="milestone-hint-card">
              <div className="milestone-hint-title">✨ 생후 {days}일 발달 이정표</div>
              <div className="milestone-hint-list">
                {milestones.map((m,i) => (
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
                <label>날짜</label>
                <input type="date" value={newNote.date} onChange={e=>setNewNote(p=>({...p,date:e.target.value}))} />
              </div>
              <div className="add-field">
                <label>시간</label>
                <div className="time-now-row">
                  <input type="time" value={newNote.time} onChange={e=>setNewNote(p=>({...p,time:e.target.value}))} />
                  <button className="btn-now" onClick={()=>setNewNote(p=>({...p,time:nowTime()}))}>지금</button>
                </div>
              </div>
            </div>
            <div className="add-row">
              <div className="add-field" style={{flex:1}}>
                <label>분류</label>
                <select value={newNote.category} onChange={e=>setNewNote(p=>({...p,category:e.target.value as any}))}>
                  {(Object.entries(NOTE_CATS) as [string,string][]).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <textarea className="add-textarea" placeholder="내용을 입력하세요 (체온, 대소변, 미소, 뒤집기 등...)"
              value={newNote.content} onChange={e=>setNewNote(p=>({...p,content:e.target.value}))} />
            <button className="btn-add" onClick={addNote}>+ 특이사항 추가</button>
          </div>
          {notes.length===0
            ? <div className="empty-record">특이사항 기록이 없어요 📝<br/><small>기록이 날짜별로 누적됩니다</small></div>
            : noteGroups.map(g => (
              <div key={g.date} className="cumulative-group">
                <div className="cumulative-date-header">{fmtDate(g.date)}</div>
                {g.items.sort((a,b)=>b.time.localeCompare(a.time)).map(entry => (
                  <div key={entry.id} className="record-item">
                    <div className="record-time">{entry.time}</div>
                    <div className="record-main">
                      <span className="note-cat">{NOTE_CATS[entry.category]}</span>
                      <span className="record-title">{entry.content}</span>
                    </div>
                    <button className="record-edit" onClick={()=>setEditModal({type:"note",entry:{...entry}})}>✏️</button>
                    <button className="record-del" onClick={()=>removeNote(entry.id)}>×</button>
                  </div>
                ))}
              </div>
            ))
          }
        </div>
      )}

      {/* ── 수정 Modal ── */}
      {editModal && (
        <div className="modal-overlay" onClick={()=>setEditModal(null)}>
          <div className="modal-card" onClick={e=>e.stopPropagation()}>

            {editModal.type==="feed" && (<>
              <h3 className="modal-title">🍼 수유 기록 수정</h3>
              <div className="modal-field"><label>시작 시간</label>
                <input type="time" value={editModal.entry.time} onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,time:e.target.value}})} /></div>
              <div className="modal-field"><label>끝난 시간</label>
                <div className="time-now-row">
                  <input type="time" value={editModal.entry.endTime||""} onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,endTime:e.target.value}})} />
                  <button className="btn-now" onClick={()=>setEditModal({...editModal,entry:{...editModal.entry,endTime:nowTime()}})}>지금</button>
                </div></div>
              <div className="modal-field"><label>수유량({FEED_UNIT[editModal.entry.type]})</label>
                <input type="number" min={0} max={1000} step={10} value={editModal.entry.amount}
                  onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,amount:Number(e.target.value)}})} /></div>
              <div className="modal-field"><label>종류</label>
                <div className="feed-type-row">
                  {(["formula","breast","mixed","weaning","snack"] as const).map(t=>(
                    <button key={t} className={`type-btn ${editModal.entry.type===t?"active":""}`}
                      onClick={()=>setEditModal({...editModal,entry:{...editModal.entry,type:t}})}>{FEED_TYPE_LABELS[t]}</button>
                  ))}
                </div></div>
              <div className="modal-field"><label>메모</label>
                <input type="text" value={editModal.entry.note} onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,note:e.target.value}})} /></div>
            </>)}

            {editModal.type==="sleep" && (<>
              <h3 className="modal-title">😴 수면 기록 수정</h3>
              <div className="modal-field"><label>잠든 시간</label>
                <input type="time" value={editModal.entry.startTime} onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,startTime:e.target.value}})} /></div>
              <div className="modal-field"><label>일어난 시간</label>
                <input type="time" value={editModal.entry.endTime} onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,endTime:e.target.value}})} /></div>
              <div className="modal-field"><label>메모</label>
                <input type="text" value={editModal.entry.note} onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,note:e.target.value}})} /></div>
            </>)}

            {editModal.type==="growth" && (<>
              <h3 className="modal-title">📏 키/몸무게 수정</h3>
              <div className="modal-field"><label>날짜</label>
                <input type="date" value={editModal.entry.date} onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,date:e.target.value}})} /></div>
              <div className="modal-field"><label>키 (cm)</label>
                <input type="number" min={0} max={200} step={0.1} value={editModal.entry.height}
                  onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,height:e.target.value===""?"":Number(e.target.value)}})} /></div>
              <div className="modal-field"><label>몸무게 (kg)</label>
                <input type="number" min={0} max={30} step={0.01} value={editModal.entry.weight}
                  onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,weight:e.target.value===""?"":Number(e.target.value)}})} /></div>
              <div className="modal-field"><label>메모</label>
                <input type="text" value={editModal.entry.note} onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,note:e.target.value}})} /></div>
              {/* 키/몸무게 전용 버튼: 취소 · 삭제 · 완료 */}
              <div className="modal-buttons">
                <button className="btn-cancel" onClick={()=>setEditModal(null)}>취소</button>
                <button className="btn-delete" onClick={()=>{ removeGrowth(editModal.entry.id); setEditModal(null); }}>🗑️ 삭제</button>
                <button className="btn-save" onClick={saveEdit}>✓ 완료</button>
              </div>
            </>)}

            {editModal.type==="note" && (<>
              <h3 className="modal-title">📝 특이사항 수정</h3>
              <div className="modal-field"><label>날짜</label>
                <input type="date" value={editModal.entry.date} onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,date:e.target.value}})} /></div>
              <div className="modal-field"><label>시간</label>
                <input type="time" value={editModal.entry.time} onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,time:e.target.value}})} /></div>
              <div className="modal-field"><label>분류</label>
                <select value={editModal.entry.category} onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,category:e.target.value as any}})}>
                  {(Object.entries(NOTE_CATS) as [string,string][]).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select></div>
              <div className="modal-field"><label>내용</label>
                <textarea value={editModal.entry.content} onChange={e=>setEditModal({...editModal,entry:{...editModal.entry,content:e.target.value}})} /></div>
            </>)}

            {/* 수유·수면·특이사항 공용 버튼 (키/몸무게는 자체 버튼 사용) */}
            {editModal.type !== "growth" && (
              <div className="modal-buttons">
                <button className="btn-cancel" onClick={()=>setEditModal(null)}>취소</button>
                <button className="btn-save" onClick={saveEdit}>저장</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
