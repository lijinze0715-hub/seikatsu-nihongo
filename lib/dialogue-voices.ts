import type { TtsVoiceSelection } from './japanese-speech.ts';
import type { TtsEngine } from './tts-config.ts';

export const DIALOGUE_VOICES_KEY = 'seikatsu-nihongo:dialogue-voices-v1';
type Snapshot = { choices: Record<string, TtsVoiceSelection>; message: string };
const initial: Snapshot = { choices: {}, message: '' };
let snapshot = initial;
let loaded = false;
const listeners = new Set<() => void>();

export function isSelfDialogueRole(role: string) {
  return /^私(?:\(わたし\)|（わたし）)?(?:\s*→.*)?$/.test(role.trim());
}
export function dialogueRoleKey(lessonId: string, role: string) {
  return isSelfDialogueRole(role) ? 'self' : JSON.stringify([lessonId, role.trim()]);
}
export function getDialogueRoles(roles: string[]) {
  return [...new Set(roles.map(role => isSelfDialogueRole(role) ? '私' : role.trim()).filter(Boolean))]
    .sort((a, b) => Number(isSelfDialogueRole(b)) - Number(isSelfDialogueRole(a)));
}
function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(DIALOGUE_VOICES_KEY) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const choices: Record<string, TtsVoiceSelection> = {};
    for (const [key, choice] of Object.entries(value)) {
      if (!choice || typeof choice !== 'object' || Array.isArray(choice)) continue;
      const item = choice as TtsVoiceSelection;
      choices[key] = {
        ...(typeof item.voiceURI === 'string' && item.voiceURI ? { voiceURI: item.voiceURI } : {}),
        ...(Number.isSafeInteger(item.styleId) && (item.styleId as number) >= 0 ? { styleId: item.styleId } : {}),
      };
    }
    snapshot = { choices, message: '' };
  } catch {
    snapshot = { choices: {}, message: '无法读取对话声优配置，本次可以继续选择；配置可能无法在刷新后恢复。' };
  }
}
export function getDialogueVoice(lessonId: string, role: string): TtsVoiceSelection {
  load();
  return snapshot.choices[dialogueRoleKey(lessonId, role)] ?? {};
}
export function setDialogueVoice(lessonId: string, role: string, engine: TtsEngine, value: string) {
  load();
  const key = dialogueRoleKey(lessonId, role);
  const choice = { ...snapshot.choices[key] };
  if (engine === 'browser') {
    if (value) choice.voiceURI = value; else delete choice.voiceURI;
  } else {
    if (value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))) choice.styleId = Number(value);
    else delete choice.styleId;
  }
  const choices = { ...snapshot.choices, [key]: choice };
  let message = '';
  try { window.localStorage.setItem(DIALOGUE_VOICES_KEY, JSON.stringify(choices)); }
  catch { message = '无法保存对话声优选择，刷新后可能需要重新配置。'; }
  snapshot = { choices, message };
  listeners.forEach(listener => listener());
}
export function getDialogueVoiceSnapshot() { return snapshot; }
export function getServerDialogueVoiceSnapshot() { return initial; }
export function subscribeToDialogueVoices(listener: () => void) {
  listeners.add(listener);
  load();
  listener();
  return () => { listeners.delete(listener); };
}
