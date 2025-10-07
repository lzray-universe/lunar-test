import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
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

const McqQuestionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  options: z.array(z.string()),
  explain: z.string().optional(),
  score: z.number().optional()
});

const FillinQuestionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  type: z.enum(['text', 'number', 'date', 'regex']),
  formatHint: z.string().optional(),
  explain: z.string().optional(),
  score: z.number().optional()
});

const EssaySchema = z.object({
  id: z.string(),
  title: z.string(),
  promptHtml: z.string()
});

const QuizSchema = z.object({
  meta: z.object({
    title: z.string(),
    note: z.string().optional()
  }),
  mcq: z.array(McqQuestionSchema),
  fillins: z.array(FillinQuestionSchema),
  essay: EssaySchema
});

const FillinRuleSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('text'),
    answer: z.string().optional(),
    accept: z.array(z.string()).optional(),
    caseInsensitive: z.boolean().optional(),
    normalizeZh: z.boolean().optional()
  }),
  z.object({
    mode: z.literal('regex'),
    pattern: z.string()
  }),
  z.object({
    mode: z.literal('number'),
    answer: z.number(),
    tolerance: z.number().optional()
  }),
  z.object({
    mode: z.literal('date'),
    answer: z.string().optional(),
    accept: z.array(z.string()).optional()
  })
]);

const AnswerSchema = z.object({
  mcq: z.record(z.string(), z.number()),
  fillins: z.record(z.string(), FillinRuleSchema)
});

type StoredPayload = {
  mcq: Record<string, number | null>;
  fillins: Record<string, string>;
  essay?: { content: string; name: string };
  showAnswers?: boolean;
};

