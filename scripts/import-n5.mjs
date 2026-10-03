import fs from 'node:fs';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/import-n5.mjs <source.txt>');
const targetPath = new URL('../content/n5.json', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const matches = [...source.matchAll(/```text\n([\s\S]*?)\n```/g)];
if (matches.length !== 20) throw new Error(`Expected 20 lessons, found ${matches.length}`);

function paragraphs(text) {
  return text.trim().split(/\n\s*\n/).flatMap((part) => {
    const lines = part.trim().split('\n');
    if (/^■\s|^4\.\d+\s/.test(lines[0])) {
      return [
        { kind: 'subheading', text: lines[0] },
        ...(lines.length > 1 ? [{ kind: 'text', text: lines.slice(1).join('\n') }] : []),
      ];
    }
    return [{ kind: 'text', text: part.trim() }];
  });
}

const forewordLines = source.slice(0, matches[0].index).trim().split('\n').map((line) => line.trim()).filter(Boolean);
const lessons = matches.map((match, index) => {
  const raw = match[1].trim();
  const pieces = raw.split(/\n────────────────────────\n/);
  const header = pieces.shift().trim();
  const firstLine = header.split('\n')[0];
  const found = firstLine.match(/^第(\d+)课\s+(.+)$/);
  if (!found || Number(found[1]) !== index + 1) throw new Error(`Invalid lesson ${index + 1}: ${firstLine}`);
  const sections = [];
  for (let i = 0; i < pieces.length; i += 2) {
    const heading = pieces[i]?.trim();
    const body = pieces[i + 1]?.trim();
    if (!heading || !body || heading.includes('\n')) throw new Error(`Invalid section in lesson ${index + 1}: ${heading}`);
    const numbered = /^([1-8])\s/.exec(heading);
    const appendix = /^附([12])：/.exec(heading);
    const quiz = /^测试([12])：/.exec(heading);
    if (!numbered && !appendix && !quiz) throw new Error(`Unknown section in lesson ${index + 1}: ${heading}`);
    sections.push({ id: numbered ? `section-${numbered[1]}` : appendix ? `appendix-${appendix[1]}` : `test-${quiz[1]}`, title: heading, blocks: paragraphs(body) });
  }
  const expected = [...Array.from({length: 8}, (_, i) => `section-${i + 1}`), 'appendix-1', 'appendix-2', 'test-1', 'test-2'];
  if (sections.length !== 12 || sections.some((section, i) => section.id !== expected[i])) throw new Error(`Expected 8 sections, 2 appendices and 2 tests in lesson ${index + 1}`);
  return {
    id: `n5-${index + 1}`,
    slug: `lesson-${index + 1}`,
    number: index + 1,
    title: found[2],
    introduction: paragraphs(header.split('\n').slice(1).join('\n')),
    sections,
  };
});

const catalog = {
  id: 'n5',
  title: '日语N5生活课程',
  edition: '第1～20课（校订版）',
  introduction: forewordLines.filter((line) => !line.includes('https://')),
  references: forewordLines.filter((line) => line.includes('https://')).map((line) => {
    const start = line.indexOf('https://');
    return { label: line.slice(0, start).replace(/[：:]$/, ''), url: line.slice(start) };
  }),
  lessons,
};
const output = JSON.stringify(catalog, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(targetPath, 'utf8').replace(/\r\n/g, '\n') !== output) throw new Error('content/n5.json differs from content/n5-source.txt; regenerate with import-n5.mjs');
} else fs.writeFileSync(targetPath, output);
console.log(JSON.stringify({ lessons: lessons.length, sections: lessons.reduce((n, l) => n + l.sections.length, 0), references: catalog.references.length, sourceCharacters: source.length }));
