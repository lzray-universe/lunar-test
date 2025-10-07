import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { AnswerData, FillinRule, ObjectiveSummary, QuizData } from './types';
import { equalsText, normalizeNumberInput, parseDateString } from './normalize';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Shanghai');

export const gradeMcq = (userChoiceIdx: number | null | undefined, answerIdx: number): boolean => {
  if (userChoiceIdx === null || userChoiceIdx === undefined) return false;
  return Number(userChoiceIdx) === Number(answerIdx);
};

export const gradeFillin = (userInput: string | number | null | undefined, rule: FillinRule): boolean => {
  if (userInput === null || userInput === undefined || userInput === '') return false;
  const value = typeof userInput === 'number' ? String(userInput) : userInput;
  switch (rule.mode) {
    case 'text': {
      if (rule.accept && rule.accept.length > 0) {
        return rule.accept.some((candidate) =>
          equalsText(value, candidate, {
            caseInsensitive: rule.caseInsensitive ?? true,
            normalizeZh: rule.normalizeZh ?? false
          })
        );
      }
      if (rule.answer) {
        return equalsText(value, rule.answer, {
          caseInsensitive: rule.caseInsensitive ?? true,
          normalizeZh: rule.normalizeZh ?? false
        });
      }
      return false;
    }
    case 'regex': {
      try {
        const regex = new RegExp(rule.pattern);
        return regex.test(value);
      } catch (error) {
        console.warn('Invalid regex pattern in rule', rule.pattern, error);
        return false;
      }
    }
    case 'number': {
      const userNumber = typeof userInput === 'number' ? userInput : normalizeNumberInput(value);
      if (userNumber === null) return false;
      const tolerance = rule.tolerance ?? 0;
      return Math.abs(userNumber - rule.answer) <= tolerance + Number.EPSILON;
    }
    case 'date': {
      const accepted = [rule.answer, ...(rule.accept ?? [])].filter(Boolean) as string[];
      const normalizedUser = parseDateString(value);
      if (!normalizedUser) return false;
      if (accepted.length === 0) {
        return false;
      }
      return accepted.some((candidate) => {
        const normalizedCandidate = parseDateString(candidate);
        return normalizedCandidate === normalizedUser;
      });
    }
    default:
      return false;
  }
};

const getScore = (question: { score?: number }): number => question.score ?? 1;

export const summarizeObjective = (
  quiz: QuizData,
  answers: AnswerData,
  userMcq: Record<string, number | null | undefined>,
  userFillins: Record<string, string | number | null | undefined>
): ObjectiveSummary => {
  const mcqResult = quiz.mcq.reduce(
    (acc, item) => {
      const correct = gradeMcq(userMcq[item.id], answers.mcq[item.id]);
      const score = getScore(item);
      acc.total += score;
      if (correct) {
        acc.score += score;
        acc.correctIds.push(item.id);
      } else if (userMcq[item.id] !== null && userMcq[item.id] !== undefined) {
        acc.incorrectIds.push(item.id);
      }
      return acc;
    },
    { correctIds: [] as string[], incorrectIds: [] as string[], score: 0, total: 0 }
  );

  const fillinResult = quiz.fillins.reduce(
    (acc, item) => {
      const rule = answers.fillins[item.id];
      const user = userFillins[item.id];
      const correct = rule ? gradeFillin(user ?? '', rule) : false;
      const score = getScore(item);
      acc.total += score;
      if (correct) {
        acc.score += score;
        acc.correctIds.push(item.id);
      } else if (user !== null && user !== undefined && user !== '') {
        acc.incorrectIds.push(item.id);
      }
      return acc;
    },
    { correctIds: [] as string[], incorrectIds: [] as string[], score: 0, total: 0 }
  );

  return {
    mcq: mcqResult,
    fillins: fillinResult,
    totalScore: mcqResult.score + fillinResult.score,
    totalPossible: mcqResult.total + fillinResult.total
  };
};

export const computeObjectiveScore = (
  quiz: QuizData,
  answers: AnswerData,
  userMcq: Record<string, number | null | undefined>,
  userFillins: Record<string, string | number | null | undefined>
): number => {
  const summary = summarizeObjective(quiz, answers, userMcq, userFillins);
  return summary.totalScore;
};

export const getQuestionScoreMap = (quiz: QuizData) => {
  const mcqScores = Object.fromEntries(quiz.mcq.map((q) => [q.id, getScore(q)]));
  const fillinScores = Object.fromEntries(quiz.fillins.map((q) => [q.id, getScore(q)]));
  return { mcqScores, fillinScores };
};

export const essayMailTemplate = (
  name: string,
  summary: ObjectiveSummary,
  essayContent: string,
  timestamp: string
) => {
  const subject = `农历测试卷-综合题-${name || '未署名'}-${timestamp.split('T')[0]}`;
  const bodyLines = [
    `姓名：${name || '未署名'}`,
    `时间：${timestamp}`,
    `客观题总分：${summary.totalScore} / ${summary.totalPossible}`,
    `选择题：得分 ${summary.mcq.score} / ${summary.mcq.total}，错题：${summary.mcq.incorrectIds.join(', ') || '无'}`,
    `填空题：得分 ${summary.fillins.score} / ${summary.fillins.total}，错题：${summary.fillins.incorrectIds.join(', ') || '无'}`,
    '',
    '综合题作答：',
    essayContent || '(未填写)'
  ];
  const body = encodeURIComponent(bodyLines.join('\n'));
  return {
    subject: encodeURIComponent(subject),
    body,
    rawBody: bodyLines.join('\n')
  };
};

if (import.meta.env.DEV) {
  const assert = (condition: boolean, message: string) => {
    if (!condition) {
      console.error(`判分逻辑自检失败：${message}`);
    }
  };

  assert(gradeMcq(1, 1) === true, '单选题应判定正确');
  assert(gradeMcq(0, 1) === false, '单选题应判定错误');
  assert(
    gradeFillin('29.531', { mode: 'number', answer: 29.531, tolerance: 0.002 }) === true,
    '数值填空应接受误差'
  );
  assert(
    gradeFillin('2034年2月19日', { mode: 'date', answer: '2034-02-19' }) === true,
    '日期填空应兼容中文格式'
  );
  assert(
    gradeFillin('农历正月初一', { mode: 'text', answer: '农历正月初一', caseInsensitive: true }) === true,
    '文本填空标准化'
  );
}
