import { normalizeProgress } from '../domain/learning-progress.ts';
import type {
  LearningRepository,
  LessonIdentity,
} from '../domain/learning-repository';

export function createLearningService(
  repository: LearningRepository,
  identities: LessonIdentity[],
) {
  let writable = false;
  return {
    load() {
      const progress = repository.readProgress();
      writable = progress.writable;
      return {
        progress: normalizeProgress(progress.value, identities),
        progressWritable: writable,
        messages: writable
          ? []
          : ['无法读取本机学习进度；已保留原数据，本次进度暂不保存。'],
      };
    },
    saveProgress(value: string[]) {
      if (writable)
        repository.saveProgress(normalizeProgress(value, identities));
    },
  };
}
