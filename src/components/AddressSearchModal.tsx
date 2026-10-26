import React, { useEffect, useRef, useState } from 'react';
import { Search, X, MapPin, Building, Sparkles, AlertCircle } from 'lucide-react';

interface AddressSearchResult {
  fullAddress: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName: string;
  bname: string;
  sido: string;
  sigungu: string;
}

interface AddressSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (result: AddressSearchResult) => void;
}

// 대한민국 주요 핵심 상권 퀵 프리셋
const POPULAR_COMMERCIAL_AREAS = [
  { name: '성수 연무장길', address: '서울특별시 성동구 연무장길 42', desc: 'MZ 팝업·스페셜티 카페 밀집 (서울 9억)' },
  { name: '강남역 테헤란로', address: '서울특별시 강남구 테헤란로4길 19', desc: '직장인 오피스·F&B 다이닝 상권 (서울 9억)' },
  { name: '홍대입구 어울마당로', address: '서울특별시 마포구 어울마당로 78', desc: '청년 유동인구·감성 펍·패션 (서울 9억)' },
  { name: '판교역 아브뉴프랑', address: '경기도 성남시 분당구 분당내곡로 117', desc: 'IT 판교 테크노밸리 (과밀 6.9억)' },
  { name: '수원 행리단길', address: '경기도 수원시 팔달구 화서문로 45', desc: '화성행궁 뉴트로 감성 카페거리 (과밀 6.9억)' },
  { name: '부산 서면 1번가', address: '부산광역시 부산진구 중앙대로691번길 32', desc: '부산 최대 메인 상권 (부산 6.9억)' },
  { name: '해운대 구남로', address: '부산광역시 해운대구 구남로 29', desc: '사계절 관광·외식 상권 (부산 6.9억)' },
  { name: '대구 동성로', address: '대구광역시 중구 동성로2길 50', desc: '대구 중심 번화가 상권 (광역시 5.4억)' },
  { name: '대전 둔산동 갤러리아', address: '대전광역시 서구 대덕대로 211', desc: '대전 관공서·쇼핑 메인 상권 (광역시 5.4억)' },
  { name: '화성 동탄호수공원', address: '경기도 화성시 동탄순환대로 127', desc: '동탄2 신도시 호수공원 상권 (특정시 5.4억)' },
  { name: '강릉 안목해변 커피거리', address: '강원특별자치도 강릉시 창해로 14번길 20', desc: '관광형 해변 카페거리 (기타 3.7억)' },
  { name: '제주 애월 카페거리', address: '제주특별자치도 제주시 애월읍 애월로1길 24', desc: '제주 오션뷰 핫플레이스 (기타 3.7억)' },
];

export const AddressSearchModal: React.FC<AddressSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectAddress,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [daumLoaded, setDaumLoaded] = useState(false);
  const [searchTab, setSearchTab] = useState<'daum' | 'presets'>('daum');

  useEffect(() => {
    if (!isOpen) return;

    const checkAndInitDaum = () => {
      if ((window as any).daum && (window as any).daum.Postcode && containerRef.current) {
        setDaumLoaded(true);
        containerRef.current.innerHTML = '';
        new (window as any).daum.Postcode({
          oncomplete: (data: any) => {
            const roadAddr = data.roadAddress || data.autoRoadAddress || data.address;
            const extraAddr = data.buildingName ? ` (${data.buildingName})` : '';
            const fullAddress = `${roadAddr}${extraAddr}`;

            onSelectAddress({
              fullAddress,
              roadAddress: roadAddr,
              jibunAddress: data.jibunAddress || data.autoJibunAddress || '',
              buildingName: data.buildingName || '',
              bname: data.bname || '',
              sido: data.sido || '',
              sigungu: data.sigungu || '',
            });
            onClose();
          },
          width: '100%',
          height: '100%',
        }).embed(containerRef.current);
      } else {
        // Retry loading script dynamically if needed
        const scriptId = 'daum-postcode-script-loader';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
          script.onload = () => {
            if (containerRef.current && (window as any).daum?.Postcode) {
              setDaumLoaded(true);
              new (window as any).daum.Postcode({
                oncomplete: (data: any) => {
                  const roadAddr = data.roadAddress || data.autoRoadAddress || data.address;
                  const extraAddr = data.buildingName ? ` (${data.buildingName})` : '';
                  const fullAddress = `${roadAddr}${extraAddr}`;
                  onSelectAddress({
                    fullAddress,
                    roadAddress: roadAddr,
                    jibunAddress: data.jibunAddress || data.autoJibunAddress || '',
                    buildingName: data.buildingName || '',
                    bname: data.bname || '',
                    sido: data.sido || '',
                    sigungu: data.sigungu || '',
                  });
                  onClose();
                },
                width: '100%',
                height: '100%',
              }).embed(containerRef.current);
            }
          };
          document.body.appendChild(script);
        }
      }
    };

    const timer = setTimeout(checkAndInitDaum, 100);
    return () => clearTimeout(timer);
  }, [isOpen, searchTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                소재지 주소 찾기
              </h3>
              <p className="text-[11px] text-slate-500">
                도로명·지번 주소를 선택하면 상가임대차보호법 환산보증금 기준이 자동 적용됩니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between Daum Postcode and Popular Commercial Districts */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSearchTab('daum')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              searchTab === 'daum'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            우편번호 / 도로명 검색 (다음 주소)
          </button>
          <button
            type="button"
            onClick={() => setSearchTab('presets')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              searchTab === 'presets'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            전국 주요 핵심상권 퀵선택
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-4 overflow-y-auto min-h-[420px]">
          {searchTab === 'daum' ? (
            <div className="w-full h-[460px] relative">
              <div ref={containerRef} className="w-full h-full border border-slate-200 rounded-xl overflow-hidden" />
              {!daumLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-500 text-xs space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>주소 검색 엔진 로딩 중...</span>
                  <button
                    type="button"
                    onClick={() => setSearchTab('presets')}
                    className="text-blue-600 font-bold underline mt-2"
                  >
                    핵심 상권 목록에서 선택하기
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                원하는 주요 상권을 클릭하면 주소와 법정 환산보증금 기준이 즉시 적용됩니다.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {POPULAR_COMMERCIAL_AREAS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onSelectAddress({
                        fullAddress: item.address,
                        roadAddress: item.address,
                        jibunAddress: '',
                        buildingName: item.name,
                        bname: item.name,
                        sido: item.address.split(' ')[0] || '',
                        sigungu: item.address.split(' ')[1] || '',
                      });
                      onClose();
                    }}
                    className="p-3 text-left rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="font-bold text-slate-900 text-xs group-hover:text-blue-600 flex items-center justify-between">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">선택</span>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate mt-0.5">
                      {item.address}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
