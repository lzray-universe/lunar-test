import React from 'react';

interface HeaderProps {
  totalScore: number;
  totalPossible: number;
  showAnswers: boolean;
  onToggleAnswers: () => void;
}

const Header: React.FC<HeaderProps> = ({ totalScore, totalPossible, showAnswers, onToggleAnswers }) => {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur shadow-sm border-b border-slate-200">
      <div className="mx-auto max-w-4xl px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">农历测试卷</h1>
          <p className="text-sm text-slate-600">严格按现代中国农历（GB/T 33661-2017，采用北京时间与定气；UTC+8）</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-slate-500">客观题即时得分</p>
            <p className="text-lg font-semibold text-primary">{totalScore} / {totalPossible}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              checked={showAnswers}
              onChange={onToggleAnswers}
            />
            显示参考答案
          </label>
        </div>
      </div>
    </header>
  );
};

export default Header;
