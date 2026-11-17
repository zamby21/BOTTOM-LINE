import React from 'react';
import { AnalysisHistoryRecord } from '../types/decision';
import {
  X,
  History,
  Trash2,
  FolderOpen,
  PlusCircle,
  Clock,
} from 'lucide-react';

interface AnalysisHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: AnalysisHistoryRecord[];
  onSaveCurrentSnapshot: () => void;
  onRestoreSnapshot: (record: AnalysisHistoryRecord) => void;
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
}

export const AnalysisHistoryModal: React.FC<AnalysisHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSaveCurrentSnapshot,
  onRestoreSnapshot,
  onDeleteRecord,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
              <History className="w-4 h-4" />
              <span>임대차 분석 히스토리</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              저장된 후보지 심사 스냅샷 ({history.length}건)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveCurrentSnapshot}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-2xs transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              현재 매물 스냅샷 저장
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {history.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-sm">
                  저장된 분석 기록이 없습니다
                </h3>
                <p className="text-xs text-slate-500">
                  조건을 변경하며 시뮬레이션한 후보지를 스냅샷으로 저장해 두고 언제든 다시 불러와 비교할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={onSaveCurrentSnapshot}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                지금 검토 중인 매물 저장하기
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>스냅샷을 열면 해당 시점의 모든 임대조건·비용·실사 기록이 복원됩니다.</span>
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-rose-600 hover:text-rose-800 font-bold underline"
                >
                  히스토리 전체 삭제
                </button>
              </div>

              <div className="space-y-2.5">
                {history.map((record) => {
                  const verdictBadge =
                    record.verdictCode === 'GO'
                      ? 'bg-emerald-600 text-white'
                      : record.verdictCode === 'CONDITIONAL'
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-600 text-white';

                  return (
                    <div
                      key={record.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${verdictBadge}`}>
                            {record.verdictTitle} · {record.totalScore}점
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 tabular-nums">
                            <Clock className="w-3 h-3" />
                            {record.savedAt}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {record.candidate.name}
                        </h4>
                        <p className="text-xs text-slate-500 truncate">
                          {record.candidate.address} · {record.candidate.businessName} · 보증금 {record.candidate.deposit.toLocaleString()}만 / 월세 {record.candidate.monthlyRent.toLocaleString()}만
                        </p>
                        <div className="text-xs text-slate-700 font-semibold tabular-nums">
                          월 매출 {Math.round(record.monthlyRevenue).toLocaleString()}만 · 월 영업이익{' '}
                          <span className={record.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {Math.round(record.monthlyOperatingProfit).toLocaleString()}만
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onRestoreSnapshot(record);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs transition-colors"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          열기
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRecord(record.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
