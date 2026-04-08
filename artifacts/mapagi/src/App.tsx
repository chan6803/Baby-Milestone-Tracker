import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import VaccinePage from "@/pages/vaccine";
import ClinicPage from "@/pages/clinic";
import DailyPage from "@/pages/daily";
import GalleryPage from "@/pages/gallery";

const queryClient = new QueryClient();

type Page = "home" | "vaccine" | "clinic" | "daily" | "gallery";

const NAV_ITEMS: { id: Page; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "홈" },
  { id: "vaccine", icon: "💉", label: "접종" },
  { id: "clinic", icon: "🏥", label: "소아과" },
  { id: "daily", icon: "📋", label: "기록" },
  { id: "gallery", icon: "📸", label: "사진첩" },
];

function AppContent() {
  const [page, setPage] = useState<Page>("home");

  return (
    <div className="app-root">
      <div className="app-content">
        {page === "home" && <Home />}
        {page === "vaccine" && <VaccinePage />}
        {page === "clinic" && <ClinicPage />}
        {page === "daily" && <DailyPage />}
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
