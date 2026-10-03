import { cancelBrowserSpeech, getJapaneseVoices, isSpeechSupported, playBrowserSpeech } from './browser-tts.ts';
import { ENGINE_STORAGE_KEY, readTtsConfig, saveTtsSetting, STYLE_STORAGE_KEY, VOICE_STORAGE_KEY, type TtsEngine } from './tts-config.ts';
import { cancelVoicevoxSpeech, flattenVoicevoxStyles, getVoicevoxSpeakers, isVoicevoxAvailable, speakVoicevox,
  VoicevoxError, voicevoxConnectionMessage, type VoicevoxStyle } from './voicevox-tts.ts';
export { getJapaneseVoices, getVoiceLabel, isSpeechSupported } from './browser-tts.ts';
export { VOICE_STORAGE_KEY, ENGINE_STORAGE_KEY, STYLE_STORAGE_KEY } from './tts-config.ts';
export { isVoicevoxAvailable, getVoicevoxSpeakers, speakVoicevox } from './voicevox-tts.ts';

type VoiceState = {
  engine: TtsEngine;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  status: 'loading' | 'ready' | 'unavailable' | 'unsupported';
  browserMessage: string;
  voicevoxStyles: VoicevoxStyle[];
  selectedStyleId: number | null;
  voicevoxStatus: 'loading' | 'connected' | 'unavailable';
  voicevoxMessage: string;
  message: string;
  storageMessage: string;
};
const initialState: VoiceState = {
  engine: 'browser', voices: [], selectedVoiceURI: '', status: 'loading',
  browserMessage: '正在读取浏览器的日语语音…',
  voicevoxStyles: [], selectedStyleId: null, voicevoxStatus: 'loading', voicevoxMessage: '正在检测 VOICEVOX…',
  message: '', storageMessage: '',
};
let state = initialState;
let preferredVoiceURI = '';
let preferredStyleId: number | null = null;
let configLoaded = false;
const listeners = new Set<() => void>();
let detection: AbortController | null = null;
let playbackToken = 0;
type SpeechCallbacks = { onend?: () => void; onerror?: (message: string) => void; oncancel?: () => void };
export type TtsVoiceSelection = { voiceURI?: string; styleId?: number };
let activeCallbacks: SpeechCallbacks | null = null;

function publish(changes: Partial<VoiceState>) {
  state = { ...state, ...changes };
  listeners.forEach(listener => listener());
}
function loadConfig() {
  if (configLoaded || typeof window === 'undefined') return;
  configLoaded = true;
  const config = readTtsConfig();
  preferredVoiceURI = config.voiceURI;
  preferredStyleId = config.styleId;
  state = { ...state, engine: config.engine, storageMessage: config.message };
}
function save(key: string, value: string) { publish({ storageMessage: saveTtsSetting(key, value) }); }

export function refreshBrowserVoiceList() {
  if (typeof window === 'undefined') return state;
  loadConfig();
  const voices = getJapaneseVoices();
  const selected = voices.find(voice => voice.voiceURI === preferredVoiceURI) ?? voices[0];
  const status = !isSpeechSupported() ? 'unsupported' : selected ? 'ready' : 'unavailable';
  const browserMessage = status === 'unsupported' ? '当前浏览器不支持日语朗读（Web Speech API）。请使用支持语音合成的浏览器。'
    : !selected ? '当前没有可用的日语语音。请检查浏览器或系统的日语语音设置；语音加载完成后会自动更新。' : '';
  publish({ voices, selectedVoiceURI: selected?.voiceURI ?? '', status, browserMessage });
  return state;
}
export function selectJapaneseVoice(voiceURI: string) {
  loadConfig();
  if (!getJapaneseVoices().some(voice => voice.voiceURI === voiceURI)) { refreshBrowserVoiceList(); return; }
  preferredVoiceURI = voiceURI;
  save(VOICE_STORAGE_KEY, voiceURI);
  refreshBrowserVoiceList();
}
export function getSelectedBrowserVoice() {
  const current = refreshBrowserVoiceList();
  return current.voices.find(voice => voice.voiceURI === current.selectedVoiceURI) ?? null;
}
// Keep the existing public names compatible with earlier callers.
export const refreshVoiceList = refreshBrowserVoiceList;
export const getSelectedVoice = getSelectedBrowserVoice;

