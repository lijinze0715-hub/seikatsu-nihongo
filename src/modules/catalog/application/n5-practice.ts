import type { N5Lesson, N5Section } from '../domain/n5-course';

export type Turn = { role: string; text: string; stage?: boolean };
export type Vocabulary = { japanese: string; meaning: string };
export type GrammarItem = {
  title: string;
  connection: string;
  explanation: string;
  example: string;
  question: string;
  answer: string;
};

const lines = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean);
const field = (value: string, label: string) => lines(value).find(line => line.startsWith(label + '：'))?.slice(label.length + 1) ?? '';

export function speechText(value: string) {
  return value.replace(/([一-龯々ヶ]+)\(([ぁ-ゖァ-ヺー]+)\)/g, '$2');
}

export function matchesGrammarAnswer(input: string, expected: string, question: string) {
  const multiple = (question.match(/（\s*）/g) ?? []).length > 1;
  const normalize = (value: string) => {
    const normalized = value.normalize('NFKC');
    return multiple
      ? normalized.split(/[、,，\s]+/).filter(Boolean).join('|')
      : normalized.replace(/\s/g, '');
  };
  if (!input.trim()) return false;
  const written = expected.replace(/\(([ぁ-ゖァ-ヺー]+)\)/g, '');
  return [expected, written, speechText(expected)].some(value => normalize(input) === normalize(value));
}

export function dialogue(lesson: N5Lesson): { context: string; turns: Turn[]; note: string } {
  const blocks = lesson.sections[1].blocks;
  const body = blocks.find(block => block.text.includes('\n') && !block.text.startsWith('情境：'))?.text ?? '';
  return {
    context: blocks.find(block => block.text.startsWith('情境：'))?.text.replace(/^情境：/, '') ?? '',
    turns: parseTurns(body),
    note: blocks.find(block => block.text.startsWith('说明：'))?.text.replace(/^说明：/, '') ?? '',
  };
}

export function parseTurns(value: string): Turn[] {
  return lines(value).map(line => {
    if (line.startsWith('〔')) return { role: '', text: line, stage: true };
    const separator = line.indexOf('：');
    return separator < 0
      ? { role: '私', text: line }
      : { role: line.slice(0, separator), text: line.slice(separator + 1) };
  });
}

export function vocabulary(section: N5Section) {
  const groups: { label: string; items: Vocabulary[] }[] = [];
  for (const [index, block] of section.blocks.entries()) {
    if (block.kind !== 'subheading' || !/^■ 3[AB]/.test(block.text)) continue;
    const list = section.blocks[index + 1]?.text ?? '';
    groups.push({
      label: block.text.replace(/^■\s*/, ''),
      items: lines(list).flatMap(line => {
        const separator = line.indexOf(' — ');
        return separator < 0 ? [] : [{ japanese: line.slice(0, separator), meaning: line.slice(separator + 3) }];
      }),
    });
  }
  return groups;
}

export function grammar(section: N5Section): GrammarItem[] {
  return section.blocks.flatMap((block, index) => {
    if (block.kind !== 'subheading' || !/^4\.\d+ 文法点：/.test(block.text)) return [];
    const details = section.blocks[index + 1]?.text ?? '';
    return [{
      title: block.text.replace(/^4\.\d+ 文法点：/, ''),
      connection: field(details, '接续'),
      explanation: field(details, '说明'),
      example: field(details, '例句'),
      question: field(details, '例题'),
      answer: field(details, '答案'),
    }];
  });
}

export function shadow(section: N5Section) {
  const introduction = section.blocks[0]?.text ?? '';
  const versions = section.blocks.flatMap((block, index) => {
    if (block.kind !== 'subheading' || !block.text.startsWith('■ 跟读文本')) return [];
    return [{
      label: block.text.includes('礼貌体版') ? '礼貌体' : '普通体',
      turns: parseTurns(section.blocks[index + 1]?.text ?? ''),
    }];
  });
  const lastVersion = section.blocks.findLastIndex(block => block.kind === 'subheading' && block.text.startsWith('■ 跟读文本'));
  return { introduction, versions, details: section.blocks.slice(lastVersion + 2) };
}

export function fixedPhrase(section: N5Section) {
  const details = section.blocks.find(block => block.text.startsWith('固定句：'))?.text ?? '';
  return {
    phrase: field(details, '固定句'),
    meaning: field(details, '意思'),
    details: lines(details).filter(line => !line.startsWith('固定句：') && !line.startsWith('意思：')),
  };
}
