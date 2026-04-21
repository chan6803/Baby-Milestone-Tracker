import { useState, useEffect } from "react";
import { isFirebaseConfigured, authReady } from "@/lib/firebase";
import {
  getLocalFamilyId, getLocalBabyId,
  syncVaccineRecord, clearVaccineRecord, listenVaccineRecords
} from "@/lib/family-sync";

interface VaccineRecord {
  scheduledDate: string;
  actualDate: string;
  note: string;
}

interface VaccineScheduleItem {
  id: string;
  name: string;
  nameEn: string;
  disease: string;
  doseLabel: string;
  ageWeeks?: number;
  ageDays?: number;
  ageMonths?: number;
  color: string;
}

const VACCINE_SCHEDULE: VaccineScheduleItem[] = [
  { id: "hepb_1", name: "B형간염", nameEn: "HepB", disease: "B형간염", doseLabel: "1차", ageDays: 0, color: "#e8457a" },
  { id: "bcg", name: "BCG", nameEn: "BCG", disease: "결핵", doseLabel: "1차", ageDays: 28, color: "#9060d0" },
  { id: "hepb_2", name: "B형간염", nameEn: "HepB", disease: "B형간염", doseLabel: "2차", ageMonths: 1, color: "#e8457a" },
  { id: "dtap_1", name: "DTaP", nameEn: "DTaP", disease: "디프테리아/파상풍/백일해", doseLabel: "1차", ageMonths: 2, color: "#2090d0" },
  { id: "ipv_1", name: "IPV", nameEn: "IPV", disease: "폴리오", doseLabel: "1차", ageMonths: 2, color: "#20b060" },
  { id: "hib_1", name: "Hib", nameEn: "Hib", disease: "b형헤모필루스인플루엔자", doseLabel: "1차", ageMonths: 2, color: "#e07020" },
  { id: "pcv_1", name: "폐렴구균", nameEn: "PCV", disease: "폐렴구균", doseLabel: "1차", ageMonths: 2, color: "#c040a0" },
  { id: "rota_1", name: "로타바이러스", nameEn: "Rota", disease: "로타바이러스 장염", doseLabel: "1차", ageMonths: 2, color: "#d0a020" },
  { id: "dtap_2", name: "DTaP", nameEn: "DTaP", disease: "디프테리아/파상풍/백일해", doseLabel: "2차", ageMonths: 4, color: "#2090d0" },
  { id: "ipv_2", name: "IPV", nameEn: "IPV", disease: "폴리오", doseLabel: "2차", ageMonths: 4, color: "#20b060" },
  { id: "hib_2", name: "Hib", nameEn: "Hib", disease: "b형헤모필루스인플루엔자", doseLabel: "2차", ageMonths: 4, color: "#e07020" },
  { id: "pcv_2", name: "폐렴구균", nameEn: "PCV", disease: "폐렴구균", doseLabel: "2차", ageMonths: 4, color: "#c040a0" },
  { id: "rota_2", name: "로타바이러스", nameEn: "Rota", disease: "로타바이러스 장염", doseLabel: "2차", ageMonths: 4, color: "#d0a020" },
  { id: "dtap_3", name: "DTaP", nameEn: "DTaP", disease: "디프테리아/파상풍/백일해", doseLabel: "3차", ageMonths: 6, color: "#2090d0" },
  { id: "ipv_3", name: "IPV", nameEn: "IPV", disease: "폴리오", doseLabel: "3차", ageMonths: 6, color: "#20b060" },
  { id: "hib_3", name: "Hib", nameEn: "Hib", disease: "b형헤모필루스인플루엔자", doseLabel: "3차", ageMonths: 6, color: "#e07020" },
  { id: "pcv_3", name: "폐렴구균", nameEn: "PCV", disease: "폐렴구균", doseLabel: "3차", ageMonths: 6, color: "#c040a0" },
  { id: "rota_3", name: "로타바이러스", nameEn: "Rota", disease: "로타바이러스 장염", doseLabel: "3차", ageMonths: 6, color: "#d0a020" },
  { id: "hepb_3", name: "B형간염", nameEn: "HepB", disease: "B형간염", doseLabel: "3차", ageMonths: 6, color: "#e8457a" },
  { id: "flu_1", name: "독감(인플루엔자)", nameEn: "Flu", disease: "인플루엔자", doseLabel: "1차", ageMonths: 6, color: "#6080d0" },
  { id: "mmr_1", name: "MMR", nameEn: "MMR", disease: "홍역/유행성이하선염/풍진", doseLabel: "1차", ageMonths: 12, color: "#d04060" },
  { id: "var_1", name: "수두", nameEn: "VAR", disease: "수두", doseLabel: "1차", ageMonths: 12, color: "#80a030" },
  { id: "hepa_1", name: "A형간염", nameEn: "HepA", disease: "A형간염", doseLabel: "1차", ageMonths: 12, color: "#b06020" },
  { id: "jev_1", name: "일본뇌염(불활성화)", nameEn: "JEV", disease: "일본뇌염", doseLabel: "1차", ageMonths: 12, color: "#5090a0" },
  { id: "pcv_4", name: "폐렴구균", nameEn: "PCV", disease: "폐렴구균", doseLabel: "추가", ageMonths: 12, color: "#c040a0" },
  { id: "hib_4", name: "Hib", nameEn: "Hib", disease: "b형헤모필루스인플루엔자", doseLabel: "추가", ageMonths: 12, color: "#e07020" },
  { id: "dtap_4", name: "DTaP", nameEn: "DTaP", disease: "디프테리아/파상풍/백일해", doseLabel: "추가", ageMonths: 15, color: "#2090d0" },
  { id: "hepa_2", name: "A형간염", nameEn: "HepA", disease: "A형간염", doseLabel: "2차", ageMonths: 18, color: "#b06020" },
  { id: "jev_2", name: "일본뇌염", nameEn: "JEV", disease: "일본뇌염", doseLabel: "2차", ageMonths: 13, color: "#5090a0" },
];

