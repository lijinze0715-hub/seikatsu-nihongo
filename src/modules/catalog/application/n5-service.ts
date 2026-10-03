import { validateN5Course } from '../domain/n5-course';
import type { N5Course } from '../domain/n5-course';

export function createN5Service(repository: { load(): N5Course }) {
  const course = validateN5Course(repository.load());
  return {
    course,
    getLesson: (slug: string) => course.lessons.find((lesson) => lesson.slug === slug),
  };
}
