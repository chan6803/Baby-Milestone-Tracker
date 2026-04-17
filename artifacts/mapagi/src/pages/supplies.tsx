import { useState } from "react";

interface SupplyItem {
  name: string;
  desc: string;
  priority: "필수" | "권장" | "선택";
  coupang?: string;
  kurly?: string;
  ssg?: string;
}

interface SupplyCategory {
  id: string;
  icon: string;
  title: string;
  color: string;
  items: SupplyItem[];
}

const CATEGORIES: SupplyCategory[] = [
  {
    id: "pregnancy",
    icon: "🤰",
    title: "임신 준비",
    color: "#f472b6",
    items: [
      { name: "엽산 보충제", desc: "임신 초기 신경관 결손 예방 필수", priority: "필수", coupang: "https://www.coupang.com/np/search?q=엽산+보충제", kurly: "https://www.kurly.com/search?sword=엽산", ssg: "https://www.ssg.com/search.ssg?query=엽산" },
      { name: "철분제", desc: "임신 중기부터 필수 복용", priority: "필수", coupang: "https://www.coupang.com/np/search?q=임산부+철분제", kurly: "https://www.kurly.com/search?sword=철분제", ssg: "https://www.ssg.com/search.ssg?query=임산부+철분제" },
      { name: "임산부 멀티비타민", desc: "종합 영양 보충", priority: "권장", coupang: "https://www.coupang.com/np/search?q=임산부+멀티비타민", kurly: "https://www.kurly.com/search?sword=임산부+비타민", ssg: "https://www.ssg.com/search.ssg?query=임산부+비타민" },
      { name: "임산부 복대", desc: "배를 받쳐주는 지지대", priority: "권장", coupang: "https://www.coupang.com/np/search?q=임산부+복대", ssg: "https://www.ssg.com/search.ssg?query=임산부+복대" },
      { name: "튼살 크림", desc: "임신선·튼살 예방 크림", priority: "권장", coupang: "https://www.coupang.com/np/search?q=임산부+튼살크림", kurly: "https://www.kurly.com/search?sword=튼살크림", ssg: "https://www.ssg.com/search.ssg?query=튼살크림" },
      { name: "임산부 쿠션", desc: "수면용 임산부 바디 필로우", priority: "권장", coupang: "https://www.coupang.com/np/search?q=임산부+쿠션", ssg: "https://www.ssg.com/search.ssg?query=임산부+쿠션" },
      { name: "임산부 속옷", desc: "배를 편안히 감싸는 속옷", priority: "필수", coupang: "https://www.coupang.com/np/search?q=임산부+속옷", ssg: "https://www.ssg.com/search.ssg?query=임산부+속옷" },
    ],
  },
  {
    id: "birth",
    icon: "🏥",
    title: "출산 준비",
    color: "#a78bfa",
    items: [
      { name: "출산 가방 (산모)", desc: "병원 입원 시 필요한 산모용품", priority: "필수", coupang: "https://www.coupang.com/np/search?q=산모+입원+가방", ssg: "https://www.ssg.com/search.ssg?query=산모가방" },
      { name: "출산 가방 (신생아)", desc: "아기 퇴원복, 기저귀 등", priority: "필수", coupang: "https://www.coupang.com/np/search?q=신생아+퇴원+세트", ssg: "https://www.ssg.com/search.ssg?query=신생아+퇴원복" },
      { name: "산후조리원 용품", desc: "산후조리원 입소 시 필요 물품", priority: "권장", coupang: "https://www.coupang.com/np/search?q=산후조리원+용품", ssg: "https://www.ssg.com/search.ssg?query=산후조리원" },
      { name: "수유 브라", desc: "모유 수유 시 편한 수유 브라", priority: "필수", coupang: "https://www.coupang.com/np/search?q=수유+브라", kurly: "https://www.kurly.com/search?sword=수유브라", ssg: "https://www.ssg.com/search.ssg?query=수유브라" },
      { name: "유축기", desc: "모유 유축을 위한 전동 유축기", priority: "권장", coupang: "https://www.coupang.com/np/search?q=유축기", ssg: "https://www.ssg.com/search.ssg?query=유축기" },
      { name: "수유 패드", desc: "모유 누출 방지 수유 패드", priority: "권장", coupang: "https://www.coupang.com/np/search?q=수유패드", kurly: "https://www.kurly.com/search?sword=수유패드", ssg: "https://www.ssg.com/search.ssg?query=수유패드" },
    ],
  },
  {
    id: "newborn",
    icon: "👶",
    title: "신생아 필수품 (0~3개월)",
    color: "#34d399",
    items: [
      { name: "기저귀 (신생아용)", desc: "신생아~소형 사이즈 기저귀", priority: "필수", coupang: "https://www.coupang.com/np/search?q=신생아+기저귀", kurly: "https://www.kurly.com/search?sword=신생아+기저귀", ssg: "https://www.ssg.com/search.ssg?query=신생아기저귀" },
      { name: "물티슈", desc: "아기 피부 전용 물티슈", priority: "필수", coupang: "https://www.coupang.com/np/search?q=아기+물티슈", kurly: "https://www.kurly.com/search?sword=아기물티슈", ssg: "https://www.ssg.com/search.ssg?query=아기물티슈" },
      { name: "신생아 의류 세트", desc: "우주복, 배냇저고리 등 신생아 옷", priority: "필수", coupang: "https://www.coupang.com/np/search?q=신생아+의류+세트", ssg: "https://www.ssg.com/search.ssg?query=신생아의류" },
      { name: "아기 침대/범퍼침대", desc: "신생아 전용 안전 침대", priority: "필수", coupang: "https://www.coupang.com/np/search?q=아기침대+범퍼침대", ssg: "https://www.ssg.com/search.ssg?query=아기침대" },
      { name: "젖병 (분유용)", desc: "내열 유리 또는 PP 젖병", priority: "필수", coupang: "https://www.coupang.com/np/search?q=아기+젖병", kurly: "https://www.kurly.com/search?sword=젖병", ssg: "https://www.ssg.com/search.ssg?query=젖병" },
      { name: "분유", desc: "신생아용 1단계 분유", priority: "필수", coupang: "https://www.coupang.com/np/search?q=신생아+분유+1단계", kurly: "https://www.kurly.com/search?sword=신생아분유", ssg: "https://www.ssg.com/search.ssg?query=신생아분유" },
      { name: "아기 욕조", desc: "신생아 목욕용 욕조", priority: "필수", coupang: "https://www.coupang.com/np/search?q=아기+욕조", ssg: "https://www.ssg.com/search.ssg?query=아기욕조" },
      { name: "아기 세제/바디워시", desc: "무향·저자극 아기 전용 세제", priority: "필수", coupang: "https://www.coupang.com/np/search?q=아기+세제+무향", kurly: "https://www.kurly.com/search?sword=아기세제", ssg: "https://www.ssg.com/search.ssg?query=아기세제" },
      { name: "체온계", desc: "귀 또는 항문 체온계", priority: "필수", coupang: "https://www.coupang.com/np/search?q=아기+체온계", ssg: "https://www.ssg.com/search.ssg?query=아기체온계" },
      { name: "손발싸개 세트", desc: "신생아 손 발 보호", priority: "권장", coupang: "https://www.coupang.com/np/search?q=신생아+손발싸개", ssg: "https://www.ssg.com/search.ssg?query=손발싸개" },
      { name: "공갈젖꼭지", desc: "아기 달래기용", priority: "선택", coupang: "https://www.coupang.com/np/search?q=공갈젖꼭지", ssg: "https://www.ssg.com/search.ssg?query=공갈젖꼭지" },
      { name: "바운서/스윙", desc: "아기를 달래주는 전동 바운서", priority: "권장", coupang: "https://www.coupang.com/np/search?q=아기+바운서", ssg: "https://www.ssg.com/search.ssg?query=아기바운서" },
    ],
  },
  {
    id: "infant",
    icon: "🧸",
    title: "영아용품 (3~12개월)",
    color: "#fb923c",
    items: [
      { name: "이유식 의자 (하이체어)", desc: "앉아서 이유식 먹을 수 있는 의자", priority: "필수", coupang: "https://www.coupang.com/np/search?q=이유식+하이체어", ssg: "https://www.ssg.com/search.ssg?query=하이체어" },
      { name: "이유식 용기 세트", desc: "이유식 보관 및 급여 용기", priority: "필수", coupang: "https://www.coupang.com/np/search?q=이유식+용기+세트", kurly: "https://www.kurly.com/search?sword=이유식용기", ssg: "https://www.ssg.com/search.ssg?query=이유식용기" },
      { name: "이유식 스푼 세트", desc: "아기 입에 맞는 실리콘 스푼", priority: "필수", coupang: "https://www.coupang.com/np/search?q=이유식+스푼", ssg: "https://www.ssg.com/search.ssg?query=이유식스푼" },
      { name: "유아 카시트", desc: "신생아~12kg 대응 카시트", priority: "필수", coupang: "https://www.coupang.com/np/search?q=신생아+카시트", ssg: "https://www.ssg.com/search.ssg?query=신생아카시트" },
      { name: "유모차", desc: "신생아부터 사용 가능한 유모차", priority: "필수", coupang: "https://www.coupang.com/np/search?q=신생아+유모차", ssg: "https://www.ssg.com/search.ssg?query=신생아유모차" },
      { name: "아기 띠 (슬링/캐리어)", desc: "양육자 편의를 위한 아기 캐리어", priority: "권장", coupang: "https://www.coupang.com/np/search?q=아기띠+캐리어", ssg: "https://www.ssg.com/search.ssg?query=아기띠" },
      { name: "딸랑이·치발기", desc: "시각·촉각 발달 장난감", priority: "권장", coupang: "https://www.coupang.com/np/search?q=아기+딸랑이+치발기", ssg: "https://www.ssg.com/search.ssg?query=치발기" },
      { name: "아기 로션·크림", desc: "아기 피부 보습 제품", priority: "권장", coupang: "https://www.coupang.com/np/search?q=아기+로션", kurly: "https://www.kurly.com/search?sword=아기로션", ssg: "https://www.ssg.com/search.ssg?query=아기로션" },
    ],
  },
  {
    id: "toddler",
    icon: "🚶",
    title: "유아용품 (12개월~)",
    color: "#60a5fa",
    items: [
      { name: "보행기 / 워커", desc: "걸음마 연습용 워커", priority: "선택", coupang: "https://www.coupang.com/np/search?q=아기+워커+보행기", ssg: "https://www.ssg.com/search.ssg?query=보행기" },
      { name: "유아 변기 시트", desc: "화장실 훈련용 유아 변기", priority: "권장", coupang: "https://www.coupang.com/np/search?q=유아+변기시트", ssg: "https://www.ssg.com/search.ssg?query=유아변기" },
      { name: "유아 식기 세트", desc: "흡착 밥그릇, 컵 등", priority: "필수", coupang: "https://www.coupang.com/np/search?q=유아+식기세트", ssg: "https://www.ssg.com/search.ssg?query=유아식기" },
      { name: "유아 운동화", desc: "첫 걸음마용 소프트 신발", priority: "권장", coupang: "https://www.coupang.com/np/search?q=유아+걸음마+신발", ssg: "https://www.ssg.com/search.ssg?query=유아신발" },
      { name: "유아 전용 치약·칫솔", desc: "불소 함량 안전한 유아 치약", priority: "필수", coupang: "https://www.coupang.com/np/search?q=유아+치약+칫솔", kurly: "https://www.kurly.com/search?sword=유아치약", ssg: "https://www.ssg.com/search.ssg?query=유아치약" },
      { name: "블록·교육 완구", desc: "인지 발달을 위한 장난감", priority: "권장", coupang: "https://www.coupang.com/np/search?q=유아+블록+장난감", ssg: "https://www.ssg.com/search.ssg?query=유아블록" },
    ],
  },
];

