export type LessonIdentity = { id: string; legacyStorageKey?: string };
export type ReadResult = { value: unknown; writable: boolean };
export interface LearningRepository {
  readProgress(): ReadResult;
  saveProgress(value: string[]): void;
}
