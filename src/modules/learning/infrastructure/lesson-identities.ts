import n5 from '@/content/n5.json';
export const lessonIdentities = [
  { id: 'preparation', legacyStorageKey: '准备篇:prelude' },
  ...n5.lessons.map((lesson) => ({ id: lesson.id })),
];
