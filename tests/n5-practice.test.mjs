import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dialogue, grammar, shadow, vocabulary, speechText, matchesGrammarAnswer } from '../src/modules/catalog/application/n5-practice.ts';
const course=JSON.parse(fs.readFileSync(new URL('../content/n5.json',import.meta.url),'utf8'));

test('lesson 20 responses belong to the intended speaker and follow the information they acknowledge',()=>{
 const turns=dialogue(course.lessons[19]).turns.filter(t=>!t.stage);
 const mountain=turns.findIndex(t=>t.text.includes('あの山'));
 assert.equal(turns[mountain].role,'同学');
 assert.equal(turns[mountain+1].role,'私(わたし)');
 assert(turns[mountain+1].text.includes('写真(しゃしん)を撮(と)りたい'));
 const meeting=turns.findIndex(t=>t.text.includes('集合(しゅうごう)は三時'));
 assert.equal(turns[meeting+1].role,'私(わたし)');
 assert(turns[meeting+1].text.includes('時間(じかん)までに戻'));
 for(const version of shadow(course.lessons[19].sections[5]).versions){
  assert.equal(version.turns[0].role,'私(わたし)');
  assert(version.turns[0].text.includes('休(やす)みたい'));
  assert.equal(version.turns[1].role,'同学');
 }
});

test('lesson 8 answers electricity immediately and separates phone and private conversations',()=>{
 const turns=dialogue(course.lessons[7]).turns;
 const electricity=turns.findIndex(t=>t.text.endsWith('電気(でんき)は使(つか)えますか。'));
 assert.equal(turns[electricity+1].role,'私(わたし)');
 assert.equal(turns[electricity+1].text,'はい、電気(でんき)は使(つか)えます。');
 for(const version of shadow(course.lessons[7].sections[5]).versions){
  assert(version.turns.some(t=>t.role==='客服'&&t.text.includes('確認(かくにん)しました')));
  assert(version.turns.some(t=>t.stage&&t.text.includes('电话结束')));
 }
});

test('all linked tests and comparison rows match their authored teaching material',()=>{
 for(const lesson of course.lessons){
  const words=vocabulary(lesson.sections[2]).flatMap(g=>g.items);
  const wordTest=lesson.sections[10].blocks[1].text;
  assert.equal(wordTest,words.map(w=>`读音：${speechText(w.japanese)}\n答案：${w.japanese} — ${w.meaning}`).join('\n'),`vocabulary drift ${lesson.id}`);
  const items=grammar(lesson.sections[3]);
  assert.equal(lesson.sections[11].blocks[1].text,items.map(g=>`题目：${g.question}\n答案：${g.answer}`).join('\n'),`grammar drift ${lesson.id}`);
  for(const item of items){
   assert(!/^（\s*）[。.]?$/.test(item.question),`unscaffolded exercise ${lesson.id}`);
   assert(dialogue(lesson).turns.some(t=>!t.stage&&t.text.includes(item.example)),`no speaker for ${lesson.id}/${item.title}`);
   const blanks=(item.question.match(/（\s*）/g)??[]).length;
   assert(blanks>0,`missing blank ${lesson.id}`);
   const parts=blanks>1?item.answer.split('、'):[item.answer];
   assert.equal(parts.length,blanks,`answer count ${lesson.id}`);
   let index=0;
   const filled=item.question.replace(/（\s*）/g,()=>parts[index++]);
   assert(item.example.includes(filled),`answer does not restore example ${lesson.id}/${item.title}`);
  }
  const sh=shadow(lesson.sections[5]);
  const [polite,plain]=sh.versions.map(v=>v.turns.filter(t=>!t.stage));
  assert.deepEqual(polite.map(t=>t.role),plain.map(t=>t.role),`shadow roles ${lesson.id}`);
  const comparison=sh.details[1].text.split('\n').slice(1);
  assert.equal(comparison.length,polite.length);
  comparison.forEach((row,i)=>assert.deepEqual(row.split(' | ').slice(0,3),[polite[i].role,polite[i].text,plain[i].text],`comparison drift ${lesson.id}/${i}`));
 }
});

test('grammar grading accepts written/readings and multiple blank separators, preserving answer order',()=>{
 const item=grammar(course.lessons[17].sections[3])[1];
 for(const input of ['に、で','に,で','に，で','に で',' に 、 で '])assert(matchesGrammarAnswer(input,item.answer,item.question),input);
 for(const input of ['', 'で、に','に','にで','に、で、は'])assert(!matchesGrammarAnswer(input,item.answer,item.question),input);
 assert(matchesGrammarAnswer('撮りたいです','撮(と)りたいです','写真を（　）。'));
 assert(matchesGrammarAnswer('とりたいです','撮(と)りたいです','写真を（　）。'));
 assert(!matchesGrammarAnswer('撮ります','撮(と)りたいです','写真を（　）。'));
});
