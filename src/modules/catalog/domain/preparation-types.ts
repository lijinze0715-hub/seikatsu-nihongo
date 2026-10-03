export type KanaCell = {
  text: string;
  hint: string;
  speech: string;
  beats?: string[];
};
export type KanaUnit = {
  id: string;
  title: string;
  intro: string;
  notes: string[];
  columns: number;
  rows: KanaCell[][];
};
export type Preparation = {
  id: string;
  legacyStorageKey: string;
  title: string;
  subtitle: string;
  units: KanaUnit[];
};
