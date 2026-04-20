// ================================================================
// 로그인 화면
// 엄마·아빠·아기 이름 + 태어난 날(예정일)로 가족 식별
// 계정/비밀번호 없이 이 4가지 정보가 로그인을 대체합니다
// ================================================================

import { useState } from "react";
import { getFamilyId, loadFamilyData } from "@/lib/family-sync";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { BabyProfile } from "@/pages/home";

interface Props {
  onLogin: (familyId: string, babies: BabyProfile[] | null) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [momName, setMomName]     = useState("");
  const [dadName, setDadName]     = useState("");
  const [babyName, setBabyName]   = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [mode, setMode]           = useState<"start" | "existing">("start");

  async function handleStart() {
    const mom  = momName.trim();
    const dad  = dadName.trim();
    const baby = babyName.trim();

    if (!mom || !dad || !baby) {
      setError("엄마, 아빠, 아기 이름은 꼭 입력해 주세요.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // 가족 ID = SHA-256(엄마|아빠|아기) — 같은 이름이면 항상 같은 ID
      const familyId = await getFamilyId(mom, dad, baby);

      let loadedBabies: BabyProfile[] | null = null;

      if (isFirebaseConfigured) {
        // Firebase에 기존 데이터가 있으면 불러옴
        const remote = await loadFamilyData(familyId);
        if (remote?.babies && Array.isArray(remote.babies) && remote.babies.length > 0) {
          loadedBabies = remote.babies as BabyProfile[];
          setMode("existing");
        }
      }

      // 새 가족이면 입력한 정보로 첫 번째 아기 프로필 생성
      if (!loadedBabies) {
        const firstBaby: BabyProfile = {
          id: Date.now().toString(),
          momName: mom,
          dadName: dad,
          babyName: baby,
          nickname: "",
          birthDate,
        };
        loadedBabies = [firstBaby];
      }

      // localStorage에 세션 저장
      localStorage.setItem("mapagi-family-id",  familyId);
      localStorage.setItem("mapagi-login-mom",  mom);
      localStorage.setItem("mapagi-login-dad",  dad);
      localStorage.setItem("mapagi-login-baby", baby);
      localStorage.setItem("mapagi-babies",     JSON.stringify(loadedBabies));
      if (!localStorage.getItem("mapagi-active-baby")) {
        localStorage.setItem("mapagi-active-baby", loadedBabies[0].id);
      }

      onLogin(familyId, loadedBabies);
    } catch (e) {
      console.error(e);
      setError("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-inner">
        {/* 타이틀 */}
        <div className="login-title-wrap">
          <div className="login-emoji">🍼</div>
          <h1 className="login-title">
            <span className="login-title-soft">엄</span>
            <span className="login-title-pink">마</span>
            <span className="login-title-soft">, 아</span>
            <span className="login-title-pink">빠</span>
            <span className="login-title-soft">, 아</span>
            <span className="login-title-pink">기</span>
          </h1>
          <p className="login-subtitle">우리 가족 아기 성장 기록</p>
        </div>

        {/* 카드 */}
        <div className="login-card">
          <p className="login-desc">
            처음 사용하시면 <strong>가족 정보를 입력</strong>하고 시작하세요.
            <br />
            같은 정보를 입력하면 <strong>다른 기기에서도 같은 데이터</strong>로 연결됩니다.
          </p>

          {!isFirebaseConfigured && (
            <div className="login-notice">
              ☁️ Firebase 미설정 — 이 기기에만 데이터가 저장됩니다.
            </div>
          )}

          <div className="field-group">
            <label className="field-label">
              <span className="label-icon">👩</span> 엄마 이름
            </label>
            <input
              className="field-input"
              type="text"
              placeholder="엄마 이름을 입력하세요"
              value={momName}
              onChange={e => setMomName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleStart()}
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
              value={dadName}
              onChange={e => setDadName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleStart()}
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
              value={babyName}
              onChange={e => setBabyName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleStart()}
            />
          </div>

          <div className="field-group">
            <label className="field-label">
              <span className="label-icon">🎂</span> 태어난 날(예정일)
              <span className="field-hint"> (선택)</span>
            </label>
            <input
              className="field-input"
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
            />
          </div>

          {error && (
            <div className="login-error">{error}</div>
          )}

          <button
            className="save-btn"
            onClick={handleStart}
            disabled={loading}
          >
            {loading
              ? "⏳ 확인 중..."
              : isFirebaseConfigured
                ? "✨ 시작하기 / 데이터 불러오기"
                : "✨ 시작하기"}
          </button>

          <p className="login-tip">
            💡 엄마·아빠·아기 이름이 같으면 <br />
            다른 기기에서도 자동으로 연결됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
