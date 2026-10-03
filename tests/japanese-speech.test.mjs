import { test } from 'node:test';
import assert from 'node:assert/strict';

let moduleId = 0;
const voice = (voiceURI, name, lang = 'ja-JP', localService = true) => ({ voiceURI, name, lang, localService, default: false });
const nanami = voice('uri:nanami', 'Microsoft 七海 Online (Natural) - Japanese (Japan)', 'ja-JP', false);
const keita = voice('uri:keita', 'Microsoft 圭太 Online (Natural)', 'ja-JP', false);
const local = voice('uri:local', 'Local Japanese');

async function setup({ voices = [], saved = null, storageThrows = false, unsupported = false } = {}) {
  globalThis.fetch = async () => { throw new TypeError('Test Engine is offline'); };
  const events = new Map();
  const storage = new Map(saved ? [['seikatsu-nihongo:japanese-voice-uri', saved]] : []);
  const calls = [];
  const engine = {
    voices, getVoices() { return this.voices; },
    addEventListener(type, fn) { events.set(type, fn); },
    removeEventListener(type, fn) { if (events.get(type) === fn) events.delete(type); },
    cancel() { calls.push('cancel'); },
    speak(utterance) { calls.push(utterance); },
  };
  globalThis.window = {
    localStorage: {
      getItem(key) { if (storageThrows) throw new Error('denied'); return storage.get(key) ?? null; },
      setItem(key, value) { if (storageThrows) throw new Error('denied'); storage.set(key, value); },
    },
    ...(!unsupported && {
      speechSynthesis: engine,
      SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    }),
  };
  const speech = await import(`../lib/japanese-speech.ts?test=${++moduleId}`);
  return { speech, engine, events, storage, calls };
}

test('lists every Japanese voice, sorts Natural first, uses URI identity and readable labels', async () => {
  const sameName = voice('uri:duplicate-name', 'Local Japanese', 'JA-jp');
  const { speech } = await setup({ voices: [local, voice('uri:english', 'English', 'en-US'), nanami, sameName, keita] });
  const list = speech.getJapaneseVoices();
  assert.equal(list.length, 4);
  assert(list.slice(0, 2).every(v => v.name.includes('Natural')));
  assert.equal(new Set(list.map(v => v.voiceURI)).size, 4);
  assert.equal(speech.getVoiceLabel(nanami), '七海（自然语音・在线）');
  assert.equal(speech.getVoiceLabel(keita), '圭太（自然语音・在线）');
  assert(!/男声|女声/.test(speech.getVoiceLabel(keita)));
});

test('initial empty list retains saved URI and voiceschanged restores it with a single listener', async () => {
  const { speech, engine, events, storage } = await setup({ saved: keita.voiceURI });
  let updates = 0;
  const unsubscribe = speech.subscribeToVoices(() => updates++);
  const unsubscribe2 = speech.subscribeToVoices(() => {});
  assert.equal(speech.getVoiceSnapshot().status, 'unavailable');
  assert.match(speech.getVoiceSnapshot().browserMessage, /没有可用/);
  assert.equal(storage.get(speech.VOICE_STORAGE_KEY), keita.voiceURI);
  engine.voices = [local, nanami, keita];
  events.get('voiceschanged')();
  assert.equal(speech.getVoiceSnapshot().selectedVoiceURI, keita.voiceURI);
  assert.equal(speech.getVoiceSnapshot().status, 'ready');
  assert(updates >= 2);
  unsubscribe();
  assert(events.has('voiceschanged'));
  unsubscribe2();
  assert.equal(events.size, 0);
});

test('missing saved or removed voice falls back to Natural, then other Japanese, then explicit unavailable', async () => {
  const { speech, engine } = await setup({ voices: [local, nanami], saved: 'missing' });
  assert.equal(speech.getSelectedVoice().voiceURI, nanami.voiceURI);
  engine.voices = [local];
  assert.equal(speech.getSelectedVoice().voiceURI, local.voiceURI);
  engine.voices = [voice('en', 'English', 'en-US')];
  assert.equal(speech.getSelectedVoice(), null);
  assert.equal(speech.getVoiceSnapshot().status, 'unavailable');
});

