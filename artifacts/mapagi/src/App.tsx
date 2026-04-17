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

const queryClient = new QueryClient();

type Page = "home" | "vaccine" | "pregnancy" | "clinic" | "daily" | "supplies" | "gallery";

function isFutureBirthDate(): boolean {
  try {
    // check all babies for the active one
    const babies = JSON.parse(localStorage.getItem("mapagi-babies") || "[]");
    const activeId = localStorage.getItem("mapagi-active-baby");
    let baby = babies.find((b: any) => b.id === activeId) || babies[0];
    if (!baby) {
      // legacy fallback
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

function AppContent() {
  const [page, setPage] = useState<Page>("home");
  const [future, setFuture] = useState<boolean>(isFutureBirthDate);

  // re-check future status whenever home data might change
  useEffect(() => {
    const check = () => setFuture(isFutureBirthDate());
    window.addEventListener("storage", check);
    const interval = setInterval(check, 1000);
    return () => { window.removeEventListener("storage", check); clearInterval(interval); };
  }, []);

  const NAV_ITEMS: { id: Page; icon: string; label: string }[] = [
    { id: "home", icon: "🏠", label: "홈" },
    future
      ? { id: "pregnancy", icon: "🤰", label: "임신일지" }
      : { id: "vaccine", icon: "💉", label: "접종" },
    { id: "clinic", icon: "🏥", label: "소아과" },
    { id: "daily", icon: "📋", label: "기록" },
    { id: "supplies", icon: "🛍️", label: "육아준비물" },
    { id: "gallery", icon: "📸", label: "사진첩" },
  ];

  return (
    <div className="app-root">
      <div className="app-content">
        {page === "home" && <Home />}
        {page === "vaccine" && <VaccinePage />}
        {page === "pregnancy" && <PregnancyPage />}
        {page === "clinic" && <ClinicPage />}
        {page === "daily" && <DailyPage />}
        {page === "supplies" && <SuppliesPage />}
        {page === "gallery" && <GalleryPage />}
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
