import { createLearningService } from '../modules/learning/application/learning-service';
import { createBrowserLearningRepository } from '../modules/learning/infrastructure/browser-learning-repository';
import { lessonIdentities } from '../modules/learning/infrastructure/lesson-identities';

export function createBrowserLearningService() {
  return createLearningService(
    createBrowserLearningRepository(() => window.localStorage),
    lessonIdentities,
  );
}
