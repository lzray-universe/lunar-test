import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Header from './components/Header';
import Mcq from './components/Mcq';
import FillIn from './components/FillIn';
import Essay from './components/Essay';
import ScoreCard from './components/ScoreCard';
import quizSample from './data/quiz.sample.json';
import answersSample from './data/answers.sample.json';
import { AnswerData, FillinQuestion, FillinRule, ObjectiveSummary, QuizData } from './lib/types';
import { essayMailTemplate, gradeFillin, summarizeObjective } from './lib/grading';

const STORAGE_ANSWERS_KEY = 'lunisolar-quiz/v1/answers';
const STORAGE_SCORE_KEY = 'lunisolar-quiz/v1/score';
const STORAGE_META_KEY = 'lunisolar-quiz/v1/meta';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Shanghai');

type StoredPayload = {
  mcq: Record<string, number | null>;
  fillins: Record<string, string>;
  essay?: { content: string; name: string };
  showAnswers?: boolean;
  submitted?: boolean;
};

type MetaState = {
  fillinStatus: Record<string, boolean | null>;
  isSubmitted?: boolean;
};

const loadStoredAnswers = (): StoredPayload | null => {
  try {
    const raw = localStorage.getItem(STORAGE_ANSWERS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPayload;
  } catch (error) {
    console.warn('无法解析本地存储答案', error);
    return null;
  }
};

const loadStoredMeta = (): MetaState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MetaState;
  } catch (error) {
    console.warn('无法解析本地存储元数据', error);
    return null;
  }
};

const buildDefaultState = (quiz: QuizData) => {
  const mcq: Record<string, number | null> = {};
  const fillins: Record<string, string> = {};
  const fillinStatus: Record<string, boolean | null> = {};
  quiz.mcq.forEach((q) => {
    mcq[q.id] = null;
  });
  quiz.fillins.forEach((q) => {
    fillins[q.id] = '';
    fillinStatus[q.id] = null;
  });
  return { mcq, fillins, fillinStatus };
};

const describeFillinRule = (rule?: FillinRule): string => {
  if (!rule) return '暂无答案';
  switch (rule.mode) {
    case 'number':
      return `答案：${rule.answer}${rule.tolerance ? `（允许误差 ±${rule.tolerance}）` : ''}`;
    case 'text':
      if (rule.accept && rule.accept.length) {
        return `可接受：${rule.accept.join('、')}`;
      }
      return `答案：${rule.answer ?? '（未提供）'}`;
    case 'date':
      if (rule.accept && rule.accept.length) {
        return `标准：${rule.answer ?? ''}，可接受：${rule.accept.join('、')}`;
      }
      return `标准日期：${rule.answer ?? '（未提供）'}`;
    case 'regex':
      return `匹配正则：${rule.pattern}`;
    default:
      return '答案规则未识别';
  }
};

