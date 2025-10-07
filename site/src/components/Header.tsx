import React from 'react';

interface HeaderProps {
  totalScore: number;
  totalPossible: number;
  showAnswers: boolean;
  onToggleAnswers: () => void;
  canViewAnswers: boolean;
  title: string;
  note?: string;
  standard?: string;
  timezone?: string;
  isSubmitted: boolean;
}

const Header: React.FC<HeaderProps> = ({
  totalScore,
  totalPossible,
  showAnswers,
  onToggleAnswers,
  canViewAnswers,
  title,
  note,
  standard,
  timezone,
  isSubmitted
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur shadow-sm border-b border-slate-200">
      <div className="mx-auto max-w-4xl px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {note && <p className="text-sm text-slate-600">{note}</p>}
          {(standard || timezone) && (
            <p className="text-xs text-slate-500 mt-1">
              {standard && <span>依据标准：{standard}</span>}
              {standard && timezone && <span> · </span>}
              {timezone && <span>计算时区：{timezone}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-slate-500">客观题得分</p>
            <p className="text-lg font-semibold text-primary">
              {isSubmitted ? (
                <>
                  {totalScore} / {totalPossible}
                </>
              ) : (
                '—'
              )}
            </p>
            {!isSubmitted && <p className="text-xs text-slate-500">提交后显示得分</p>}
          </div>
          {canViewAnswers && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                checked={showAnswers}
                onChange={onToggleAnswers}
              />
              显示参考答案
            </label>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
