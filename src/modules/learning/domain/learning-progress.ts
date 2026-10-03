import type { LessonIdentity } from './learning-repository';
export const stageKeys = [
  'supported',
  'independent',
  'review-independent',
  'overview',
  'dialogue',
  'vocab',
  'grammar',
  'templates',
  'kana-hiragana',
  'kana-katakana',
  'kana-voiced',
  'kana-contracted',
  'kana-extended',
  'kana-long',
  'kana-stop',
  'kana-nasal',
  'shadow',
  'speaking',
  'writing',
  'section-1',
  'section-2',
  'section-3',
  'section-4',
  'section-5',
  'section-6',
];
export function normalizeProgress(
  value: unknown,
  lessons: LessonIdentity[],
): string[] {
  if (!Array.isArray(value)) return [];
  const result = new Set<string>();
  for (const key of value) {
    if (typeof key !== 'string') continue;
    const lesson = lessons.find(
      (item) =>
        key.startsWith(item.id + ':') ||
        (item.legacyStorageKey && key.startsWith(item.legacyStorageKey + ':')),
    );
    if (!lesson) continue;
    const stage = key.slice(key.lastIndexOf(':') + 1);
    const exact =
      key === lesson.id + ':' + stage ||
      (lesson.legacyStorageKey &&
        key === lesson.legacyStorageKey + ':' + stage);
    const validScope =
      !stage.startsWith('kana-') || lesson.id === 'preparation';
    if (exact && validScope && stageKeys.includes(stage))
      result.add(lesson.id + ':' + stage);
  }
  return [...result];
}
