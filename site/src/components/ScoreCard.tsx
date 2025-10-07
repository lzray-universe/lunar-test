import React from 'react';
import { ObjectiveSummary } from '../lib/types';

interface ScoreCardProps {
  summary: ObjectiveSummary;
  onReset: () => void;
}

const renderList = (label: string, ids: string[]) => (
  <div className="flex flex-col gap-1">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <span className="text-sm text-slate-600">{ids.length ? ids.join('、') : '无'}</span>
  </div>
);

const ScoreCard: React.FC<ScoreCardProps> = ({ summary, onReset }) => {
  return (
    <section className="rounded-2xl bg-white shadow-lg border border-slate-200 p-6 space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">客观题得分概览</h2>
        <p className="text-sm text-slate-600">选择题 + 填空题即时计分，刷新自动恢复。</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
          <p className="text-sm text-slate-500">选择题</p>
          <p className="text-lg font-semibold text-primary">{summary.mcq.score} / {summary.mcq.total}</p>
          {renderList('错题编号', summary.mcq.incorrectIds)}
        </div>
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
          <p className="text-sm text-slate-500">填空题</p>
          <p className="text-lg font-semibold text-primary">{summary.fillins.score} / {summary.fillins.total}</p>
          {renderList('错题编号', summary.fillins.incorrectIds)}
        </div>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-slate-600">客观题总分</p>
          <p className="text-2xl font-bold text-slate-900">{summary.totalScore} / {summary.totalPossible}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center rounded-lg border border-rose-400 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-400"
        >
          重置本卷
        </button>
      </div>
    </section>
  );
};

export default ScoreCard;
