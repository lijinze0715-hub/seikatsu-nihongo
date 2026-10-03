import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cancelVoicevoxSpeech, isVoicevoxAvailable, getVoicevoxSpeakers, speakVoicevox, VoicevoxError } from '../lib/voicevox-tts.ts';

const speakers = [
  { name: '动态角色甲', speaker_uuid: 'uuid-a', styles: [{ id: 0, name: '通常' }, { id: 42, name: '轻声', type: 'talk' }, { id: 55, name: '歌唱', type: 'sing' }] },
  { name: '动态角色乙', speaker_uuid: 'uuid-b', styles: [{ id: 701, name: '朗读', type: 'talk' }] },
];
let counter = 0;
let previousSpeech;
const flush = () => new Promise(resolve => setImmediate(resolve));
async function waitFor(predicate) {
  for (let attempt = 0; attempt < 1000; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  assert.fail('Timed out waiting for asynchronous test state');
}
async function setup({ saved = {}, failPlay = false, browserUnsupported = false, fetchImpl } = {}) {
  previousSpeech?.cancelJapaneseSpeech();
  cancelVoicevoxSpeech();
  await flush();
  const storage = new Map(Object.entries(saved));
  const requests = [], audio = [], revoked = [], created = [], nativeCalls = [];
  const query = { accent_phrases: [], speedScale: 1, arbitraryEngineField: 'retained' };
  globalThis.window = {
    location: { origin: 'https://example.test' },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    ...(!browserUnsupported && {
      speechSynthesis: { getVoices: () => [{ voiceURI: 'ja:test', name: 'Japanese', lang: 'ja-JP', localService: true }],
        cancel: () => nativeCalls.push('cancel'), speak: value => nativeCalls.push(value), addEventListener() {}, removeEventListener() {} },
      SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    }),
  };
  globalThis.Audio = class {
    constructor(url) { this.src = url; this.pauses = 0; this.plays = 0; audio.push(this); }
    play() { this.plays++; return failPlay ? Promise.reject(new Error('autoplay')) : Promise.resolve(); }
    pause() { this.pauses++; }
    removeAttribute() { this.src = ''; }
    load() {}
  };
  URL.createObjectURL = blob => { const value = `blob:test-${created.length}`; created.push({ blob, value }); return value; };
  URL.revokeObjectURL = value => revoked.push(value);
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (fetchImpl) return fetchImpl(url, options);
    const pathname = new URL(url).pathname;
    if (pathname === '/version') return Response.json('test-version');
    if (pathname === '/speakers') return Response.json(speakers);
    if (pathname === '/audio_query') return Response.json(query);
    if (pathname === '/synthesis') return new Response(new Blob(['wav'], { type: 'audio/wav' }));
    throw new Error('unexpected request');
  };
  const speech = await import(`../lib/japanese-speech.ts?voicevox=${++counter}`);
  previousSpeech = speech;
  return { speech, storage, requests, audio, revoked, created, nativeCalls, query };
}

test('connects via version, dynamically loads styles and restores numeric style 0', async () => {
  const ctx = await setup({ saved: { 'seikatsu-nihongo:tts-engine': 'voicevox', 'seikatsu-nihongo:voicevox-style-id': '0' } });
  await ctx.speech.refreshVoicevoxSpeakerList();
  const state = ctx.speech.getVoiceSnapshot();
  assert.equal(state.engine, 'voicevox');
  assert.equal(state.voicevoxStatus, 'connected');
  assert.equal(state.voicevoxMessage, 'VOICEVOX 已连接');
  assert.deepEqual(state.voicevoxStyles.map(style => style.id), [0, 42, 701]);
  assert.equal(ctx.speech.getSelectedVoicevoxStyle().id, 0);
  assert.deepEqual(ctx.requests.map(request => new URL(request.url).pathname), ['/version', '/speakers']);
  ctx.speech.selectVoicevoxStyle(701);
  assert.equal(ctx.storage.get(ctx.speech.STYLE_STORAGE_KEY), '701');
  ctx.speech.selectTtsEngine('browser');
  assert.equal(ctx.storage.get(ctx.speech.ENGINE_STORAGE_KEY), 'browser');
});

test('removed style falls back to first valid style and persists the replacement', async () => {
  const { speech, storage } = await setup({ saved: { 'seikatsu-nihongo:voicevox-style-id': '999999' } });
  await speech.refreshVoicevoxSpeakerList();
  assert.equal(speech.getSelectedVoicevoxStyle().id, 0);
  assert.equal(storage.get(speech.STYLE_STORAGE_KEY), '0');
});

