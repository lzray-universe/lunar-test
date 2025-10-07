export interface QuizMeta {
  title: string;
  note?: string;
  standard?: string;
  timezone?: string;
}

export interface McqQuestion {
  id: string;
  stem: string;
  options: string[];
  explain?: string;
  score?: number;
}

export type FillinInputType = 'text' | 'number' | 'date' | 'regex';

export interface FillinQuestion {
  id: string;
  stem: string;
  type: FillinInputType;
  formatHint?: string;
  explain?: string;
  score?: number;
}

export interface EssayQuestion {
  id: string;
  title: string;
  promptHtml: string;
}

export interface QuizData {
  meta: QuizMeta;
  mcq: McqQuestion[];
  fillins: FillinQuestion[];
  essay: EssayQuestion;
  appendix?: string;
}

export type McqAnswerMap = Record<string, number>;

export type TextRule = {
  mode: 'text';
  answer?: string;
  accept?: string[];
  caseInsensitive?: boolean;
  normalizeZh?: boolean;
};

export type RegexRule = {
  mode: 'regex';
  pattern: string;
};

export type NumberRule = {
  mode: 'number';
  answer: number;
  tolerance?: number;
};

export type DateRule = {
  mode: 'date';
  answer?: string;
  accept?: string[];
};

export type FillinRule = TextRule | RegexRule | NumberRule | DateRule;

export interface FillinAnswerMap {
  [id: string]: FillinRule;
}

export interface AnswerData {
  mcq: McqAnswerMap;
  fillins: FillinAnswerMap;
}

export interface ObjectiveSummary {
  mcq: {
    correctIds: string[];
    incorrectIds: string[];
    score: number;
    total: number;
  };
  fillins: {
    correctIds: string[];
    incorrectIds: string[];
    score: number;
    total: number;
  };
  totalScore: number;
  totalPossible: number;
}

export interface StoredState {
  answers: Record<string, string | number | null>;
  mcqChoices: Record<string, number | null>;
  fillinStatus: Record<string, boolean>;
  showExplanations: boolean;
  essayContent: string;
  examineeName: string;
}
