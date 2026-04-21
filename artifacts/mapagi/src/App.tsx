import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import VaccinePage from "@/pages/vaccine";
import ClinicPage from "@/pages/clinic";
import DailyPage from "@/pages/daily";
import GalleryPage from "@/pages/gallery";
import PregnancyPage from "@/pages/pregnancy";
import SuppliesPage from "@/pages/supplies";
import LoginScreen from "@/components/LoginScreen";
import type { BabyProfile } from "@/pages/home";

const queryClient = new QueryClient();

type Page = "home" | "vaccine" | "pregnancy" | "clinic" | "daily" | "supplies" | "gallery";

function isFutureBirthDate(): boolean {
  try {
    const babies = JSON.parse(localStorage.getItem("mapagi-babies") || "[]");
    const activeId = localStorage.getItem("mapagi-active-baby");
    let baby = babies.find((b: any) => b.id === activeId) || babies[0];
    if (!baby) {
      const fam = JSON.parse(localStorage.getItem("mapagi-family") || "{}");
      baby = fam;
    }
    if (!baby?.birthDate) return false;
    const birth = new Date(baby.birthDate);
    const today = new Date();
    birth.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return birth.getTime() > today.getTime();
  } catch { return false; }
}

// 로그인 상태 확인 — localStorage에 family-id가 있으면 로그인된 것으로 간주
function isLoggedIn(): boolean {
  return !!localStorage.getItem("mapagi-family-id");
}

function AppContent() {
  const [loggedIn, setLoggedIn]   = useState<boolean>(isLoggedIn);
  const [page, setPage]           = useState<Page>("home");
  const [future, setFuture]       = useState<boolean>(isFutureBirthDate);

  useEffect(() => {
    const check = () => setFuture(isFutureBirthDate());
    window.addEventListener("storage", check);
    const interval = setInterval(check, 1000);
    return () => { window.removeEventListener("storage", check); clearInterval(interval); };
  }, []);

  // 로그인 처리: 가족 데이터를 localStorage에 반영하고 앱 진입
  function handleLogin(_familyId: string, babies: BabyProfile[] | null) {
    if (babies && babies.length > 0) {
      localStorage.setItem("mapagi-babies", JSON.stringify(babies));
      localStorage.setItem("mapagi-active-baby", babies[0].id);
    }
    setLoggedIn(true);
    setPage("daily");
  }

  // 로그아웃 처리
  function handleLogout() {
    const keys = [
      "mapagi-family-id", "mapagi-login-mom", "mapagi-login-dad",
      "mapagi-login-baby", "mapagi-babies", "mapagi-active-baby", "mapagi-family",
    ];
    keys.forEach(k => localStorage.removeItem(k));
    setLoggedIn(false);
  }

  // 로그인 전이면 로그인 화면만 보여줌
  if (!loggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const NAV_ITEMS: { id: Page; icon: string; label: string }[] = [
    { id: "daily",    icon: "📋",  label: "육아일지" },
    future
      ? { id: "pregnancy", icon: "🤰", label: "임신일지" }
      : { id: "vaccine",   icon: "💉", label: "접종" },
    { id: "clinic",   icon: "🏥",  label: "아동병원" },
    { id: "supplies", icon: "🛍️", label: "육아준비물" },
    { id: "gallery",  icon: "📸",  label: "사진첩" },
    { id: "home",     icon: "🏠",  label: "홈" },
  ];

  return (
    <div className="app-root">
      <div className="app-content">
        {page === "home"       && <Home onLogout={handleLogout} />}
        {page === "vaccine"    && <VaccinePage />}
        {page === "pregnancy"  && <PregnancyPage />}
        {page === "clinic"     && <ClinicPage />}
        {page === "daily"      && <DailyPage />}
        {page === "supplies"   && <SuppliesPage />}
        {page === "gallery"    && <GalleryPage />}
      </div>
      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${page === item.id ? "active" : ""}`}
            onClick={() => setPage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
