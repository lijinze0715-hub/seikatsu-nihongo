import { notFound, redirect } from 'next/navigation';
import { preparation, getN5Lesson, n5Course } from '@/src/bootstrap/catalog';
import { PreparationWorkspace } from '@/app/preparation-workspace';
import { N5LessonPage } from '@/app/n5-lesson';

export const generateStaticParams = () => [
  { slug: 'prelude' },
  ...n5Course.lessons.map(lesson => ({ slug: String(lesson.number) })),
];

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === 'prelude') return <PreparationWorkspace data={preparation}/>;
  const number = Number(slug);
  if (Number.isInteger(number) && number >= 1 && number <= 20) {
    if (process.env.GITHUB_PAGES_BUILD === 'true') {
      const lesson = getN5Lesson(`lesson-${number}`);
      if (!lesson) notFound();
      return <N5LessonPage lesson={lesson} lessons={n5Course.lessons.map(({ id, slug, number, title }) => ({ id, slug, number, title }))} />;
    }
    redirect(`/courses/n5/lesson-${number}`);
  }
  notFound();
}
