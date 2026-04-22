// ================================================================
// 가족 데이터 동기화 유틸리티
// 엄마 이름 + 아빠 이름 + 아기 이름이 같으면 같은 데이터를 공유합니다
// ================================================================

import {
  doc, setDoc, getDoc, onSnapshot, collection,
  query, orderBy, deleteDoc,
  Unsubscribe, DocumentData
} from "firebase/firestore";
import {
  ref, uploadString, getDownloadURL, deleteObject
} from "firebase/storage";
import { db, storage, isFirebaseConfigured } from "./firebase";

// ── localStorage 헬퍼 ─────────────────────────────────────────────
export function getLocalFamilyId(): string {
  return localStorage.getItem("mapagi-family-id") || "";
}

// ★ 핵심 수정: babyId를 familyId에서 직접 파생
//   → 같은 familyId면 항상 같은 babyId → 기기 간 Firebase 경로가 반드시 일치
export function getLocalBabyId(): string {
  const familyId = localStorage.getItem("mapagi-family-id") || "";
  if (familyId) {
    // 첫 번째(주 아기)는 familyId 앞 12자로 고정 → 기기 무관 동일 보장
    return familyId.slice(0, 12);
  }
  // 로그인 전 폴백 (거의 도달하지 않음)
  try {
    const babies = JSON.parse(localStorage.getItem("mapagi-babies") || "[]");
    const activeId = localStorage.getItem("mapagi-active-baby");
    const baby = babies.find((b: any) => b.id === activeId) || babies[0];
    return baby?.id || "";
  } catch {
    return "";
  }
}

// ── 가족 고유 ID 생성 (이름 3개를 조합해 해시) ────────────────────
export async function getFamilyId(momName: string, dadName: string, babyName: string): Promise<string> {
  const text = [momName, dadName, babyName]
    .map(s => s.trim().toLowerCase())
    .join("|");
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

// ── 기존 가족 데이터 불러오기 (로그인 시 사용) ────────────────────
export async function loadFamilyData(familyId: string): Promise<DocumentData | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, "families", familyId, "info", "main"));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

// ── 가족/아기 정보 저장 ──────────────────────────────────────────
export async function syncFamilyInfo(familyId: string, data: DocumentData) {
  if (!isFirebaseConfigured || !db) return;
  await setDoc(doc(db, "families", familyId, "info", "main"), data, { merge: true });
}

export function listenFamilyInfo(familyId: string, callback: (data: DocumentData | null) => void): Unsubscribe {
  if (!isFirebaseConfigured || !db) return () => {};
  return onSnapshot(doc(db, "families", familyId, "info", "main"), snap => {
    callback(snap.exists() ? snap.data() : null);
  });
}

// ── 오늘의 기록 저장/구독 (수유·수면) ────────────────────────────
export async function syncDailyRecord(familyId: string, babyId: string, date: string, data: DocumentData) {
  if (!isFirebaseConfigured || !db) return;
  await setDoc(doc(db, "families", familyId, "babies", babyId, "daily", date), data, { merge: true });
}

export function listenDailyRecord(
  familyId: string,
  babyId: string,
  date: string,
  callback: (data: DocumentData | null) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) return () => {};
  return onSnapshot(
    doc(db, "families", familyId, "babies", babyId, "daily", date),
    snap => callback(snap.exists() ? snap.data() : null)
  );
}

// ── 키/몸무게 기록 (누적·컬렉션) ─────────────────────────────────
export async function syncGrowthEntry(familyId: string, babyId: string, entryId: string, data: DocumentData) {
  if (!isFirebaseConfigured || !db) return;
  await setDoc(doc(db, "families", familyId, "babies", babyId, "growth", entryId), data);
}

export async function deleteGrowthEntry(familyId: string, babyId: string, entryId: string) {
  if (!isFirebaseConfigured || !db) return;
  try { await deleteDoc(doc(db, "families", familyId, "babies", babyId, "growth", entryId)); } catch {}
}

export function listenGrowthRecords(
  familyId: string,
  babyId: string,
  callback: (entries: DocumentData[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) return () => {};
  return onSnapshot(
    query(collection(db, "families", familyId, "babies", babyId, "growth"), orderBy("date", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// ── 특이사항 기록 (누적·컬렉션) ──────────────────────────────────
export async function syncNoteEntry(familyId: string, babyId: string, entryId: string, data: DocumentData) {
  if (!isFirebaseConfigured || !db) return;
  await setDoc(doc(db, "families", familyId, "babies", babyId, "notes", entryId), data);
}

export async function deleteNoteEntry(familyId: string, babyId: string, entryId: string) {
  if (!isFirebaseConfigured || !db) return;
  try { await deleteDoc(doc(db, "families", familyId, "babies", babyId, "notes", entryId)); } catch {}
}

export function listenNoteRecords(
  familyId: string,
  babyId: string,
  callback: (entries: DocumentData[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) return () => {};
  return onSnapshot(
    query(collection(db, "families", familyId, "babies", babyId, "notes"), orderBy("date", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

// ── 예방접종 기록 저장/삭제/구독 ──────────────────────────────────
export async function syncVaccineRecord(
  familyId: string, babyId: string, vaccineId: string, data: DocumentData
) {
  if (!isFirebaseConfigured || !db) return;
  await setDoc(doc(db, "families", familyId, "babies", babyId, "vaccines", vaccineId), data, { merge: true });
}

export async function clearVaccineRecord(familyId: string, babyId: string, vaccineId: string) {
  if (!isFirebaseConfigured || !db) return;
  try { await deleteDoc(doc(db, "families", familyId, "babies", babyId, "vaccines", vaccineId)); } catch {}
}

export function listenVaccineRecords(
  familyId: string, babyId: string,
  callback: (records: Record<string, DocumentData>) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) return () => {};
  return onSnapshot(
    collection(db, "families", familyId, "babies", babyId, "vaccines"),
    snap => {
      const records: Record<string, DocumentData> = {};
      snap.docs.forEach(d => { records[d.id] = d.data(); });
      callback(records);
    }
  );
}

// ── 사진 업로드/삭제 ──────────────────────────────────────────────
export async function uploadPhoto(
  familyId: string, photoId: string, base64Data: string, mimeType = "image/jpeg"
): Promise<string> {
  if (!isFirebaseConfigured || !storage) throw new Error("Firebase not configured");
  const storageRef = ref(storage, `families/${familyId}/photos/${photoId}`);
  await uploadString(storageRef, base64Data, "data_url");
  return await getDownloadURL(storageRef);
}

export async function deletePhotoFromStorage(familyId: string, photoId: string) {
  if (!isFirebaseConfigured || !storage) return;
  try { await deleteObject(ref(storage, `families/${familyId}/photos/${photoId}`)); } catch {}
}

export const deletePhoto = deletePhotoFromStorage;

// ── 사진 메타데이터 저장/삭제/구독 ───────────────────────────────
export async function savePhotoMeta(familyId: string, photoId: string, meta: DocumentData) {
  if (!isFirebaseConfigured || !db) return;
  await setDoc(doc(db, "families", familyId, "photos", photoId), meta, { merge: true });
}

export async function deletePhotoMeta(familyId: string, photoId: string) {
  if (!isFirebaseConfigured || !db) return;
  await deleteDoc(doc(db, "families", familyId, "photos", photoId));
}

export function listenPhotos(
  familyId: string, callback: (photos: DocumentData[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) return () => {};
  return onSnapshot(
    query(collection(db, "families", familyId, "photos"), orderBy("createdAt", "desc")),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}
