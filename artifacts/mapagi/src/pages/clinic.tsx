import { useState } from "react";

interface HospitalData {
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  website: string;
  region: string;
}

interface HospitalWithDistance extends HospitalData {
  distanceKm: number;
}

const ALL_HOSPITALS: HospitalData[] = [
  { name: "서울대학교병원", address: "서울 종로구 대학로 101", phone: "02-2072-2114", lat: 37.5796, lng: 126.9996, website: "https://www.snuh.org", region: "서울" },
  { name: "세브란스병원 (연세대)", address: "서울 서대문구 연세로 50-1", phone: "02-2228-5300", lat: 37.5621, lng: 126.9395, website: "https://www.severance.or.kr", region: "서울" },
  { name: "삼성서울병원", address: "서울 강남구 일원로 81", phone: "02-3410-3489", lat: 37.4881, lng: 127.0855, website: "https://www.samsunghospital.com", region: "서울" },
  { name: "서울아산병원", address: "서울 송파구 올림픽로43길 88", phone: "02-3010-3114", lat: 37.5270, lng: 127.1085, website: "https://www.amc.seoul.kr", region: "서울" },
  { name: "가톨릭대학교 서울성모병원", address: "서울 서초구 반포대로 222", phone: "02-2258-5114", lat: 37.5014, lng: 127.0049, website: "https://www.cmcsmc.or.kr", region: "서울" },
  { name: "고려대학교 안암병원", address: "서울 성북구 고려대로 73", phone: "02-920-5114", lat: 37.5893, lng: 127.0285, website: "https://anam.kumc.or.kr", region: "서울" },
  { name: "고려대학교 구로병원", address: "서울 구로구 구로동로 148", phone: "02-2626-1114", lat: 37.4959, lng: 126.8878, website: "https://guro.kumc.or.kr", region: "서울" },
  { name: "한양대학교병원", address: "서울 성동구 왕십리로 222-1", phone: "02-2290-8114", lat: 37.5572, lng: 127.0411, website: "https://www.hyumc.com", region: "서울" },
  { name: "경희대학교병원", address: "서울 동대문구 경희대로 26", phone: "02-958-8114", lat: 37.5953, lng: 127.0543, website: "https://www.khmc.or.kr", region: "서울" },
  { name: "이화여자대학교 목동병원", address: "서울 양천구 안양천로 1071", phone: "02-2650-5114", lat: 37.5286, lng: 126.8748, website: "https://www.eumc.ac.kr", region: "서울" },
  { name: "서울특별시 보라매병원", address: "서울 동작구 보라매로5길 20", phone: "02-870-2114", lat: 37.4965, lng: 126.9251, website: "https://www.brmh.org", region: "서울" },
  { name: "인하대학교병원", address: "인천 중구 인항로 27", phone: "032-890-2114", lat: 37.4591, lng: 126.6508, website: "https://www.inha.com", region: "인천" },
  { name: "가천대학교 길병원", address: "인천 남동구 남동대로 774번길 21", phone: "032-460-3114", lat: 37.4370, lng: 126.7301, website: "https://www.gilhospital.com", region: "인천" },
  { name: "아주대학교병원", address: "경기 수원시 영통구 월드컵로 164", phone: "031-219-5114", lat: 37.2798, lng: 127.0442, website: "https://hosp.ajoumc.or.kr", region: "경기" },
  { name: "분당서울대학교병원", address: "경기 성남시 분당구 구미로173번길 82", phone: "031-787-7114", lat: 37.3540, lng: 127.1241, website: "https://www.snubh.org", region: "경기" },
  { name: "가톨릭대학교 성빈센트병원", address: "경기 수원시 팔달구 중부대로 93", phone: "031-249-7114", lat: 37.2680, lng: 127.0044, website: "https://www.svh.or.kr", region: "경기" },
  { name: "한림대학교성심병원", address: "경기 안양시 동안구 관평로170번길 22", phone: "031-380-3114", lat: 37.3998, lng: 126.9553, website: "https://www.hallym.or.kr", region: "경기" },
  { name: "순천향대학교 부천병원", address: "경기 부천시 조마루로 170", phone: "032-621-5114", lat: 37.5041, lng: 126.7651, website: "https://www.schbc.ac.kr", region: "경기" },
  { name: "연세대학교 원주세브란스기독병원", address: "강원 원주시 일산로 20", phone: "033-741-1114", lat: 37.3513, lng: 127.9504, website: "https://www.wonjuseverance.or.kr", region: "강원" },
  { name: "강원대학교병원", address: "강원 춘천시 백령로 156", phone: "033-258-2000", lat: 37.8649, lng: 127.7322, website: "https://www.knuh.or.kr", region: "강원" },
  { name: "충북대학교병원", address: "충북 청주시 서원구 1순환로 776", phone: "043-269-6114", lat: 36.6263, lng: 127.4584, website: "https://www.cnuh.ac.kr", region: "충북" },
  { name: "충남대학교병원", address: "대전 중구 문화로 282", phone: "042-280-7114", lat: 36.3234, lng: 127.4215, website: "https://www.cnuh.co.kr", region: "대전" },
  { name: "가톨릭대학교 대전성모병원", address: "대전 중구 대흥로 64", phone: "042-220-9114", lat: 36.3293, lng: 127.4285, website: "https://www.cmcdjm.or.kr", region: "대전" },
  { name: "을지대학교병원", address: "대전 서구 둔산서로 95", phone: "042-611-3114", lat: 36.3513, lng: 127.3879, website: "https://www.emc.ac.kr", region: "대전" },
  { name: "전북대학교병원", address: "전북 전주시 덕진구 건지로 20", phone: "063-250-1114", lat: 35.8461, lng: 127.1340, website: "https://www.jbuh.or.kr", region: "전북" },
  { name: "원광대학교병원", address: "전북 익산시 무왕로 895", phone: "063-859-1114", lat: 35.9577, lng: 126.9975, website: "https://www.wkuh.org", region: "전북" },
  { name: "전남대학교병원", address: "광주 동구 제봉로 42", phone: "062-220-5114", lat: 35.1475, lng: 126.9233, website: "https://www.cnuh.com", region: "광주" },
  { name: "조선대학교병원", address: "광주 동구 필문대로 365", phone: "062-220-3114", lat: 35.1431, lng: 126.9299, website: "https://www.csuh.or.kr", region: "광주" },
  { name: "경북대학교병원", address: "대구 중구 달성로 33", phone: "053-200-5114", lat: 35.8723, lng: 128.5960, website: "https://www.knuh.ac.kr", region: "대구" },
  { name: "영남대학교병원", address: "대구 남구 현충로 170", phone: "053-620-3114", lat: 35.8395, lng: 128.5977, website: "https://www.yumc.ac.kr", region: "대구" },
  { name: "계명대학교 동산병원", address: "대구 달서구 달구벌대로 1035", phone: "053-258-7114", lat: 35.8668, lng: 128.5273, website: "https://www.dsmc.or.kr", region: "대구" },
  { name: "부산대학교병원", address: "부산 서구 구덕로 179", phone: "051-240-7000", lat: 35.1074, lng: 129.0199, website: "https://www.pnuh.ac.kr", region: "부산" },
  { name: "고신대학교 복음병원", address: "부산 서구 감천로 262", phone: "051-990-6114", lat: 35.0986, lng: 129.0152, website: "https://www.kosinuhospital.or.kr", region: "부산" },
  { name: "동아대학교병원", address: "부산 서구 대신공원로 26", phone: "051-240-2000", lat: 35.1124, lng: 129.0088, website: "https://www.damc.or.kr", region: "부산" },
  { name: "인제대학교 해운대백병원", address: "부산 해운대구 해운대로 875", phone: "051-797-0100", lat: 35.1629, lng: 129.1675, website: "https://www.paik.ac.kr", region: "부산" },
  { name: "경상국립대학교병원", address: "경남 진주시 강남로 79", phone: "055-750-8000", lat: 35.1845, lng: 128.0827, website: "https://www.gnuh.co.kr", region: "경남" },
  { name: "창원경상국립대학교병원", address: "경남 창원시 성산구 삼정자로 11", phone: "055-214-3000", lat: 35.2311, lng: 128.6777, website: "https://www.changwon.gnuh.co.kr", region: "경남" },
  { name: "제주대학교병원", address: "제주 제주시 아란13길 15", phone: "064-717-1114", lat: 33.4776, lng: 126.5471, website: "https://www.jejunuh.co.kr", region: "제주" },
];

