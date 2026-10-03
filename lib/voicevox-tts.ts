export const VOICEVOX_URL = 'http://127.0.0.1:50021';
export type VoicevoxSpeaker = { name: string; speaker_uuid: string; styles: { name: string; id: number; type?: string }[] };
export type VoicevoxStyle = { id: number; name: string; speakerName: string; speakerUUID: string };

export class VoicevoxError extends Error {
  kind: 'connection' | 'http' | 'response' | 'playback';
  constructor(message: string, kind: VoicevoxError['kind']) {
    super(message);
    this.name = 'VoicevoxError';
    this.kind = kind;
  }
}
export function voicevoxConnectionMessage() {
  const origin = typeof window !== 'undefined' ? window.location?.origin : undefined;
  const https = origin?.startsWith('https:');
  return `VOICEVOX 未连接：Engine 可能未启动，或浏览器阻止了连接。请确认 ${VOICEVOX_URL} 可用，检查 CORS、浏览器的本地网络访问权限${https ? '，以及 HTTPS 网页访问本机 HTTP 服务的限制' : ''}。如需配置 Engine 允许来源，只允许当前网页 Origin${origin ? `（${origin}）` : ''}，不要开放任意 Origin。`;
}

// Each request is bounded, including response-body reads. No cloud proxy is used.
async function request<T>(pathname: string, init: RequestInit, read: (response: Response) => Promise<T>, timeout = 5000): Promise<T> {
  const signal = AbortSignal.any([...(init.signal ? [init.signal] : []), AbortSignal.timeout(timeout)]);
  try {
    const response = await fetch(`${VOICEVOX_URL}${pathname}`, { ...init, signal, mode: 'cors', credentials: 'omit', redirect: 'error' });
    if (!response.ok) throw new VoicevoxError(`VOICEVOX ${pathname.split('?')[0]} 请求失败（HTTP ${response.status}）。请检查 Engine 状态及所选风格是否仍可用。`, 'http');
    return await read(response);
  } catch (error) {
    if (init.signal?.aborted) throw new DOMException('朗读已取消', 'AbortError');
    if (error instanceof VoicevoxError) throw error;
    if (error instanceof SyntaxError) throw new VoicevoxError('VOICEVOX 返回的数据格式不正确，请检查 Engine 版本与 API。', 'response');
    throw new VoicevoxError(`${voicevoxConnectionMessage()}${signal.aborted ? '请求超时，请重试。' : ''}`, 'connection');
  }
}

export async function isVoicevoxAvailable(signal?: AbortSignal) {
  const version = await request('/version', { signal }, response => response.json());
  if (typeof version !== 'string' || !version.trim()) throw new VoicevoxError('VOICEVOX /version 返回了无效版本信息。', 'response');
  return true;
}
export async function getVoicevoxSpeakers(signal?: AbortSignal): Promise<VoicevoxSpeaker[]> {
  const data: unknown = await request('/speakers', { signal }, response => response.json());
  if (!Array.isArray(data) || !data.every(speaker => speaker && typeof speaker.name === 'string' &&
    typeof speaker.speaker_uuid === 'string' && Array.isArray(speaker.styles) &&
    speaker.styles.every((style: { name?: unknown; id?: unknown; type?: unknown }) => style && typeof style.name === 'string' &&
      typeof style.id === 'number' && Number.isSafeInteger(style.id) && style.id >= 0 &&
      (style.type === undefined || typeof style.type === 'string')))) {
    throw new VoicevoxError('VOICEVOX /speakers 返回的角色或风格列表格式不正确。', 'response');
  }
  return data as VoicevoxSpeaker[];
}
export function flattenVoicevoxStyles(speakers: VoicevoxSpeaker[]): VoicevoxStyle[] {
  // Singing-only styles cannot be used by audio_query/synthesis.
  return speakers.flatMap(speaker => speaker.styles
    .filter(style => style.type === undefined || style.type === 'talk')
    .map(style => ({ id: style.id, name: style.name, speakerName: speaker.name, speakerUUID: speaker.speaker_uuid })));
}

type Playback = { controller: AbortController; audio: HTMLAudioElement | null; url: string | null };
let playback: Playback | null = null;
function release(item: Playback) {
  if (item.audio) {
    item.audio.onended = null;
    item.audio.onerror = null;
    item.audio.pause();
    item.audio.removeAttribute('src');
    item.audio.load();
    item.audio = null;
  }
  if (item.url) { URL.revokeObjectURL(item.url); item.url = null; }
}
export function cancelVoicevoxSpeech() {
  const previous = playback;
  playback = null;
  if (previous) { previous.controller.abort(); release(previous); }
}

// Resolves only when playback finishes; rejects on errors or cancellation.
export async function speakVoicevox(text: string, styleId: number): Promise<void> {
  cancelVoicevoxSpeech();
  if (!Number.isSafeInteger(styleId) || styleId < 0) throw new VoicevoxError('VOICEVOX 风格标识无效，请重新选择角色 / 风格。', 'response');
  if (!text.trim()) return;
  const item: Playback = { controller: new AbortController(), audio: null, url: null };
  playback = item;
  const signal = item.controller.signal;
  try {
    const params = new URLSearchParams({ text, speaker: String(styleId) });
    const query = await request(`/audio_query?${params}`, { method: 'POST', signal }, response => response.json(), 60000);
    if (!query || typeof query !== 'object' || Array.isArray(query)) throw new VoicevoxError('VOICEVOX audio_query 返回了无效参数。', 'response');
    signal.throwIfAborted();
    const blob = await request(`/synthesis?speaker=${styleId}`, {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query),
    }, response => response.blob(), 60000);
    signal.throwIfAborted();
    if (!blob.size) throw new VoicevoxError('VOICEVOX 返回了空音频，请重试。', 'response');
    item.url = URL.createObjectURL(blob);
    const audio = new Audio(item.url);
    item.audio = audio;
    await new Promise<void>((resolve, reject) => {
      const abort = () => reject(new DOMException('朗读已取消', 'AbortError'));
      const finish = (error?: VoicevoxError) => {
        signal.removeEventListener('abort', abort);
        if (error) reject(error); else resolve();
      };
      signal.addEventListener('abort', abort, { once: true });
      audio.onended = () => finish();
      audio.onerror = () => finish(new VoicevoxError('VOICEVOX 音频无法播放，请检查 Engine 返回的 WAV 音频。', 'playback'));
      Promise.resolve().then(() => { signal.throwIfAborted(); return audio.play(); }).catch(() => {
        finish(new VoicevoxError('浏览器未允许播放 VOICEVOX 音频。请确认页面允许声音播放，再点击朗读重试。', 'playback'));
      });
    });
  } finally {
    release(item);
    if (playback === item) playback = null;
  }
}
