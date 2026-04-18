// ================================================================
// Firebase 설정 파일
// ================================================================
// ⚠️ 아래 firebaseConfig 값을 본인의 Firebase 프로젝트 설정으로 교체하세요!
//
// [Firebase 설정 방법]
// 1. https://console.firebase.google.com 접속
// 2. "프로젝트 추가" 클릭 → 프로젝트 이름 입력 (예: mapagi-app)
// 3. 프로젝트 생성 후 좌측 "빌드" → "Firestore Database" → "데이터베이스 만들기"
//    - "테스트 모드로 시작" 선택 → 리전: asia-northeast3 (서울)
// 4. 좌측 "빌드" → "Storage" → "시작하기"
//    - "테스트 모드로 시작" 선택
// 5. 프로젝트 설정(⚙️) → "내 앱" → "</>" (웹앱) 클릭
//    - 앱 닉네임 입력 → "앱 등록"
//    - 아래 firebaseConfig 값들을 복사해서 붙여넣기
// ================================================================

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAsbCXJD74d1GOZVEn9-WCNBW2FbbjxXes",
  authDomain: "mapagi-app.firebaseapp.com",
  projectId: "mapagi-app",
  storageBucket: "mapagi-app.firebasestorage.app",
  messagingSenderId: "296186172833",
  appId: "1:296186172833:web:4923f5ced6ac4ae34a67e0",
  measurementId: "G-ZRSC1CXCDQ",
};

// Firebase가 설정되었는지 확인
export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { db, storage };
export default app;
