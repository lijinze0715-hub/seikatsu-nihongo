import data from '@/content/n5.json';
import type { N5Course } from '../domain/n5-course';

export const n5JsonRepository = {
  load: (): N5Course => data as N5Course,
};