const PRIORITY_COLOR: Record<string, string> = {
  "필수": "#ef4444",
  "권장": "#f59e0b",
  "선택": "#6b7280",
};

export default function SuppliesPage() {
  const [activeCategory, setActiveCategory] = useState<string>("newborn");
  const [purchased, setPurchased] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("mapagi-supplies-purchased") || "{}"); } catch { return {}; }
  });
  const [filterPriority, setFilterPriority] = useState<string>("전체");

  function togglePurchased(key: string) {
    const updated = { ...purchased, [key]: !purchased[key] };
    setPurchased(updated);
    localStorage.setItem("mapagi-supplies-purchased", JSON.stringify(updated));
  }

  const currentCat = CATEGORIES.find(c => c.id === activeCategory)!;
  const filteredItems = currentCat.items.filter(item =>
    filterPriority === "전체" || item.priority === filterPriority
  );
  const totalItems = currentCat.items.length;
  const purchasedCount = currentCat.items.filter(item => purchased[`${currentCat.id}-${item.name}`]).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">🛍️ 육아준비물</h2>
        <p className="page-subtitle">임신부터 유아까지 필요한 모든 것</p>
      </div>

      {/* Category tabs */}
      <div className="supplies-cat-tabs">
        {CATEGORIES.map(cat => (
          <button key={cat.id}
            className={`supplies-cat-btn ${activeCategory === cat.id ? "active" : ""}`}
            style={activeCategory === cat.id ? { borderColor: cat.color, color: cat.color } : {}}
            onClick={() => setActiveCategory(cat.id)}>
            <span>{cat.icon}</span>
            <span>{cat.title}</span>
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="supplies-progress">
        <div className="supplies-progress-label" style={{ color: currentCat.color }}>
          {currentCat.icon} {currentCat.title} — {purchasedCount}/{totalItems} 구매 완료
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(purchasedCount / totalItems) * 100}%`, background: currentCat.color }} />
        </div>
      </div>

      {/* Filter */}
      <div className="supplies-filter">
        {["전체", "필수", "권장", "선택"].map(f => (
          <button key={f} className={`filter-btn ${filterPriority === f ? "active" : ""}`}
            onClick={() => setFilterPriority(f)}>{f}</button>
        ))}
      </div>

      {/* Items list */}
      <div className="supplies-list">
        {filteredItems.map(item => {
          const key = `${currentCat.id}-${item.name}`;
          const done = !!purchased[key];
          return (
            <div key={item.name} className={`supply-item ${done ? "purchased" : ""}`}>
              <div className="supply-check-wrap">
                <input type="checkbox" checked={done} onChange={() => togglePurchased(key)} />
              </div>
              <div className="supply-info">
                <div className="supply-name-row">
                  <span className={`supply-name ${done ? "purchased-text" : ""}`}>{item.name}</span>
                  <span className="supply-priority" style={{ background: PRIORITY_COLOR[item.priority] }}>{item.priority}</span>
                </div>
                <div className="supply-desc">{item.desc}</div>
                <div className="supply-links">
                  {item.coupang && (
                    <a href={item.coupang} target="_blank" rel="noopener noreferrer" className="shop-link coupang">
                      🛒 쿠팡
                    </a>
                  )}
                  {item.kurly && (
                    <a href={item.kurly} target="_blank" rel="noopener noreferrer" className="shop-link kurly">
                      🟣 컬리
                    </a>
                  )}
                  {item.ssg && (
                    <a href={item.ssg} target="_blank" rel="noopener noreferrer" className="shop-link ssg">
                      🔴 신세계
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
