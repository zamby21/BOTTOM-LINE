import React, { useState } from 'react';
import { CandidateLocation } from '../types/decision';
import {
  Building2,
  Layers,
  RotateCcw,
  Plus,
  Scale,
  FileText,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  candidates: CandidateLocation[];
  activeCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onAddCandidate: () => void;
  onResetPresets: () => void;
  onOpenReport: () => void;
  onOpenCompare: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  candidates,
  activeCandidateId,
  onSelectCandidate,
  onAddCandidate,
  onResetPresets,
  onOpenReport,
  onOpenCompare,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeCandidate = candidates.find((c) => c.id === activeCandidateId) || candidates[0];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs print:hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo & Value Hook */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 flex items-center justify-center text-white shadow-xs flex-shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900">
                  BOTTOM LINE
                </span>
                <span className="px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md truncate">
                  상업용 부동산 판정
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate hidden md:block">
                Top-line 매출추정 한계 극복 ➔ 비용구조(Bottom-line) & 6대 규제(Risk) 종합 의사결정
              </p>
            </div>
          </div>

          {/* Desktop Candidate Switcher & Actions */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 px-2 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                검토 매물:
              </span>
              <select
                value={activeCandidateId}
                onChange={(e) => onSelectCandidate(e.target.value)}
                className="bg-white border-0 text-xs font-semibold text-slate-800 rounded-md px-2.5 py-1 shadow-2xs focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer max-w-[240px] truncate"
              >
                {candidates.map((c, idx) => (
                  <option key={c.id} value={c.id}>
                    #{idx + 1}. {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onAddCandidate}
                title="새 후보지 추가"
                className="ml-1 p-1 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenCompare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              후보지 비교 ({candidates.length})
            </button>

            <button
              type="button"
              onClick={onOpenReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5" />
              AI 리포트
            </button>

            <button
              type="button"
              onClick={onResetPresets}
              title="예시 3곳 초기화"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Right Quick Action Buttons */}
          <div className="flex lg:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenCompare}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>비교</span>
            </button>

            <button
              type="button"
              onClick={onOpenReport}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>리포트</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="메뉴 열기"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 py-3 space-y-3 bg-white">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider">
                현재 검토 후보지 선택:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {candidates.map((c, idx) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelectCandidate(c.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`p-2.5 text-left rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                      c.id === activeCandidateId
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">
                      #{idx + 1}. {c.name}
                    </span>
                    <span className="text-[10px] opacity-80 flex-shrink-0 ml-2">
                      {c.deposit}만 / {c.monthlyRent}만
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onAddCandidate();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                새 후보지 추가
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetPresets();
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                예시 3곳 초기화
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
