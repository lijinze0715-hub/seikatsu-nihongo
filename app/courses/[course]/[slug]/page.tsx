import { notFound } from 'next/navigation';
import { getN5Lesson, n5Course } from '@/src/bootstrap/catalog';
import { N5LessonPage } from '@/app/n5-lesson';

export const generateStaticParams = () => n5Course.lessons.map(lesson => ({ course: 'n5', slug: lesson.slug }));
type Params = { params: Promise<{ course: string; slug: string }> };
export async function generateMetadata({ params }: Params) {
  const { course, slug } = await params;
  const lesson = course === 'n5' ? getN5Lesson(slug) : undefined;
  return lesson ? { title: `第${lesson.number}课 ${lesson.title}｜N5 生活日语`, description: lesson.introduction[0]?.text } : {};
}
export default async function Page({ params }: Params) {
  const { course, slug } = await params;
  const lesson = course === 'n5' ? getN5Lesson(slug) : undefined;
  if (!lesson) notFound();
  return <N5LessonPage lesson={lesson} lessons={n5Course.lessons.map(({id,slug,number,title})=>({id,slug,number,title}))}/>;
}
