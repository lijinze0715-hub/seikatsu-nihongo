import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dialogue } from '../src/modules/catalog/application/n5-practice.ts';
let counter = 0;
async function setup(saved) {
  const storage = new Map(saved ? [['seikatsu-nihongo:dialogue-voices-v1', saved]] : []);
  globalThis.window = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
  const voices = await import(`../lib/dialogue-voices.ts?test=${++counter}`);
  return { voices, storage };
}

test('all authored self variants share one voice; stage directions never become selectable roles', async () => {
  const { voices } = await setup();
  const course = JSON.parse(fs.readFileSync(new URL('../content/n5.json', import.meta.url), 'utf8'));
  for (const lesson of course.lessons) {
    const turns = dialogue(lesson).turns.filter(turn => !turn.stage);
    const roles = voices.getDialogueRoles(turns.map(turn => turn.role));
    assert.equal(roles.filter(role => voices.isSelfDialogueRole(role)).length, 1, lesson.id);
    for (const turn of turns.filter(turn => turn.role.startsWith('私'))) {
      assert.equal(voices.dialogueRoleKey(lesson.id, turn.role), 'self');
    }
  }
  assert.deepEqual(voices.getDialogueRoles(['同学', '私(わたし)', '私(わたし)→同学', '同学']), ['私', '同学']);
  assert.equal(voices.isSelfDialogueRole('私立学校职员'), false);
});

test('my voice is shared across lessons while other speakers are scoped to each lesson and role', async () => {
  const { voices } = await setup();
  voices.setDialogueVoice('lesson-1', '私', 'browser', 'uri:me');
  voices.setDialogueVoice('lesson-20', '同学', 'browser', 'uri:classmate');
  voices.setDialogueVoice('lesson-14', '同学', 'browser', 'uri:another');
  voices.setDialogueVoice('lesson-20', '医生', 'browser', 'uri:doctor');
  assert.equal(voices.getDialogueVoice('lesson-20', '私(わたし)→同学').voiceURI, 'uri:me');
  assert.equal(voices.getDialogueVoice('lesson-20', '同学').voiceURI, 'uri:classmate');
  assert.equal(voices.getDialogueVoice('lesson-14', '同学').voiceURI, 'uri:another');
  assert.equal(voices.getDialogueVoice('lesson-20', '医生').voiceURI, 'uri:doctor');
  assert.deepEqual(voices.getDialogueVoice('lesson-1', '同学'), {});
});

test('browser and VOICEVOX role choices persist separately, restore and accept style zero', async () => {
  const { voices, storage } = await setup();
  voices.setDialogueVoice('lesson-20', '私', 'browser', 'uri:me');
  voices.setDialogueVoice('lesson-20', '私', 'voicevox', '0');
  const saved = storage.get(voices.DIALOGUE_VOICES_KEY);
  const next = await setup(saved);
  assert.deepEqual(next.voices.getDialogueVoice('lesson-1', '私'), { voiceURI: 'uri:me', styleId: 0 });
  next.voices.setDialogueVoice('lesson-1', '私', 'voicevox', '');
  assert.deepEqual(next.voices.getDialogueVoice('lesson-20', '私'), { voiceURI: 'uri:me' });
});

test('live role lookup sees changes between utterances and notifies subscribers', async () => {
  const { voices } = await setup();
  let updated = 0;
  const unsubscribe = voices.subscribeToDialogueVoices(() => updated++);
  const resolve = () => voices.getDialogueVoice('lesson-20', '同学');
  voices.setDialogueVoice('lesson-20', '同学', 'voicevox', '42');
  assert.equal(resolve().styleId, 42);
  voices.setDialogueVoice('lesson-20', '同学', 'voicevox', '701');
  assert.equal(resolve().styleId, 701);
  assert(updated >= 3);
  unsubscribe();
});

test('invalid or blocked storage cannot crash the dialogue and unsaved selection remains usable', async () => {
  const corrupt = await setup('{invalid');
  assert.deepEqual(corrupt.voices.getDialogueVoice('lesson-20', '私'), {});
  assert.match(corrupt.voices.getDialogueVoiceSnapshot().message, /无法读取/);
  const { voices } = await setup();
  window.localStorage.getItem = () => { throw new Error('denied'); };
  window.localStorage.setItem = () => { throw new Error('denied'); };
  voices.setDialogueVoice('lesson-20', '私', 'voicevox', '42');
  assert.equal(voices.getDialogueVoice('lesson-20', '私').styleId, 42);
  assert.match(voices.getDialogueVoiceSnapshot().message, /无法保存/);
});