function getScheduledDate(birthDate: string, item: VaccineScheduleItem): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const d = new Date(birth);
  if (item.ageDays !== undefined) {
    d.setDate(d.getDate() + item.ageDays);
  } else if (item.ageMonths !== undefined) {
    d.setMonth(d.getMonth() + item.ageMonths);
  }
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
}

function getAgeLabel(item: VaccineScheduleItem): string {
  if (item.ageDays === 0) return "출생 시";
  if (item.ageDays !== undefined) return `생후 ${item.ageDays}일`;
  if (item.ageMonths !== undefined) return `생후 ${item.ageMonths}개월`;
  return "";
}

function getStatus(scheduledDate: string, actualDate: string): "done" | "upcoming" | "overdue" | "none" {
  if (actualDate) return "done";
  if (!scheduledDate) return "none";
  const today = new Date(); today.setHours(0,0,0,0);
  const scheduled = new Date(scheduledDate); scheduled.setHours(0,0,0,0);
  if (scheduled <= today) return "overdue";
  return "upcoming";
}

function loadLocalRecords(): Record<string, VaccineRecord> {
  try { return JSON.parse(localStorage.getItem("mapagi-vaccines") || "{}"); } catch { return {}; }
}

export default function VaccinePage() {
  // mapagi-babies 배열(신방식) → mapagi-family(구방식) 순으로 fallback
  const savedFamily = (() => {
    try {
      const babies = JSON.parse(localStorage.getItem("mapagi-babies") || "[]");
      const activeId = localStorage.getItem("mapagi-active-baby");
      const baby = babies.find((b: any) => b.id === activeId) || babies[0];
      if (baby) return baby;
      return JSON.parse(localStorage.getItem("mapagi-family") || "{}");
    } catch { return {}; }
  })();
  const birthDate: string = savedFamily.birthDate || "";
  const babyName: string = savedFamily.babyName || "아기";

  const familyId = getLocalFamilyId();
  const babyId   = getLocalBabyId();
  const isSynced = !!(isFirebaseConfigured && familyId && babyId);

  const [records, setRecords] = useState<Record<string, VaccineRecord>>(loadLocalRecords);
  const [openId, setOpenId]   = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<VaccineRecord>({ scheduledDate: "", actualDate: "", note: "" });
  const [syncing, setSyncing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Firebase 실시간 구독 (authReady 대기 후 시작)
  useEffect(() => {
    if (!isSynced) return;
    let unsub: (() => void) | null = null;
    authReady.then(() => {
      unsub = listenVaccineRecords(familyId, babyId, (firebaseRecords) => {
        const merged: Record<string, VaccineRecord> = { ...loadLocalRecords() };
        Object.entries(firebaseRecords).forEach(([id, data]) => {
          merged[id] = data as VaccineRecord;
        });
        setRecords(merged);
        localStorage.setItem("mapagi-vaccines", JSON.stringify(merged));
      });
    });
    return () => { if (unsub) unsub(); };
  }, [familyId, babyId, isSynced]);

  async function saveRecord(id: string) {
    const updated = { ...records, [id]: editRecord };
    setRecords(updated);
    localStorage.setItem("mapagi-vaccines", JSON.stringify(updated));
    setOpenId(null);

    if (isSynced) {
      setSyncing(true);
      try {
        await authReady;
        await syncVaccineRecord(familyId, babyId, id, editRecord);
      } catch (e) {
        console.error("접종 기록 동기화 실패:", e);
      } finally {
        setSyncing(false);
      }
    }
  }

  async function deleteRecord(id: string) {
    const updated = { ...records };
    delete updated[id];
    setRecords(updated);
    localStorage.setItem("mapagi-vaccines", JSON.stringify(updated));
    setDeleteConfirmId(null);
    setOpenId(null);

    if (isSynced) {
      await authReady;
      await clearVaccineRecord(familyId, babyId, id);
    }
  }

  function openEdit(item: VaccineScheduleItem) {
    const existing = records[item.id];
    const defaultScheduled = getScheduledDate(birthDate, item);
    setEditRecord(existing || { scheduledDate: defaultScheduled, actualDate: "", note: "" });
    setOpenId(item.id);
  }

  const doneCount = VACCINE_SCHEDULE.filter(v => records[v.id]?.actualDate).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">💉 예방접종 관리</h2>
        <p className="page-subtitle">{babyName}의 예방접종 일정을 관리해요</p>
        {isSynced && (
          <div className="sync-badge">
            {syncing ? "⏳ 동기화 중..." : "☁️ 가족 간 공유 중"}
          </div>
        )}
        {birthDate && (
          <div className="progress-bar-wrap">
            <div className="progress-label">완료 {doneCount} / {VACCINE_SCHEDULE.length}회</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(doneCount / VACCINE_SCHEDULE.length) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {!birthDate && (
        <div className="empty-notice">
          <span>📅</span>
          <p>홈에서 아기 태어난 날을 먼저 입력해 주세요!</p>
        </div>
      )}

      <div className="vaccine-list">
        {VACCINE_SCHEDULE.map(item => {
          const rec = records[item.id];
          const scheduledDate = getScheduledDate(birthDate, item);
          const status = getStatus(scheduledDate, rec?.actualDate || "");

          return (
            <div key={item.id} className={`vaccine-card status-${status}`} onClick={() => openEdit(item)}>
              <div className="vaccine-dot" style={{ background: item.color }} />
              <div className="vaccine-info">
                <div className="vaccine-name-row">
                  <span className="vaccine-name" style={{ color: item.color }}>{item.name}</span>
                  <span className="vaccine-dose">{item.doseLabel}</span>
                  <span className={`vaccine-badge badge-${status}`}>
                    {status === "done" ? "✓ 완료" : status === "overdue" ? "⚠ 지남" : "예정"}
                  </span>
                </div>
                <div className="vaccine-disease">{item.disease}</div>
                <div className="vaccine-dates">
                  <span className="vdate-label">권장일:</span>
                  <span className="vdate-val">{getAgeLabel(item)}</span>
                  {birthDate && (
                    <><span className="vdate-sep">·</span><span className="vdate-val">{formatDate(scheduledDate)}</span></>
                  )}
                </div>
                {rec?.actualDate && (
                  <div className="vaccine-actual">
                    <span className="vdate-label">접종일:</span>
                    <span className="vdate-actual">{formatDate(rec.actualDate)}</span>
                    {rec.note && <span className="vdate-note"> · {rec.note}</span>}
                  </div>
                )}
              </div>
              <div className="vaccine-edit-icon">✏️</div>
            </div>
          );
        })}
      </div>

      {/* 수정 Modal */}
      {openId && (() => {
        const item = VACCINE_SCHEDULE.find(v => v.id === openId)!;
        return (
          <div className="modal-overlay" onClick={() => setOpenId(null)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title" style={{ color: item.color }}>{item.name} {item.doseLabel}</h3>
              <p className="modal-disease">{item.disease}</p>
              <div className="modal-field">
                <label>접종 예정일</label>
                <input type="date" value={editRecord.scheduledDate}
                  onChange={e => setEditRecord(p => ({ ...p, scheduledDate: e.target.value }))} />
              </div>
              <div className="modal-field">
                <label>실제 접종일</label>
                <input type="date" value={editRecord.actualDate}
                  onChange={e => setEditRecord(p => ({ ...p, actualDate: e.target.value }))} />
              </div>
              <div className="modal-field">
                <label>메모</label>
                <textarea value={editRecord.note} placeholder="특이사항, 반응 등 메모"
                  onChange={e => setEditRecord(p => ({ ...p, note: e.target.value }))} />
              </div>
              <div className="modal-buttons">
                {records[openId]?.actualDate && (
                  <button className="btn-delete" onClick={() => setDeleteConfirmId(openId)}>
                    🗑️ 기록 삭제
                  </button>
                )}
                <button className="btn-cancel" onClick={() => setOpenId(null)}>취소</button>
                <button className="btn-save" style={{ background: item.color }} onClick={() => saveRecord(openId)}>저장</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 삭제 확인 Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: "#e04060" }}>접종 기록 삭제</h3>
            <p className="modal-disease">이 접종 기록을 삭제할까요?</p>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setDeleteConfirmId(null)}>취소</button>
              <button className="btn-save" style={{ background: "#e04060" }}
                onClick={() => deleteRecord(deleteConfirmId)}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