function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function getNearbySearchUrl(lat: number, lng: number): { naver: string; kakao: string; google: string } {
  const query = encodeURIComponent("소아과");
  return {
    naver: `https://map.naver.com/v5/search/${query}?c=${lng},${lat},15,0,0,0,dh`,
    kakao: `https://map.kakao.com/?q=${query}`,
    google: `https://www.google.com/maps/search/소아과/@${lat},${lng},15z`,
  };
}

function getHospitalMapUrl(h: HospitalData): { naver: string; kakao: string } {
  const q = encodeURIComponent(h.name);
  return {
    naver: `https://map.naver.com/v5/search/${q}`,
    kakao: `https://map.kakao.com/?q=${q}`,
  };
}

export default function ClinicPage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCount, setShowCount] = useState(5);

  function requestLocation() {
    setLoading(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("이 브라우저는 위치 정보를 지원하지 않아요.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setShowCount(5);
        setLoading(false);
      },
      (err) => {
        if (err.code === 1) setLocationError("위치 권한이 거부되었어요. 브라우저 설정에서 허용해 주세요.");
        else setLocationError("위치를 가져오지 못했어요. 다시 시도해 주세요.");
        setLoading(false);
      },
      { timeout: 10000 }
    );
  }

  const searchUrls = location ? getNearbySearchUrl(location.lat, location.lng) : null;

  const sortedHospitals: HospitalWithDistance[] = location
    ? ALL_HOSPITALS
        .map(h => ({ ...h, distanceKm: calcDistanceKm(location.lat, location.lng, h.lat, h.lng) }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : ALL_HOSPITALS.map(h => ({ ...h, distanceKm: 0 }));

  const visibleHospitals = sortedHospitals.slice(0, showCount);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">🏥 가까운 소아과 찾기</h2>
        <p className="page-subtitle">내 위치에서 가까운 소아과·대학병원을 찾아요</p>
      </div>

      {/* Location section */}
      <div className="clinic-location-card">
        <div className="clinic-loc-icon">📍</div>
        <div className="clinic-loc-content">
          {!location && !loading && (
            <>
              <p className="clinic-loc-desc">현재 위치를 기반으로 가까운 소아과와 대학병원을 가까운 순으로 정렬해 드려요.</p>
              {locationError && <p className="clinic-loc-error">⚠ {locationError}</p>}
              <button className="btn-location" onClick={requestLocation}>
                📍 현재 위치 가져오기
              </button>
            </>
          )}
          {loading && (
            <div className="clinic-loc-desc loading" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div className="loading-spinner" style={{ width: 18, height: 18, border: "2.5px solid #f0e0f8", borderTopColor: "#e8457a", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              위치 정보를 가져오는 중...
            </div>
          )}
          {location && searchUrls && (
            <>
              <p className="clinic-loc-success">✅ 위치 확인! 근처 소아과를 지도 앱에서 검색하거나 아래 대학병원 목록을 확인해 보세요.</p>
              <div className="map-buttons">
                <a href={searchUrls.naver} target="_blank" rel="noopener noreferrer" className="map-btn naver-btn">
                  <span>N</span> 네이버지도
                </a>
                <a href={searchUrls.kakao} target="_blank" rel="noopener noreferrer" className="map-btn kakao-btn">
                  <span>K</span> 카카오맵
                </a>
                <a href={searchUrls.google} target="_blank" rel="noopener noreferrer" className="map-btn google-btn">
                  <span>G</span> 구글지도
                </a>
              </div>
              <button className="btn-location-retry" onClick={requestLocation}>위치 다시 찾기</button>
            </>
          )}
        </div>
      </div>

      {/* Reservation tip */}
      <div className="reservation-tip-card">
        <h3 className="tip-title">📋 예약 방법 안내</h3>
        <div className="tip-list">
          <div className="tip-item">
            <span className="tip-icon">📱</span>
            <div>
              <strong>똑닥 앱</strong>
              <p>전국 소아과 실시간 예약 · 접수 앱. 대기 현황도 확인 가능해요.</p>
              <a href="https://www.ddocdoc.com" target="_blank" rel="noopener noreferrer" className="tip-link">똑닥 앱 바로가기 →</a>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">💻</span>
            <div>
              <strong>네이버 예약</strong>
              <p>네이버 지도에서 소아과 검색 후 '예약' 버튼을 눌러 온라인 예약이 가능해요.</p>
              <a href="https://map.naver.com/v5/search/소아과" target="_blank" rel="noopener noreferrer" className="tip-link">네이버 소아과 검색 →</a>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">☎️</span>
            <div>
              <strong>전화 예약</strong>
              <p>직접 전화로 예방접종 예약 시 백신 이름과 차수를 함께 알려주세요.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sorted hospital list */}
      <div className="clinic-section-header">
        <div className="clinic-section-title">
          {location ? "📍 가까운 대학병원 순" : "🏥 전국 주요 대학병원"}
        </div>
        {!location && (
          <button className="clinic-loc-inline-btn" onClick={requestLocation}>
            위치 기반 정렬 →
          </button>
        )}
      </div>

      <div className="clinic-list">
        {visibleHospitals.map((h, i) => {
          const mapUrls = getHospitalMapUrl(h);
          return (
            <div key={h.name} className="clinic-card">
              <div className="clinic-card-top">
                {location && (
                  <div className={`clinic-rank rank-${i < 3 ? i + 1 : "other"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}위`}
                  </div>
                )}
                <div className="clinic-card-main">
                  <div className="clinic-header">
                    <div className="clinic-name">🏥 {h.name}</div>
                    {location && (
                      <div className="clinic-distance">{formatDistance(h.distanceKm)}</div>
                    )}
                  </div>
                  <div className="clinic-meta-row">
                    <span className="clinic-region-badge">{h.region}</span>
                    <span className="clinic-address">📌 {h.address}</span>
                  </div>
                </div>
              </div>
              <div className="clinic-actions">
                <a href={mapUrls.naver} target="_blank" rel="noopener noreferrer" className="clinic-map-btn naver">네이버지도</a>
                <a href={mapUrls.kakao} target="_blank" rel="noopener noreferrer" className="clinic-map-btn kakao">카카오맵</a>
                <a href={`tel:${h.phone}`} className="clinic-map-btn call">📞 {h.phone}</a>
                <a href={h.website} target="_blank" rel="noopener noreferrer" className="clinic-map-btn web">병원 홈</a>
              </div>
            </div>
          );
        })}
      </div>

      {showCount < sortedHospitals.length && (
        <button className="clinic-show-more" onClick={() => setShowCount(c => c + 5)}>
          더 보기 ({sortedHospitals.length - showCount}개 더)
        </button>
      )}

      <div className="clinic-notice">
        <p>💡 예방접종 전 소아과에 전화로 백신 재고를 확인하세요. 국가필수예방접종(NIP)은 무료로 맞을 수 있어요.</p>
      </div>
    </div>
  );
}
