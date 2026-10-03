import fs from 'node:fs';
import assert from 'node:assert/strict';

const course = JSON.parse(fs.readFileSync(new URL('../content/n5.json', import.meta.url), 'utf8'));
const preparation = JSON.parse(fs.readFileSync(new URL('../content/preparation.json', import.meta.url), 'utf8'));

assert.equal(course.id, 'n5');
assert.equal(course.lessons.length, 20);
assert.equal(preparation.units.length, 8);
assert.equal(course.references.length, 7);
assert.equal(new Set(course.lessons.map(lesson => lesson.id)).size, 20);
assert.equal(new Set(course.lessons.map(lesson => lesson.slug)).size, 20);

for (const [index, lesson] of course.lessons.entries()) {
  assert.equal(lesson.id, `n5-${index + 1}`);
  assert.equal(lesson.slug, `lesson-${index + 1}`);
  assert.equal(lesson.number, index + 1);
  assert(lesson.title && lesson.introduction.length);
  assert.equal(lesson.sections.length, 12);
  for (const [sectionIndex, section] of lesson.sections.entries()) {
    assert.equal(section.id, sectionIndex < 8 ? `section-${sectionIndex + 1}` : sectionIndex < 10 ? `appendix-${sectionIndex - 7}` : `test-${sectionIndex - 9}`);
    assert(section.title && section.blocks.length);
    assert(section.blocks.every(block => ['text','subheading'].includes(block.kind) && block.text.trim()));
  }
  assert(lesson.sections[2].blocks.some(block => block.text.includes('3A N5基础词汇')));
  assert(lesson.sections[2].blocks.some(block => block.text.includes('3B 场景补充词汇')));
  assert(lesson.sections[3].blocks.some(block => block.text.includes('4A 基础句型与场景练习')));
  assert(lesson.sections[3].blocks.some(block => block.text.includes('4B 补充表达与后续复习')));
  assert(lesson.sections[6].title.includes('暂搁置'));
  assert(lesson.sections[7].title.includes('暂搁置'));
  assert(lesson.sections[8].title.startsWith('附1：'));
  assert(lesson.sections[9].title.startsWith('附2：'));
  assert(lesson.sections[10].title.startsWith('测试1：'));
  assert(lesson.sections[11].title.startsWith('测试2：'));
  const dialogue = lesson.sections[1].blocks.find(block => block.text.includes('\n') && !block.text.startsWith('情境：'))?.text ?? '';
  const turns = dialogue.split('\n').filter(line => line && !line.startsWith('〔'));
  assert(turns.length >= (lesson.number === 1 ? 8 : 11), `short dialogue in lesson ${lesson.number}`);
  for (const block of lesson.sections[3].blocks) {
    if (block.kind !== 'text' || !block.text.includes('课文对应：')) continue;
    const example = block.text.match(/^例句：(.*)$/m)?.[1];
    const correspondence = block.text.match(/^课文对应：(.*)$/m)?.[1];
    assert(example && dialogue.includes(example), `4A example differs from dialogue in lesson ${lesson.number}: ${example}`);
    assert.equal(correspondence, example, `4A correspondence differs from example in lesson ${lesson.number}`);
    assert(block.text.includes('接续：') && block.text.includes('说明：') && block.text.includes('例题：') && block.text.includes('答案：'));
  }
}

assert(course.lessons[16].title.includes('垃圾'));
assert(course.lessons[17].title.includes('烧肉放题'));

console.log('N5: 20 lessons, 240 sections, 7 references validated; preparation: 8 units');