test('standard POST query/synthesis preserves JSON, encodes Japanese and releases WAV URL on end', async () => {
  const ctx = await setup();
  const promise = speakVoicevox('こんにちは & ? # 世界', 42);
  await waitFor(() => ctx.audio[0]?.plays === 1);
  assert.equal(ctx.requests.length, 2);
  const [first, second] = ctx.requests;
  assert.equal(new URL(first.url).origin, 'http://127.0.0.1:50021');
  assert.equal(new URL(first.url).searchParams.get('text'), 'こんにちは & ? # 世界');
  assert.equal(new URL(first.url).searchParams.get('speaker'), '42');
  assert.equal(first.options.method, 'POST');
  assert.equal(second.options.method, 'POST');
  assert.equal(new URL(second.url).searchParams.get('speaker'), '42');
  assert.equal(second.options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(second.options.body), ctx.query);
  assert.equal(first.options.credentials, 'omit');
  assert.equal(first.options.redirect, 'error');
  assert.equal(ctx.created.length, 1);
  assert.equal(ctx.audio[0].plays, 1);
  ctx.audio[0].onended();
  await promise;
  assert.deepEqual(ctx.revoked, ['blob:test-0']);
  assert.equal(ctx.audio[0].pauses, 1);
  assert.equal(ctx.audio[0].src, '');
});

test('new VOICEVOX playback pauses previous Audio and revokes its URL exactly once', async () => {
  const ctx = await setup();
  const first = speakVoicevox('一', 0).catch(error => error);
  await waitFor(() => ctx.audio[0]?.plays === 1);
  const second = speakVoicevox('二', 42);
  await waitFor(() => ctx.audio[1]?.plays === 1);
  assert.equal((await first).name, 'AbortError');
  assert.equal(ctx.audio[0].pauses, 1);
  assert.deepEqual(ctx.revoked, ['blob:test-0']);
  ctx.audio[1].onended();
  await second;
  assert.deepEqual(ctx.revoked, ['blob:test-0', 'blob:test-1']);
});

test('cancellation during synthesis ignores late HTTP results and creates no Audio', async () => {
  let resolveSynthesis;
  const ctx = await setup({ fetchImpl: async (url) => new URL(url).pathname === '/audio_query'
    ? Response.json({ accent_phrases: [] }) : new Promise(resolve => resolveSynthesis = resolve) });
  const pending = speakVoicevox('待つ', 0).catch(error => error);
  await waitFor(() => resolveSynthesis);
  cancelVoicevoxSpeech();
  assert(ctx.requests[1].options.signal.aborted);
  resolveSynthesis(new Response(new Blob(['late wav'])));
  assert.equal((await pending).name, 'AbortError');
  assert.equal(ctx.audio.length, 0);
  assert.equal(ctx.created.length, 0);
});

test('unified dispatch supports both directions of engine switching and cancels continuous playback callbacks', async () => {
  const ctx = await setup();
  await ctx.speech.refreshVoicevoxSpeakerList();
  let completed = 0, canceled = 0;
  const utterance = ctx.speech.speakJapanese('日語', { onend: () => completed++, oncancel: () => canceled++ });
  ctx.speech.selectTtsEngine('voicevox');
  assert.equal(utterance.onend, null);
  assert.equal(canceled, 1);
  const pending = ctx.speech.speakJapanese('こんにちは', { onend: () => completed++, oncancel: () => canceled++ });
  await waitFor(() => ctx.audio[0]?.plays === 1);
  ctx.speech.selectTtsEngine('browser');
  await pending;
  assert.equal(canceled, 2);
  assert.equal(completed, 0);
  assert.equal(ctx.audio[0].pauses, 1);
  assert.equal(ctx.revoked.length, 1);
  const next = ctx.speech.speakJapanese('おはよう');
  assert.equal(next.lang, 'ja-JP');
});

test('VOICEVOX works without native SpeechSynthesis and successive sentences use the new style', async () => {
  const ctx = await setup({ browserUnsupported: true, saved: { 'seikatsu-nihongo:tts-engine': 'voicevox' } });
  await ctx.speech.refreshVoicevoxSpeakerList();
  const first = ctx.speech.speakJapanese('一');
  await waitFor(() => ctx.audio[0]?.plays === 1);
  ctx.speech.selectVoicevoxStyle(42);
  ctx.audio[0].onended();
  await first;
  const second = ctx.speech.speakJapanese('二');
  await waitFor(() => ctx.audio[1]?.plays === 1);
  assert.equal(new URL(ctx.requests.at(-1).url).searchParams.get('speaker'), '42');
  ctx.audio[1].onended();
  await second;
});

