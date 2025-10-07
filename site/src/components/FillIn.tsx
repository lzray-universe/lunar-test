import React from 'react';
import { FillinQuestion } from '../lib/types';

interface FillInProps {
  question: FillinQuestion;
  value: string;
  onChange: (value: string) => void;
  onCheck: () => void;
  isCorrect: boolean | null;
  showAnswers: boolean;
  answerDetail?: string;
  canCheck: boolean;
  explain?: string;
}

const typeToInputMode: Record<string, React.HTMLAttributes<HTMLInputElement>['inputMode']> = {
  number: 'decimal',
  text: 'text',
  date: 'numeric',
  regex: 'text'
};

const FillIn: React.FC<FillInProps> = ({
  question,
  value,
  onChange,
  onCheck,
  isCorrect,
  showAnswers,
  answerDetail,
  canCheck,
  explain
}) => {
  const feedback = isCorrect === null ? null : isCorrect;
  return (
    <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{question.stem}</h3>
          {question.formatHint && <p className="text-xs text-slate-500 mt-1">提示：{question.formatHint}</p>}
        </div>
        {feedback !== null && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm ${feedback ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {feedback ? '✔ 正确' : '✘ 待修改'}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="在此作答"
          inputMode={typeToInputMode[question.type] ?? 'text'}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${
            feedback === false ? 'border-rose-400' : 'border-slate-300'
          }`}
        />
        {canCheck && (
          <button
            type="button"
            onClick={onCheck}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary"
          >
            检查本题
          </button>
        )}
      </div>
      {showAnswers && (answerDetail || explain) && (
        <div className="rounded-lg bg-slate-50 border border-dashed border-slate-200 p-3 text-sm text-slate-600">
          <p className="font-medium text-slate-700">参考答案：</p>
          {answerDetail && <p>{answerDetail}</p>}
          {explain && <p className="mt-1 text-slate-700">解析：{explain}</p>}
        </div>
      )}
    </div>
  );
};

export default FillIn;
