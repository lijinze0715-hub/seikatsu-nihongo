export type ContentBlock = { kind: 'text' | 'subheading'; text: string };
export type N5Section = { id: string; title: string; blocks: ContentBlock[] };
export type N5Lesson = {
  id: string;
  slug: string;
  number: number;
  title: string;
  introduction: ContentBlock[];
  sections: N5Section[];
};
export type N5Course = {
  id: 'n5';
  title: string;
  edition: string;
  introduction: string[];
  references: { label: string; url: string }[];
  lessons: N5Lesson[];
};

export function validateN5Course(course: N5Course): N5Course {
  if (course.id !== 'n5' || course.lessons.length !== 20) throw new Error('N5 must contain lessons 1–20');
  for (const [index, lesson] of course.lessons.entries()) {
    if (lesson.id !== `n5-${index + 1}` || lesson.number !== index + 1 || lesson.slug !== `lesson-${index + 1}`) {
      throw new Error(`Invalid N5 lesson identity at ${index + 1}`);
    }
    if (!lesson.title || !lesson.introduction.length || lesson.sections.length !== 12) throw new Error(`Incomplete ${lesson.id}`);
    for (const [sectionIndex, section] of lesson.sections.entries()) {
      const expected = sectionIndex < 8 ? `section-${sectionIndex + 1}` : sectionIndex < 10 ? `appendix-${sectionIndex - 7}` : `test-${sectionIndex - 9}`;
      if (section.id !== expected) throw new Error(`Invalid section in ${lesson.id}`);
      if (!section.title || !section.blocks.length || section.blocks.some((block) => !block.text.trim())) throw new Error(`Empty section in ${lesson.id}`);
    }
  }
  return course;
}
