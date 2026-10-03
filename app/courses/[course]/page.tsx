import { notFound } from 'next/navigation';
import { n5Course } from '@/src/bootstrap/catalog';
import { CourseIndex } from '@/app/course-index';

export const generateStaticParams = () => [{ course: 'n5' }];
export const generateMetadata = () => ({ title: 'N5 生活课程｜日本生活日语', description: 'N5 第 1～20 课，按赴日生活场景学习日语。' });
export default async function Page({ params }: { params: Promise<{ course: string }> }) {
  if ((await params).course !== 'n5') notFound();
  return <CourseIndex course={n5Course} />;
}
