// ================================================================
// 가족 데이터 동기화 유틸리티
// 엄마 이름 + 아빠 이름 + 아기 이름이 같으면 같은 데이터를 공유합니다
// ================================================================

import {
  doc, setDoc, getDoc, onSnapshot, collection,
  Unsubscribe, DocumentData
} from "firebase/firestore";
import {
  ref, uploadString, getDownloadURL, deleteObject
} from "firebase/storage";
import { db, storage, isFirebaseConfigured } from "./firebase";

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

// ── 오늘의 기록 저장 ────────────────────────────────────────────
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

// ── 사진 업로드 ─────────────────────────────────────────────────
export async function uploadPhoto(
  familyId: string,
  photoId: string,
  base64Data: string,
  mimeType = "image/jpeg"
): Promise<string> {
  if (!isFirebaseConfigured || !storage) throw new Error("Firebase not configured");
  const storageRef = ref(storage, `families/${familyId}/photos/${photoId}`);
  await uploadString(storageRef, base64Data, "data_url");
  return await getDownloadURL(storageRef);
}

export async function deletePhoto(familyId: string, photoId: string) {
  if (!isFirebaseConfigured || !storage) return;
  try {
    await deleteObject(ref(storage, `families/${familyId}/photos/${photoId}`));
  } catch {}
}

// ── 사진 메타데이터 저장/구독 ───────────────────────────────────
export async function savePhotoMeta(familyId: string, photoId: string, meta: DocumentData) {
  if (!isFirebaseConfigured || !db) return;
  await setDoc(doc(db, "families", familyId, "photos", photoId), meta);
}

export async function deletePhotoMeta(familyId: string, photoId: string) {
  if (!isFirebaseConfigured || !db) return;
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "families", familyId, "photos", photoId));
}

export function listenPhotos(
  familyId: string,
  callback: (photos: DocumentData[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) return () => {};
  const { query, orderBy } = require("firebase/firestore");
  return onSnapshot(
    collection(db, "families", familyId, "photos"),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}