export async function refreshVoicevoxSpeakerList() {
  if (typeof window === 'undefined') return;
  loadConfig();
  detection?.abort();
  const controller = new AbortController();
  detection = controller;
  publish({ voicevoxStatus: 'loading', voicevoxMessage: '正在检测 VOICEVOX…' });
  try {
    await isVoicevoxAvailable(controller.signal);
    const speakers = await getVoicevoxSpeakers(controller.signal);
    if (detection !== controller) return;
    const styles = flattenVoicevoxStyles(speakers);
    const selected = styles.find(style => style.id === preferredStyleId) ?? styles[0];
    if (selected && selected.id !== preferredStyleId) {
      preferredStyleId = selected.id;
      save(STYLE_STORAGE_KEY, String(selected.id));
    }
    publish({ voicevoxStyles: styles, selectedStyleId: selected?.id ?? null,
      voicevoxStatus: 'connected', voicevoxMessage: selected ? 'VOICEVOX 已连接' : 'VOICEVOX 已连接，但没有可用于朗读的角色 / 风格。' });
  } catch (error) {
    if (detection !== controller || controller.signal.aborted) return;
    publish({ voicevoxStyles: [], selectedStyleId: null, voicevoxStatus: 'unavailable',
      voicevoxMessage: error instanceof Error ? error.message : voicevoxConnectionMessage() });
  } finally {
    if (detection === controller) detection = null;
  }
}
export function getSelectedVoicevoxStyle() {
  loadConfig();
  return state.voicevoxStyles.find(style => style.id === state.selectedStyleId) ?? null;
}
export function selectVoicevoxStyle(styleId: number) {
  if (!state.voicevoxStyles.some(style => style.id === styleId)) return;
  preferredStyleId = styleId;
  save(STYLE_STORAGE_KEY, String(styleId));
  publish({ selectedStyleId: styleId, message: '' });
}
export function selectTtsEngine(engine: TtsEngine) {
  loadConfig();
  if (engine !== 'browser' && engine !== 'voicevox') return;
  if (engine !== state.engine) cancelJapaneseSpeech();
  save(ENGINE_STORAGE_KEY, engine);
  publish({ engine, message: '' });
  if (engine === 'voicevox' && state.voicevoxStatus !== 'connected' && !detection) void refreshVoicevoxSpeakerList();
}
export function getVoiceSnapshot() { return state; }
export function getServerVoiceSnapshot() { return initialState; }
export function subscribeToVoices(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    if (isSpeechSupported()) window.speechSynthesis.addEventListener('voiceschanged', refreshBrowserVoiceList);
    refreshBrowserVoiceList();
    void refreshVoicevoxSpeakerList();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      if (isSpeechSupported()) window.speechSynthesis.removeEventListener('voiceschanged', refreshBrowserVoiceList);
      detection?.abort();
      detection = null;
    }
  };
}
export function cancelJapaneseSpeech() {
  playbackToken++;
  const previous = activeCallbacks;
  activeCallbacks = null;
  cancelBrowserSpeech();
  cancelVoicevoxSpeech();
  previous?.oncancel?.();
}
function begin(callbacks: SpeechCallbacks) {
  cancelJapaneseSpeech();
  activeCallbacks = callbacks;
  publish({ message: '' });
  return playbackToken;
}
function end(token: number, callbacks: SpeechCallbacks) {
  if (token !== playbackToken) return;
  activeCallbacks = null;
  callbacks.onend?.();
}
function fail(token: number, message: string, callbacks: SpeechCallbacks) {
  if (token !== playbackToken) return;
  activeCallbacks = null;
  publish({ message });
  callbacks.onerror?.(message);
}
export function speakBrowserTts(text: string, callbacks: SpeechCallbacks = {}, selection: TtsVoiceSelection = {}) {
  const token = begin(callbacks);
  const fallback = getSelectedBrowserVoice();
  const voice = state.voices.find(voice => voice.voiceURI === selection.voiceURI) ?? fallback;
  if (!voice) { fail(token, state.browserMessage, callbacks); return null; }
  if (!text.trim()) { end(token, callbacks); return null; }
  return playBrowserSpeech(text, voice, {
    onend: () => end(token, callbacks), onerror: message => fail(token, message, callbacks),
  });
}
export function speakJapanese(text: string, callbacks: SpeechCallbacks = {}, selection: TtsVoiceSelection = {}) {
  loadConfig();
  if (state.engine === 'browser') return speakBrowserTts(text, callbacks, selection);
  const token = begin(callbacks);
  const run = async () => {
    if (state.voicevoxStatus !== 'connected') await refreshVoicevoxSpeakerList();
    if (token !== playbackToken) return;
    const style = state.voicevoxStyles.find(style => style.id === selection.styleId) ?? getSelectedVoicevoxStyle();
    if (state.voicevoxStatus !== 'connected' || !style) {
      fail(token, state.voicevoxMessage, callbacks);
      return;
    }
    try {
      await speakVoicevox(text, style.id);
      end(token, callbacks);
    } catch (error) {
      if (token !== playbackToken || (error instanceof Error && error.name === 'AbortError')) return;
      if (error instanceof VoicevoxError && error.kind === 'connection') {
        publish({ voicevoxStatus: 'unavailable', voicevoxMessage: error.message });
      }
      fail(token, error instanceof Error ? error.message : 'VOICEVOX 朗读失败，请重新检测连接。', callbacks);
    }
  };
  return run();
}
