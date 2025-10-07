import React from 'react';
import { EssayQuestion, ObjectiveSummary } from '../lib/types';

interface EssayProps {
  question: EssayQuestion;
  examineeName: string;
  content: string;
  onNameChange: (value: string) => void;
  onContentChange: (value: string) => void;
  mailtoHref: string;
  onExport: () => void;
}

const Essay: React.FC<EssayProps> = ({
  question,
  examineeName,
  content,
  onNameChange,
  onContentChange,
  mailtoHref,
  onExport
}) => {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">{question.title}</h2>
      <div
        className="prose prose-sm max-w-none text-slate-700"
        dangerouslySetInnerHTML={{ __html: question.promptHtml }}
      />
      <div className="space-y-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          考生姓名
          <input
            value={examineeName}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="请输入姓名"
            className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          作答内容
          <textarea
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            rows={10}
            placeholder="请在此详细作答，可粘贴计算过程。"
            className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <a
          href={mailtoHref}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500"
        >
          一键邮件提交
        </a>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-900"
        >
          导出 .txt
        </button>
      </div>
    </section>
  );
};

export default Essay;
