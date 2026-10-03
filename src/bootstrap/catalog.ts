import preparationData from '@/content/preparation.json';
import type { Preparation } from '../modules/catalog/domain/preparation-types';
import { createN5Service } from '../modules/catalog/application/n5-service';
import { n5JsonRepository } from '../modules/catalog/infrastructure/n5-json-repository';

export const preparation = preparationData as Preparation;
export const { course: n5Course, getLesson: getN5Lesson } = createN5Service(n5JsonRepository);