test('selection persists only URI and is restored in a fresh page instance', async () => {
  const { speech, storage } = await setup({ voices: [nanami, keita] });
  speech.refreshVoiceList();
  speech.selectJapaneseVoice(keita.voiceURI);
  assert.equal(storage.get(speech.VOICE_STORAGE_KEY), keita.voiceURI);
  const nextPage = await setup({ voices: [nanami, keita], saved: storage.get(speech.VOICE_STORAGE_KEY) });
  assert.equal(nextPage.speech.getSelectedVoice().voiceURI, keita.voiceURI);
});

test('each utterance uses a newly fetched voice object and current selection with fixed parameters; cancel precedes speak', async () => {
  const { speech, engine, calls } = await setup({ voices: [nanami, keita] });
  speech.selectJapaneseVoice(nanami.voiceURI);
  const first = speech.speakJapanese('こんにちは');
  assert.equal(calls[0], 'cancel');
  assert.equal(calls[1], first);
  speech.selectJapaneseVoice(keita.voiceURI);
  const freshKeita = { ...keita };
  engine.voices = [freshKeita, { ...nanami }];
  const second = speech.speakJapanese('おはよう');
  assert.notEqual(first, second);
  assert.equal(second.voice, freshKeita);
  assert.equal(second.lang, 'ja-JP');
  assert.equal(second.rate, 1);
  assert.equal(second.pitch, 1);
  assert.equal(second.volume, 1);
  assert.equal(calls[2], 'cancel');
  assert.equal(calls[3], second);
  assert.equal(first.onend, null);
});

test('canceled utterance callbacks cannot restart a previous continuous reading', async () => {
  const { speech } = await setup({ voices: [local] });
  let finished = 0;
  const first = speech.speakJapanese('一', { onend: () => finished++ });
  const delayedEnd = first.onend;
  speech.speakJapanese('二');
  delayedEnd();
  assert.equal(finished, 0);
});

test('unsupported browser, missing voices, engine failure and blocked storage give explicit feedback', async () => {
  let message = '';
  const unsupported = await setup({ unsupported: true });
  assert.equal(unsupported.speech.speakJapanese('日語', { onerror: value => message = value }), null);
  assert.match(message, /不支持/);
  const empty = await setup();
  assert.equal(empty.speech.speakJapanese('日語', { onerror: value => message = value }), null);
  assert.match(message, /没有可用/);
  const blocked = await setup({ voices: [local], storageThrows: true });
  blocked.speech.refreshVoiceList();
  blocked.speech.selectJapaneseVoice(local.voiceURI);
  assert.match(blocked.speech.getVoiceSnapshot().storageMessage, /无法保存/);
  const utterance = blocked.speech.speakJapanese('日語', { onerror: value => message = value });
  utterance.onerror({ error: 'network' });
  assert.match(message, /朗读失败/);
  assert.match(blocked.speech.getVoiceSnapshot().message, /网络/);
  blocked.engine.speak = () => { throw new Error('engine failure'); };
  assert.equal(blocked.speech.speakJapanese('日語', { onerror: value => message = value }), null);
  assert.match(message, /朗读失败/);
});

test('server rendering does not access browser globals', async () => {
  delete globalThis.window;
  const speech = await import(`../lib/japanese-speech.ts?test=${++moduleId}`);
  assert.deepEqual(speech.getJapaneseVoices(), []);
  assert.equal(speech.getSelectedVoice(), null);
  assert.equal(speech.getServerVoiceSnapshot().status, 'loading');
});

test('role voice override applies per utterance without changing the global browser voice', async () => {
  const { speech } = await setup({ voices: [nanami, keita] });
  speech.selectJapaneseVoice(nanami.voiceURI);
  const mine = speech.speakJapanese('私は学生です', {}, { voiceURI: keita.voiceURI });
  assert.equal(mine.voice.voiceURI, keita.voiceURI);
  assert.equal(speech.getVoiceSnapshot().selectedVoiceURI, nanami.voiceURI);
  const missing = speech.speakJapanese('はい', {}, { voiceURI: 'removed' });
  assert.equal(missing.voice.voiceURI, nanami.voiceURI);
});
