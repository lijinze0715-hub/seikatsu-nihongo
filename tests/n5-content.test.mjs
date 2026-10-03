import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const course = JSON.parse(fs.readFileSync(new URL('../content/n5.json', import.meta.url), 'utf8'));

test('N5 course keeps document ordering and appendices', () => {
  assert.equal(course.lessons.length, 20);
  assert.deepEqual(course.lessons.map(lesson => lesson.number), Array.from({length:20},(_,i)=>i+1));
  for (const lesson of course.lessons) {
    assert.deepEqual(lesson.sections.map(section=>section.id), [
      'section-1','section-2','section-3','section-4','section-5','section-6','section-7','section-8','appendix-1','appendix-2','test-1','test-2',
    ]);
    assert(lesson.sections[8].title.includes('日本人实际会怎么说'));
    assert(lesson.sections[9].title.includes('常见误用'));
  }
});

test('procedural lessons retain caveats and document references', () => {
  const text = JSON.stringify(course);
  assert(text.includes('以本人文件及当时官方信息为准'));
  assert(text.includes('没有示范音频时先做分句朗读'));
  assert(text.includes('JLPT不公布逐项必考词汇和文法清单'));
  for (const number of [6, 8, 12, 15, 16, 18, 19]) assert(course.lessons[number-1].sections.length === 12);
  assert.equal(course.references.length, 7);
});

test('all lessons keep substantial dialogues, vocabulary and two shadow versions', () => {
  for (const lesson of course.lessons) {
    const dialogue = lesson.sections[1].blocks.find(block => block.text.includes('\n') && !block.text.startsWith('情境：'))?.text ?? '';
    const turns = dialogue.split('\n').filter(line => line.trim() && !line.startsWith('〔'));
    assert(turns.length >= (lesson.number === 1 ? 8 : 11), `short dialogue: ${lesson.id}`);
    const words = lesson.sections[2].blocks.filter(block => block.kind === 'text').map(block => block.text.split('\n').filter(line => line.includes(' — ')).length);
    assert(words[0] >= 11 && words[1] >= 7, `sparse vocabulary: ${lesson.id}`);
    const shadow = lesson.sections[5].blocks;
    const versions = shadow.flatMap((block, index) => block.kind === 'subheading' && block.text.startsWith('■ 跟读文本') ? [shadow[index + 1]?.text.split('\n').length ?? 0] : []);
    assert.deepEqual(versions.length, 2, `missing shadow version: ${lesson.id}`);
    assert(versions.every(count => count >= 6), `short shadow version: ${lesson.id}`);
  }
});
