export const VOICE_STORAGE_KEY = 'seikatsu-nihongo:japanese-voice-uri';
export const ENGINE_STORAGE_KEY = 'seikatsu-nihongo:tts-engine';
export const STYLE_STORAGE_KEY = 'seikatsu-nihongo:voicevox-style-id';
export type TtsEngine = 'browser' | 'voicevox';

export function readTtsConfig() {
  const defaults = { engine: 'browser' as TtsEngine, voiceURI: '', styleId: null as number | null, message: '' };
  if (typeof window === 'undefined') return defaults;
  try {
    const engine = window.localStorage.getItem(ENGINE_STORAGE_KEY);
    const style = window.localStorage.getItem(STYLE_STORAGE_KEY);
    const styleId = style !== null && /^\d+$/.test(style) && Number.isSafeInteger(Number(style)) ? Number(style) : null;
    return { engine: engine === 'voicevox' ? 'voicevox' as const : 'browser' as const,
      voiceURI: window.localStorage.getItem(VOICE_STORAGE_KEY) ?? '', styleId, message: '' };
  } catch {
    return { ...defaults, message: '浏览器禁止访问本地存储，TTS 选择仅在本次打开期间有效。' };
  }
}

export function saveTtsSetting(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    return '';
  } catch {
    return '无法保存 TTS 选择，刷新页面后可能需要重新选择。';
  }
}
