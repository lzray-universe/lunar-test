const FULLWIDTH_OFFSET = '０'.charCodeAt(0) - '0'.charCodeAt(0);

const fullWidthMap: Record<string, string> = {
  '，': ',',
  '。': '.',
  '；': ';',
  '：': ':',
  '！': '!',
  '？': '?',
  '（': '(',
  '）': ')',
  '【': '[',
  '】': ']',
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '、': ',',
  '　': ' '
};

const zhSynonyms: Record<string, string> = {
  '北京时间': 'utc+8',
  'utc+8': 'utc+8',
  '东八区': 'utc+8'
};

type NormalizeOptions = {
  lowercase?: boolean;
};

const toHalfWidth = (input: string): string => {
  return input
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 0xff10 && code <= 0xff19) {
        return String.fromCharCode(code - FULLWIDTH_OFFSET);
      }
      if (code >= 0xff21 && code <= 0xff3a) {
        return String.fromCharCode(code - 0xfee0);
      }
      if (code >= 0xff41 && code <= 0xff5a) {
        return String.fromCharCode(code - 0xfee0);
      }
      return fullWidthMap[char] ?? char;
    })
    .join('');
};

export const normalizeWhitespace = (input: string): string =>
  input.trim().replace(/\s+/g, ' ');

export const normalizeText = (value: string, options: NormalizeOptions = {}): string => {
  const halfWidth = toHalfWidth(value);
  const collapsed = normalizeWhitespace(halfWidth);
  const lower = options.lowercase !== false ? collapsed.toLowerCase() : collapsed;
  const unified = lower
    .split(' ')
    .map((word) => zhSynonyms[word] ?? word)
    .join(' ');
  return unified;
};

const pad = (value: number): string => value.toString().padStart(2, '0');

export const parseDateString = (input: string): string | null => {
  const normalized = normalizeText(input, { lowercase: false });
  const isoMatch = normalized.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (!isoMatch) {
    return null;
  }
  const [, year, month, day] = isoMatch;
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return null;
  }
  return `${y}-${pad(m)}-${pad(d)}`;
};

export const normalizeNumberInput = (input: string): number | null => {
  const normalized = normalizeText(input);
  if (!normalized) return null;
  const numeric = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

export const equalsText = (
  input: string,
  expected: string,
  options: NormalizeOptions & { caseInsensitive?: boolean; normalizeZh?: boolean } = {}
): boolean => {
  const normalizedInput = normalizeText(input, { lowercase: options.caseInsensitive ?? true });
  let normalizedExpected = expected;
  if (options.normalizeZh) {
    normalizedExpected = zhSynonyms[expected] ?? expected;
  }
  const normalizedTarget = normalizeText(normalizedExpected, {
    lowercase: options.caseInsensitive ?? true
  });
  return normalizedInput === normalizedTarget;
};