test('HTTP and network errors are explicit; unavailable VOICEVOX never disables browser speech', async () => {
  const offline = await setup({ saved: { 'seikatsu-nihongo:tts-engine': 'voicevox' }, fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
  await offline.speech.refreshVoicevoxSpeakerList();
  assert.equal(offline.speech.getVoiceSnapshot().voicevoxStatus, 'unavailable');
  let message;
  await offline.speech.speakJapanese('日語', { onerror: value => message = value });
  assert.match(message, /未连接/);
  assert.match(message, /CORS/);
  assert.match(message, /HTTPS/);
  assert.match(message, /https:\/\/example.test/);
  offline.speech.selectTtsEngine('browser');
  assert.equal(offline.speech.speakJapanese('日語').lang, 'ja-JP');
  await setup({ fetchImpl: async () => new Response('', { status: 422 }) });
  await assert.rejects(speakVoicevox('日語', 42), /HTTP 422/);
});

test('invalid responses, empty style lists and rejected audio playback are handled and release resources', async () => {
  await setup({ fetchImpl: async () => Response.json({ unexpected: true }) });
  await assert.rejects(isVoicevoxAvailable(), /版本/);
  await assert.rejects(getVoicevoxSpeakers(), /格式/);
  const empty = await setup({ fetchImpl: async url => new URL(url).pathname === '/version' ? Response.json('test') : Response.json([]) });
  await empty.speech.refreshVoicevoxSpeakerList();
  assert.equal(empty.speech.getVoiceSnapshot().voicevoxStatus, 'connected');
  assert.equal(empty.speech.getSelectedVoicevoxStyle(), null);
  assert.match(empty.speech.getVoiceSnapshot().voicevoxMessage, /没有可用/);
  const autoplay = await setup({ failPlay: true });
  await assert.rejects(speakVoicevox('日語', 0), /未允许播放/);
  assert.equal(autoplay.revoked.length, 1);
  assert.equal(autoplay.audio[0].pauses, 1);
  const audioError = await setup();
  const pending = speakVoicevox('日語', 0);
  await waitFor(() => audioError.audio[0]?.plays === 1);
  audioError.audio[0].onerror();
  await assert.rejects(pending, error => error instanceof VoicevoxError && error.kind === 'playback');
  assert.equal(audioError.revoked.length, 1);
});

test('slow discovery cannot overwrite a newer refresh', async () => {
  let resolveOld;
  let old = true;
  const ctx = await setup({ fetchImpl: async url => {
    if (old) { old = false; return new Promise(resolve => resolveOld = resolve); }
    return new URL(url).pathname === '/version' ? Response.json('new') : Response.json(speakers);
  } });
  const pending = ctx.speech.refreshVoicevoxSpeakerList();
  await flush();
  await ctx.speech.refreshVoicevoxSpeakerList();
  resolveOld(Response.json('old'));
  await pending;
  assert.equal(ctx.speech.getVoiceSnapshot().voicevoxStatus, 'connected');
  assert.equal(ctx.speech.getVoiceSnapshot().voicevoxStyles.length, 3);
});


test('role style override routes synthesis without changing global style and falls back if removed', async () => {
  const ctx = await setup({ saved: { 'seikatsu-nihongo:tts-engine': 'voicevox' } });
  await ctx.speech.refreshVoicevoxSpeakerList();
  ctx.speech.selectVoicevoxStyle(701);
  const mine = ctx.speech.speakJapanese('私です', {}, { styleId: 0 });
  await waitFor(() => ctx.audio[0]?.plays === 1);
  assert.equal(new URL(ctx.requests.at(-1).url).searchParams.get('speaker'), '0');
  assert.equal(ctx.speech.getSelectedVoicevoxStyle().id, 701);
  ctx.audio[0].onended();
  await mine;
  const fallback = ctx.speech.speakJapanese('はい', {}, { styleId: 999999 });
  await waitFor(() => ctx.audio[1]?.plays === 1);
  assert.equal(new URL(ctx.requests.at(-1).url).searchParams.get('speaker'), '701');
  ctx.audio[1].onended();
  await fallback;
});
