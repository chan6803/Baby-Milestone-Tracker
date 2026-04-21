// ================================================================
// iOS 드럼롤 스타일 날짜 선택 컴포넌트 (년·월·일 독립 스크롤)
// ================================================================
import { useRef, useEffect, useState } from "react";

const ITEM_H   = 46;   // 아이템 1개 높이 (px)
const VISIBLE  = 5;    // 보이는 아이템 수
const COL_H    = ITEM_H * VISIBLE; // 230px

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();  // month: 1-12
}

// ── 단일 스크롤 컬럼 ────────────────────────────────────────────
interface ColProps {
  items: string[];
  selectedIndex: number;
  onChange: (idx: number) => void;
  unit?: string;
}

function Column({ items, selectedIndex, onChange }: ColProps) {
  const ref     = useRef<HTMLDivElement>(null);
  const prevIdx = useRef<number | null>(null);
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrolling = useRef(false);

  // selectedIndex 변경 → 컬럼 스크롤 위치 동기화
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prevIdx.current === null) {
      // 최초 마운트: 애니메이션 없이 즉시 이동
      el.scrollTop = selectedIndex * ITEM_H;
    } else if (prevIdx.current !== selectedIndex && !isScrolling.current) {
      // 외부(부모)에서 인덱스가 바뀐 경우: 부드럽게 스크롤
      el.scrollTo({ top: selectedIndex * ITEM_H, behavior: "smooth" });
    }
    prevIdx.current = selectedIndex;
  }, [selectedIndex]);

  function onScroll() {
    isScrolling.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      // snap to grid
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      prevIdx.current = clamped;
      isScrolling.current = false;
      if (clamped !== selectedIndex) onChange(clamped);
    }, 120);
  }

  return (
    <div ref={ref} className="sdp-col" onScroll={onScroll}>
      {/* 위 여백 (첫 아이템이 중앙에 오도록) */}
      <div style={{ height: ITEM_H * 2 }} />
      {items.map((item, i) => (
        <div
          key={i}
          className={`sdp-item${i === selectedIndex ? " sdp-sel" : ""}`}
          onClick={() => {
            const el = ref.current;
            if (el) el.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
            prevIdx.current = i;
            onChange(i);
          }}
        >
          {item}
        </div>
      ))}
      {/* 아래 여백 */}
      <div style={{ height: ITEM_H * 2 }} />
    </div>
  );
}

// ── 메인 컴포넌트 ───────────────────────────────────────────────
interface Props {
  value: string;              // "YYYY-MM-DD" 형식, 없으면 ""
  onChange: (v: string) => void;
}

const TODAY    = new Date();
const CUR_YEAR = TODAY.getFullYear();
// 아기 앱용: -10년 ~ +2년
const YEARS    = Array.from({ length: 13 }, (_, i) => `${CUR_YEAR - 10 + i}년`);
const MONTHS   = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);

export default function ScrollDatePicker({ value, onChange }: Props) {
  function parse(v: string) {
    if (v && v.length === 10) {
      const y = parseInt(v.slice(0, 4));
      const m = parseInt(v.slice(5, 7));
      const d = parseInt(v.slice(8, 10));
      return { y, m, d };
    }
    return { y: CUR_YEAR, m: TODAY.getMonth() + 1, d: TODAY.getDate() };
  }

  const init = parse(value);
  const [year,  setYear]  = useState(init.y);
  const [month, setMonth] = useState(init.m);
  const [day,   setDay]   = useState(init.d);

  // year / month 가 바뀌면 day 를 유효 범위로 클램프
  useEffect(() => {
    const maxDay = getDaysInMonth(year, month);
    if (day > maxDay) {
      setDay(maxDay);
      emit(year, month, maxDay);
    }
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  function emit(y: number, m: number, d: number) {
    const maxDay = getDaysInMonth(y, m);
    const safeD  = Math.min(d, maxDay);
    onChange(`${y}-${String(m).padStart(2,"0")}-${String(safeD).padStart(2,"0")}`);
  }

  const yearIdx  = CUR_YEAR - 10 + YEARS.length - 1 - (CUR_YEAR + 2 - year);
  // 더 간단히:
  const yIdx = year - (CUR_YEAR - 10);
  const mIdx = month - 1;
  const daysInM = getDaysInMonth(year, month);
  const DAYS  = Array.from({ length: daysInM }, (_, i) => `${i + 1}일`);
  const dIdx  = Math.min(day - 1, daysInM - 1);

  function handleYear(idx: number) {
    const y = CUR_YEAR - 10 + idx;
    setYear(y);
    emit(y, month, day);
  }
  function handleMonth(idx: number) {
    const m = idx + 1;
    setMonth(m);
    emit(year, m, day);
  }
  function handleDay(idx: number) {
    const d = idx + 1;
    setDay(d);
    emit(year, month, d);
  }

  return (
    <div className="sdp-wrap">
      {/* 선택 영역 강조선 */}
      <div className="sdp-selector" />
      {/* 위아래 페이드 오버레이 */}
      <div className="sdp-fade sdp-fade-top" />
      <div className="sdp-fade sdp-fade-bot" />
      {/* 3개 컬럼 */}
      <div className="sdp-cols">
        <Column items={YEARS}  selectedIndex={Math.max(0, yIdx)} onChange={handleYear}  />
        <Column items={MONTHS} selectedIndex={mIdx}              onChange={handleMonth} />
        <Column items={DAYS}   selectedIndex={dIdx}              onChange={handleDay}   />
      </div>
    </div>
  );
}
