import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLearningService } from '../src/modules/learning/application/learning-service.ts';
import { createBrowserLearningRepository } from '../src/modules/learning/infrastructure/browser-learning-repository.ts';

const identities = [
  { id: 'preparation', legacyStorageKey: '准备篇:prelude' },
  { id: 'n5-1' },
];
const progressKey = 'life-japanese-progress-v3';
const draftKey = 'life-japanese-drafts-v3';

function fixture(initial = {}) {
  const data = new Map(Object.entries(initial));
  const reads = [],
    writes = [];
  const storage = {
    getItem(key) {
      reads.push(key);
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      writes.push(key);
      data.set(key, value);
    },
  };
  const repository = createBrowserLearningRepository(() => storage);
  return {
    data,
    reads,
    writes,
    repository,
    service: createLearningService(repository, identities),
  };
}

test('progress loads and saves independently of old drafts, preserving stored draft data', () => {
  const oldDraft = '{malformed legacy draft';
  const { service, data, reads, writes } = fixture({
    [progressKey]: JSON.stringify(['n5-1:section-1']),
    [draftKey]: oldDraft,
  });
  assert.deepEqual(service.load().progress, ['n5-1:section-1']);
  service.saveProgress(['n5-1:section-1', 'n5-1:section-2']);
  assert.deepEqual(JSON.parse(data.get(progressKey)), [
    'n5-1:section-1',
    'n5-1:section-2',
  ]);
  assert.deepEqual(reads, [progressKey]);
  assert.deepEqual(writes, [progressKey]);
  assert.equal(data.get(draftKey), oldDraft);
});

test('preparation progress migrates from v2 and normalizes identities without overwriting v2', () => {
  const oldProgress = JSON.stringify([
    '准备篇:prelude:kana-hiragana',
    'n5-1:section-2',
    'n5-1:section-2',
    'n5-1:kana-hiragana',
    'removed:section-1',
  ]);
  const oldKey = 'life-japanese-progress-v2';
  const { service, data } = fixture({ [oldKey]: oldProgress });
  const loaded = service.load();
  assert.deepEqual(loaded.progress, [
    'preparation:kana-hiragana',
    'n5-1:section-2',
  ]);
  assert.deepEqual(loaded.messages, []);
  service.saveProgress(loaded.progress);
  assert.deepEqual(JSON.parse(data.get(progressKey)), loaded.progress);
  assert.equal(data.get(oldKey), oldProgress);
});

for (const stored of ['{invalid json', '{"section":true}']) {
  test(`invalid progress remains intact and cannot be overwritten: ${stored}`, () => {
    const { service, data, writes } = fixture({ [progressKey]: stored });
    const loaded = service.load();
    assert.equal(loaded.progressWritable, false);
    assert.deepEqual(loaded.progress, []);
    assert.equal(loaded.messages.length, 1);
    service.saveProgress(['n5-1:section-1']);
    assert.deepEqual(writes, []);
    assert.equal(data.get(progressKey), stored);
  });
}

test('storage is acquired lazily, blocked reads are safe, and a later load can recover', () => {
  let available = false;
  let accesses = 0;
  const data = new Map();
  const repository = createBrowserLearningRepository(() => {
    accesses++;
    if (!available) throw new Error('storage blocked');
    return {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
    };
  });
  const service = createLearningService(repository, identities);
  assert.equal(accesses, 0);
  assert.equal(service.load().progressWritable, false);
  service.saveProgress(['n5-1:section-1']);
  assert.equal(accesses, 1);
  available = true;
  assert.equal(service.load().progressWritable, true);
  service.saveProgress(['n5-1:section-1']);
  assert.deepEqual(JSON.parse(data.get(progressKey)), ['n5-1:section-1']);
});

test('write failures propagate so the learning UI can report that progress was not saved', () => {
  const repository = createBrowserLearningRepository(() => ({
    getItem: () => null,
    setItem: () => {
      throw new Error('quota exceeded');
    },
  }));
  const service = createLearningService(repository, identities);
  assert.equal(service.load().progressWritable, true);
  assert.throws(
    () => service.saveProgress(['n5-1:section-1']),
    /quota exceeded/,
  );
});