type MetaState = {
  fillinStatus: Record<string, boolean | null>;
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
  const [quiz, setQuiz] = useState<QuizData>(quizSample as QuizData);
  const [answers, setAnswers] = useState<AnswerData>(answersSample as AnswerData);
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
  const [showAnswers, setShowAnswers] = useState<boolean>(storedPayload?.showAnswers ?? false);
  const [essayContent, setEssayContent] = useState<string>(storedPayload?.essay?.content ?? '');
  const [examineeName, setExamineeName] = useState<string>(storedPayload?.essay?.name ?? '');
  const [quizJsonInput, setQuizJsonInput] = useState('');
  const [answerJsonInput, setAnswerJsonInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const payload: StoredPayload = {
      mcq: mcqResponses,
      fillins: fillinResponses,
      essay: { content: essayContent, name: examineeName },
      showAnswers
    };
    localStorage.setItem(STORAGE_ANSWERS_KEY, JSON.stringify(payload));
  }, [mcqResponses, fillinResponses, essayContent, examineeName, showAnswers]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_META_KEY,
      JSON.stringify({ fillinStatus })
    );
  }, [fillinStatus]);

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
    localStorage.setItem(STORAGE_SCORE_KEY, String(summary.totalScore));
  }, [summary.totalScore]);

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
    updateFillinStatus(question, value);
  };

  const handleCheckFillin = (question: FillinQuestion) => {
    const value = fillinResponses[question.id] ?? '';
    const rule = answers.fillins[question.id];
    if (!rule) return;
    const status = value ? gradeFillin(value, rule) : false;
    setFillinStatus((prev) => ({ ...prev, [question.id]: status }));
  };

  const handleCheckAllFillins = () => {
    const updates: Record<string, boolean | null> = {};
    quiz.fillins.forEach((question) => {
      const value = fillinResponses[question.id] ?? '';
      const rule = answers.fillins[question.id];
      updates[question.id] = value && rule ? gradeFillin(value, rule) : false;
    });
    setFillinStatus((prev) => ({ ...prev, ...updates }));
  };

  const handleToggleAnswers = () => {
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
  };

  const parseImport = () => {
    try {
      setImportError(null);
      let nextQuiz: QuizData | null = null;
      let nextAnswers: AnswerData | null = null;

      if (quizJsonInput.trim()) {
        const parsed = JSON.parse(quizJsonInput);
        if (parsed.quiz && parsed.answers && !answerJsonInput.trim()) {
          const quizParsed = QuizSchema.parse(parsed.quiz);
          const answerParsed = AnswerSchema.parse(parsed.answers);
          nextQuiz = quizParsed as QuizData;
          nextAnswers = answerParsed as AnswerData;
        } else {
          const quizParsed = QuizSchema.parse(parsed);
          nextQuiz = quizParsed as QuizData;
        }
      }

      if (answerJsonInput.trim()) {
        const parsedAnswers = JSON.parse(answerJsonInput);
        const answerParsed = AnswerSchema.parse(parsedAnswers);
        nextAnswers = answerParsed as AnswerData;
      }

      if (!nextQuiz && !nextAnswers) {
        throw new Error('请至少提供题库或答案 JSON');
      }

      setQuiz((prev) => nextQuiz ?? prev);
      setAnswers((prev) => nextAnswers ?? prev);

      const targetQuiz = nextQuiz ?? quiz;
      const targetAnswers = nextAnswers ?? answers;
      const defaultsState = buildDefaultState(targetQuiz);
      setMcqResponses(defaultsState.mcq);
      setFillinResponses(defaultsState.fillins);
      setFillinStatus(defaultsState.fillinStatus);
      setShowAnswers(false);
      setEssayContent('');
      setExamineeName('');
      localStorage.removeItem(STORAGE_ANSWERS_KEY);
      localStorage.removeItem(STORAGE_SCORE_KEY);
      localStorage.removeItem(STORAGE_META_KEY);
    } catch (error) {
      console.error(error);
      if (error instanceof z.ZodError) {
        setImportError(error.errors.map((item) => item.message).join('\n'));
      } else if (error instanceof Error) {
        setImportError(error.message);
      } else {
        setImportError('导入失败，请检查 JSON 格式。');
      }
    }
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
      />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-10">
        <section className="rounded-2xl border border-dashed border-primary/40 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">粘贴 JSON 导入</h2>
          <p className="text-sm text-slate-600">可粘贴完整对象（包含 quiz 与 answers），或分别粘贴后点击解析。</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              题库 JSON
              <textarea
                value={quizJsonInput}
                onChange={(event) => setQuizJsonInput(event.target.value)}
                rows={8}
                placeholder="粘贴 quiz.sample.json 内容或包含 quiz 的对象"
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              标准答案 JSON
              <textarea
                value={answerJsonInput}
                onChange={(event) => setAnswerJsonInput(event.target.value)}
                rows={8}
                placeholder="粘贴 answers.sample.json 内容（可留空，若题库对象已包含 answers）"
                className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </label>
          </div>
          {importError && (
            <p className="text-sm text-rose-600 whitespace-pre-wrap">{importError}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={parseImport}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary"
            >
              解析并载入
            </button>
            <button
              type="button"
              onClick={() => {
                setQuizJsonInput(JSON.stringify(quizSample, null, 2));
                setAnswerJsonInput(JSON.stringify(answersSample, null, 2));
              }}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-300"
            >
              填入示例数据
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">一、选择题</h2>
          <p className="text-sm text-slate-600">作答后立即判分，开启“显示参考答案”查看解析。</p>
          <div className="space-y-4">
            {quiz.mcq.map((question) => (
              <Mcq
                key={question.id}
                question={question}
                selected={mcqResponses[question.id] ?? null}
                onSelect={(choice) => handleSelectMcq(question.id, choice)}
                answerIndex={answers.mcq[question.id]}
                showAnswers={showAnswers}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-semibold text-slate-900">二、填空题</h2>
            <button
              type="button"
              onClick={handleCheckAllFillins}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary"
            >
              全部检查
            </button>
          </div>
          <p className="text-sm text-slate-600">支持中文日期、全角数字、UTC+8 时间格式。空框聚焦时可查看键盘提示。</p>
          <div className="space-y-4">
            {quiz.fillins.map((question) => (
              <FillIn
                key={question.id}
                question={question}
                value={fillinResponses[question.id] ?? ''}
                onChange={(value) => handleChangeFillin(question, value)}
                onCheck={() => handleCheckFillin(question)}
                isCorrect={fillinStatus[question.id] ?? null}
                showAnswers={showAnswers}
                answerDetail={showAnswers ? describeFillinRule(answers.fillins[question.id]) : undefined}
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

        <ScoreCard summary={summary} onReset={handleReset} />
      </main>
    </div>
  );
};

export default App;