const App: React.FC = () => {
  const quiz = useMemo(() => quizSample as QuizData, []);
  const answers = useMemo(() => answersSample as AnswerData, []);
  const appendixText = useMemo(() => {
    if (!quiz.appendix) return '';
    return quiz.appendix.replace(/\r?\n/g, '\n').replace(/\\n/g, '\n');
  }, [quiz.appendix]);
  const defaults = useMemo(() => buildDefaultState(quiz), [quiz]);
  const storedPayload = typeof window !== 'undefined' ? loadStoredAnswers() : null;
  const storedMeta = typeof window !== 'undefined' ? loadStoredMeta() : null;
  const [mcqResponses, setMcqResponses] = useState<Record<string, number | null>>({
    ...defaults.mcq,
    ...(storedPayload?.mcq ?? {})
  });
  const [fillinResponses, setFillinResponses] = useState<Record<string, string>>({
    ...defaults.fillins,
    ...(storedPayload?.fillins ?? {})
  });
  const [fillinStatus, setFillinStatus] = useState<Record<string, boolean | null>>({
    ...defaults.fillinStatus,
    ...(storedMeta?.fillinStatus ?? {})
  });
  const [isSubmitted, setIsSubmitted] = useState<boolean>(storedMeta?.isSubmitted ?? storedPayload?.submitted ?? false);
  const [showAnswers, setShowAnswers] = useState<boolean>(
    isSubmitted ? storedPayload?.showAnswers ?? false : false
  );
  const [essayContent, setEssayContent] = useState<string>(storedPayload?.essay?.content ?? '');
  const [examineeName, setExamineeName] = useState<string>(storedPayload?.essay?.name ?? '');

  useEffect(() => {
    const payload: StoredPayload = {
      mcq: mcqResponses,
      fillins: fillinResponses,
      essay: { content: essayContent, name: examineeName },
      showAnswers,
      submitted: isSubmitted
    };
    localStorage.setItem(STORAGE_ANSWERS_KEY, JSON.stringify(payload));
  }, [mcqResponses, fillinResponses, essayContent, examineeName, showAnswers, isSubmitted]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_META_KEY,
      JSON.stringify({ fillinStatus, isSubmitted })
    );
  }, [fillinStatus, isSubmitted]);

  const summary: ObjectiveSummary = useMemo(() => {
    const mcqMap = quiz.mcq.reduce<Record<string, number | null>>((acc, q) => {
      acc[q.id] = mcqResponses[q.id] ?? null;
      return acc;
    }, {});
    const fillMap = quiz.fillins.reduce<Record<string, string>>((acc, q) => {
      acc[q.id] = fillinResponses[q.id] ?? '';
      return acc;
    }, {});
    return summarizeObjective(
      quiz,
      answers,
      mcqMap,
      fillMap
    );
  }, [quiz, answers, mcqResponses, fillinResponses]);

  useEffect(() => {
    if (isSubmitted) {
      localStorage.setItem(STORAGE_SCORE_KEY, String(summary.totalScore));
    } else {
      localStorage.removeItem(STORAGE_SCORE_KEY);
    }
  }, [summary.totalScore, isSubmitted]);

  const handleSelectMcq = (id: string, choice: number) => {
    setMcqResponses((prev) => ({ ...prev, [id]: choice }));
  };

  const updateFillinStatus = (question: FillinQuestion, value: string) => {
    const rule = answers.fillins[question.id];
    if (!rule) {
      setFillinStatus((prev) => ({ ...prev, [question.id]: null }));
      return;
    }
    if (!value) {
      setFillinStatus((prev) => ({ ...prev, [question.id]: null }));
      return;
    }
    const result = gradeFillin(value, rule);
    setFillinStatus((prev) => ({ ...prev, [question.id]: result }));
  };

  const handleChangeFillin = (question: FillinQuestion, value: string) => {
    setFillinResponses((prev) => ({ ...prev, [question.id]: value }));
    if (isSubmitted) {
      updateFillinStatus(question, value);
    } else {
      setFillinStatus((prev) => ({ ...prev, [question.id]: null }));
    }
  };

  const handleCheckFillin = (question: FillinQuestion) => {
    if (!isSubmitted) return;
    const value = fillinResponses[question.id] ?? '';
    const rule = answers.fillins[question.id];
    if (!rule) return;
    const status = value ? gradeFillin(value, rule) : false;
    setFillinStatus((prev) => ({ ...prev, [question.id]: status }));
  };

  const handleCheckAllFillins = () => {
    if (!isSubmitted) return;
    const updates: Record<string, boolean | null> = {};
    quiz.fillins.forEach((question) => {
      const value = fillinResponses[question.id] ?? '';
      const rule = answers.fillins[question.id];
      updates[question.id] = value && rule ? gradeFillin(value, rule) : false;
    });
    setFillinStatus((prev) => ({ ...prev, ...updates }));
  };

  const handleToggleAnswers = () => {
    if (!isSubmitted) return;
    setShowAnswers((prev) => !prev);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_ANSWERS_KEY);
    localStorage.removeItem(STORAGE_SCORE_KEY);
    localStorage.removeItem(STORAGE_META_KEY);
    const defaultsState = buildDefaultState(quiz);
    setMcqResponses(defaultsState.mcq);
    setFillinResponses(defaultsState.fillins);
    setFillinStatus(defaultsState.fillinStatus);
    setShowAnswers(false);
    setEssayContent('');
    setExamineeName('');
    setIsSubmitted(false);
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    const updates: Record<string, boolean | null> = {};
    quiz.fillins.forEach((question) => {
      const value = fillinResponses[question.id] ?? '';
      const rule = answers.fillins[question.id];
      updates[question.id] = value && rule ? gradeFillin(value, rule) : false;
    });
    setFillinStatus((prev) => ({ ...prev, ...updates }));
    setIsSubmitted(true);
    setShowAnswers(true);
  };

  const timestamp = dayjs().tz().format('YYYY-MM-DDTHH:mm:ssZ');
  const mailTemplate = essayMailTemplate(examineeName, summary, essayContent, timestamp);
  const mailtoHref = `mailto:lzraylzray@outlook.com?subject=${mailTemplate.subject}&body=${mailTemplate.body}`;

  const handleExportEssay = () => {
    const filename = `lunisolar-essay-${examineeName || '未署名'}-${dayjs().tz().format('YYYYMMDD-HHmmss')}.txt`;
    const blob = new Blob([
      `农历测试卷客观题得分：${summary.totalScore} / ${summary.totalPossible}`,
      '\n',
      mailTemplate.rawBody
    ], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <Header
        totalScore={summary.totalScore}
        totalPossible={summary.totalPossible}
        showAnswers={showAnswers}
        onToggleAnswers={handleToggleAnswers}
        canViewAnswers={isSubmitted}
        title={quiz.meta.title}
        note={quiz.meta.note}
        standard={quiz.meta.standard}
        timezone={quiz.meta.timezone}
        isSubmitted={isSubmitted}
      />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-10">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">一、选择题</h2>
          <p className="text-sm text-slate-600">提交后可查看解析与参考答案。</p>
          <div className="space-y-4">
            {quiz.mcq.map((question) => (
              <Mcq
                key={question.id}
                question={question}
                selected={mcqResponses[question.id] ?? null}
                onSelect={(choice) => handleSelectMcq(question.id, choice)}
                answerIndex={answers.mcq[question.id]}
                showAnswers={isSubmitted && showAnswers}
                isSubmitted={isSubmitted}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-semibold text-slate-900">二、填空题</h2>
            {isSubmitted && (
              <button
                type="button"
                onClick={handleCheckAllFillins}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary"
              >
                全部检查
              </button>
            )}
          </div>
          <p className="text-sm text-slate-600">支持中文日期、全角数字、UTC+8 时间格式。提交后可查看答案提示。</p>
          <div className="space-y-4">
            {quiz.fillins.map((question) => (
              <FillIn
                key={question.id}
                question={question}
                value={fillinResponses[question.id] ?? ''}
                onChange={(value) => handleChangeFillin(question, value)}
                onCheck={() => handleCheckFillin(question)}
                isCorrect={isSubmitted ? fillinStatus[question.id] ?? null : null}
                showAnswers={isSubmitted && showAnswers}
                answerDetail={isSubmitted && showAnswers ? describeFillinRule(answers.fillins[question.id]) : undefined}
                canCheck={isSubmitted}
                explain={question.explain}
              />
            ))}
          </div>
        </section>

        <Essay
          question={quiz.essay}
          examineeName={examineeName}
          content={essayContent}
          onNameChange={setExamineeName}
          onContentChange={setEssayContent}
          mailtoHref={mailtoHref}
          onExport={handleExportEssay}
        />

        <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">提交与重置</h2>
          <p className="text-sm text-slate-600">
            完成客观题后请点击“提交试卷”。提交后将开启参考答案与解析查看功能。
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitted}
              className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary ${
                isSubmitted ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {isSubmitted ? '已提交' : '提交试卷'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-lg border border-rose-400 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-400"
            >
              重置作答
            </button>
          </div>
          {isSubmitted ? (
            <p className="text-sm text-emerald-600">已提交，可在顶部开关中查看参考答案与解析。</p>
          ) : (
            <p className="text-sm text-slate-600">未提交前不会显示答案或解析，也无法检查填空题。</p>
          )}
        </section>

        {isSubmitted && <ScoreCard summary={summary} onReset={handleReset} />}

        {quiz.appendix && (
          <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-5 space-y-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">附：所需数据</h2>
              <p className="text-sm text-slate-600">题目引用的计算数据，便于在答题时查阅。</p>
            </div>
            <pre className="whitespace-pre-wrap break-words rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{appendixText}</pre>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
