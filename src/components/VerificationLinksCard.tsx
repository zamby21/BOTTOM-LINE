import React, { useState } from 'react';
import { VERIFICATION_PORTALS } from '../utils/regulatoryPredictor';
import {
  ExternalLink,
  Copy,
  Check,
  FileSearch,
  ShieldAlert,
  GraduationCap,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface VerificationLinksCardProps {
  currentAddress: string;
}

export const VerificationLinksCard: React.FC<VerificationLinksCardProps> = ({
  currentAddress,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopyAddress = () => {
    if (!currentAddress) return;
    navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePortalClick = () => {
    if (currentAddress) {
      navigator.clipboard.writeText(currentAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center">
            <FileSearch className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
              정부 공식 무료 확인 사이트 바로가기
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                수수료 무료
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              건축물대장 위반 표기 및 교육환경보호구역 저촉 여부를 공식 전산망에서 즉시 확인하세요. (클릭 시 주소 자동 복사)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Address copy helper bar */}
      {currentAddress && (
        <div className="flex items-center justify-between bg-slate-800/80 px-3.5 py-2 rounded-xl text-xs border border-slate-700">
          <div className="flex items-center gap-2 truncate text-slate-300">
            <span className="text-slate-400 font-semibold flex-shrink-0">현재 주소:</span>
            <span className="truncate font-mono font-medium">{currentAddress}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyAddress}
            className="flex-shrink-0 ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? '복사완료!' : '주소 복사'}
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {VERIFICATION_PORTALS.map((portal) => (
            <a
              key={portal.id}
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handlePortalClick}
              className="group block p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/60 transition-all text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${portal.badgeColor}`}>
                    {portal.badge}
                  </span>
                  <span className="font-bold text-xs text-white group-hover:text-blue-300 transition-colors">
                    {portal.name}
                  </span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white flex-shrink-0 mt-0.5" />
              </div>

              <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                {portal.description}
              </p>

              <div className="mt-2 pt-2 border-t border-slate-700/60 text-[10px] text-slate-300 flex items-start gap-1">
                <Info className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{portal.howToCheck}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
