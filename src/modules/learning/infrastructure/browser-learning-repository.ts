import type {
  LearningRepository,
  ReadResult,
} from '../domain/learning-repository';

type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
const progressStorageKey = 'life-japanese-progress-v3';

/** Lazy acquisition keeps SSR and blocked browser storage safe. */
export function createBrowserLearningRepository(
  getStorage: () => KeyValueStorage,
): LearningRepository {
  let writable = false;
  return {
    readProgress(): ReadResult {
      writable = false;
      try {
        const storage = getStorage();
        const raw =
          storage.getItem(progressStorageKey) ??
          storage.getItem('life-japanese-progress-v2');
        const value: unknown = raw === null ? [] : JSON.parse(raw);
        if (!Array.isArray(value)) return { value: undefined, writable: false };
        writable = true;
        return { value, writable: true };
      } catch {
        return { value: undefined, writable: false };
      }
    },
    saveProgress(value) {
      if (writable)
        getStorage().setItem(progressStorageKey, JSON.stringify(value));
    },
  };
}
