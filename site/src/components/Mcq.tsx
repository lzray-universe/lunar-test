import React from 'react';
import { McqQuestion } from '../lib/types';

interface McqProps {
  question: McqQuestion;
  selected: number | null;
  onSelect: (choice: number) => void;
  answerIndex: number;
  showAnswers: boolean;
  isSubmitted: boolean;
}

const Mcq: React.FC<McqProps> = ({ question, selected, onSelect, answerIndex, showAnswers, isSubmitted }) => {
  const isCorrect = selected !== null && selected === answerIndex;
  const hasAnswered = selected !== null && selected !== undefined;

  return (
    <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-slate-900">{question.stem}</h3>
        {isSubmitted && hasAnswered && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {isCorrect ? '✔ 正确' : '✘ 错误'}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {question.options.map((option, idx) => {
          const optionId = `${question.id}-${idx}`;
          const isSelected = selected === idx;
          const isAnswer = idx === answerIndex;
          const showCorrectState = showAnswers && isAnswer;
          return (
            <label
              key={optionId}
              htmlFor={optionId}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-primary/40 hover:bg-primary/5'
              } ${showCorrectState ? 'border-emerald-500 bg-emerald-50' : ''}`}
            >
              <input
                id={optionId}
                type="radio"
                name={question.id}
                className="h-4 w-4 text-primary focus:ring-primary"
                checked={isSelected}
                onChange={() => onSelect(idx)}
              />
              <span className="text-sm text-slate-700">{option}</span>
            </label>
          );
        })}
      </div>
      {showAnswers && question.explain && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 border border-dashed border-slate-200">
          <p className="font-medium text-slate-700">解析：</p>
          <p>{question.explain}</p>
        </div>
      )}
    </div>
  );
};

export default Mcq;
