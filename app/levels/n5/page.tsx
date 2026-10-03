import { redirect } from 'next/navigation';
import { n5Course } from '@/src/bootstrap/catalog';
import { CourseIndex } from '@/app/course-index';
export default function Page() {
  if (process.env.GITHUB_PAGES_BUILD === 'true') return <CourseIndex course={n5Course} />;
  redirect('/courses/n5');
}
