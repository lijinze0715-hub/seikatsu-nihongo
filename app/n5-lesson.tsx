'use client';
/* oxlint-disable next/no-html-link-for-pages */
/* oxlint-disable jsx-a11y/media-has-caption -- The learner records their own voice; no authored caption track exists. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Dynamic feedback uses status live regions. */
import { sitePath } from '@/lib/site-path';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Headphones, Mic, Play, Square, Volume2 } from 'lucide-react';
import type { ContentBlock, N5Lesson, N5Section } from '@/src/modules/catalog/domain/n5-course';
import { dialogue, fixedPhrase, grammar, matchesGrammarAnswer, shadow, speechText, vocabulary, type GrammarItem } from '@/src/modules/catalog/application/n5-practice';
import { useJapaneseSpeech } from '@/hooks/use-japanese-speech';
import { DialogueVoiceSelector } from '@/components/dialogue-voice-selector';
import { getDialogueVoice, isSelfDialogueRole } from '@/lib/dialogue-voices';
import type { TtsVoiceSelection } from '@/lib/japanese-speech';
import { useLearningProgress } from '@/hooks/use-learning-progress';

type Link = Pick<N5Lesson, 'id' | 'slug' | 'number' | 'title'>;
type Speech = ReturnType<typeof useJapaneseSpeech>;
const names = ['目标', '听对话', '词汇卡', '句型练习', '固定说法', '跟读', '口语输出', '写作', '实际说法', '常见误用', '单词测试', '文法测试'];

function Japanese({ text }: { text: string }) {
  const pattern = /([一-龯々ヶ]+)\(([ぁ-ゖァ-ヺー]+)\)/g;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const position = match.index ?? 0;
    if (position > cursor) parts.push(text.slice(cursor, position));
    parts.push(<ruby key={position}>{match[1]}<rt>{match[2]}</rt></ruby>);
    cursor = position + match[0].length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <span lang="ja">{parts}</span>;
}

function Blocks({ blocks }: { blocks: ContentBlock[] }) {
  return <div className="n5-blocks">{blocks.map((block, index) => block.kind === 'subheading'
    ? <h3 key={index}>{block.text.replace(/^■\s*/, '')}</h3>
    : <p key={index}>{block.text}</p>)}</div>;
}

function Listen({ speech, value, id, label = '听这一句', voice }: { speech: Speech; value: string; id: string; label?: string; voice?: () => TtsVoiceSelection }) {
  const active = speech.speechKey === id;
  return <button type="button" className="n5-listen" onClick={() => speech.play([{ text: speechText(value), voice }], id)}>{active ? <Square size={15} /> : <Volume2 size={16} />}{active ? '停止' : label}</button>;
}

function Goals({ section }: { section: N5Section }) {
  const items = section.blocks[0]?.text.split('\n').filter(line => /^1\.\d/.test(line)) ?? [];
  return <div className="n5-goals"><p className="n5-lead">学完这一课，在生活里试着做到：</p><ol>{items.map(item => <li key={item}>{item.replace(/^1\.\d+\s*/, '')}</li>)}</ol><div className="n5-self-test">{section.blocks.slice(1).map((block, index) => <p key={index}>{block.text}</p>)}</div></div>;
}

function Dialogue({ lesson, speech }: { lesson: N5Lesson; speech: Speech }) {
  const data = dialogue(lesson);
  const spoken = data.turns.filter(turn => !turn.stage);
  return <div><p className="n5-lead">先听情境，再逐句模仿。留意对方说了什么，自己的下一句才有来由。</p><div className="n5-context"><strong>此刻的情境</strong><p>{data.context}</p></div><DialogueVoiceSelector lessonId={lesson.id} roles={spoken.map(turn => turn.role)} /><div className="n5-playbar"><button type="button" onClick={() => speech.play(spoken.map(turn => ({ text: speechText(turn.text), voice: () => getDialogueVoice(lesson.id, turn.role) })), 'dialog-all')}><Headphones size={17} />{speech.speechKey?.startsWith('dialog-all') ? '停止连续播放' : '连续听完整对话'}</button><span>按角色声优连续朗读 · {spoken.length} 句</span></div><div className="n5-turns">{data.turns.map((turn, index) => turn.stage ? <div className="n5-stage" key={index}>{turn.text}</div> : <div className={'n5-turn ' + (isSelfDialogueRole(turn.role) ? 'self' : '')} key={index}><strong>{turn.role}</strong><div><p><Japanese text={turn.text} /></p><Listen speech={speech} value={turn.text} id={`dialog-${index}`} voice={() => getDialogueVoice(lesson.id, turn.role)} /></div></div>)}</div>{data.note && <details className="n5-details"><summary>情境说明</summary><p>{data.note}</p></details>}</div>;
}

function Vocabulary({ section, speech }: { section: N5Section; speech: Speech }) {
  const groups = vocabulary(section);
  const [group, setGroup] = useState(0);
  const [shown, setShown] = useState<string[]>([]);
  return <div><p className="n5-lead">测试1：先看假名、听读音，猜日语汉字和中文意思；点击卡片核对。3B 以听懂和辨认为先。</p><div className="n5-tabs" role="tablist" aria-label="词汇类别">{groups.map((entry, index) => <button role="tab" aria-selected={group === index} key={entry.label} type="button" onClick={() => setGroup(index)}>{entry.label}<span>{entry.items.length}</span></button>)}</div><div className="n5-vocab-grid">{groups[group]?.items.map((item, index) => { const key = `${group}-${index}`; const open = shown.includes(key); return <div className="n5-vocab" key={key}><div><strong lang="ja">{speechText(item.japanese)}</strong><Listen speech={speech} value={item.japanese} id={`vocab-${key}`} label="听读音" /></div><button type="button" className="n5-flip" aria-expanded={open} onClick={() => setShown(current => open ? current.filter(value => value !== key) : [...current, key])}>{open ? <><Japanese text={item.japanese} /> — {item.meaning}</> : '显示日语汉字和中文意思'}</button></div>; })}</div></div>;
}

function GrammarCard({ item, index, speech, role }: { item: GrammarItem; index: number; speech: Speech; role?: string }) {
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const correct = matchesGrammarAnswer(answer, item.answer, item.question);
  return <article className="n5-grammar-card"><header><span>{String(index + 1).padStart(2, '0')}</span><h3>{item.title}</h3></header><p>{item.explanation}</p><div className="n5-example"><small>课文原句{role && ` · 说话者：${role}`}</small><p><Japanese text={item.example} /></p><Listen speech={speech} value={item.example} id={`grammar-${index}`} /></div><label htmlFor={`grammar-${index}`}>补全这一句</label><p className="n5-question"><Japanese text={item.question} /></p><div className="n5-answer"><input id={`grammar-${index}`} value={answer} onChange={event => { setAnswer(event.target.value); setChecked(false); }} onKeyDown={event => { if (event.key === 'Enter') setChecked(true); }} placeholder="输入缺少的部分" autoComplete="off" /><button type="button" onClick={() => setChecked(true)}>核对</button></div>{checked && <p className={'n5-feedback ' + (correct ? 'correct' : '')} role="status">{correct ? '与课文原句一致。' : <>参考答案：<Japanese text={item.answer} /></>}</p>}<details className="n5-details"><summary>查看接续说明</summary><p>{item.connection}</p></details></article>;
}

function Grammar({ section, speech, lesson }: { section: N5Section; speech: Speech; lesson: N5Lesson }) {
  const ahead = section.blocks.find(block => block.text.startsWith('文法点：'))?.text;
  return <div><p className="n5-lead">按课文原句还原练习：先确认说话者，再输入缺少的部分。多空题按顺序填写，用顿号、逗号或空格分隔。这里核对是否还原原句；其他说法是否自然要结合语境判断。</p><div className="n5-grammar-list">{grammar(section).map((item, index) => <GrammarCard item={item} index={index} speech={speech} role={dialogue(lesson).turns.find(turn => !turn.stage && turn.text.includes(item.example))?.role} key={index} />)}</div>{ahead && <details className="n5-details"><summary>补充表达与复习建议</summary><p>{ahead}</p></details>}</div>;
}

function Fixed({ section, speech }: { section: N5Section; speech: Speech }) {
  const value = fixedPhrase(section);
  return <div><p className="n5-lead">把这一整句当作一个口语块，先听懂、模仿，再想清楚对谁能说。</p><div className="n5-fixed"><span>今天能直接套用</span><p><Japanese text={value.phrase} /></p><Listen speech={speech} value={value.phrase} id="fixed" label="听整句" /><strong>{value.meaning}</strong></div><div className="n5-fixed-grid">{value.details.map(line => { const i = line.indexOf('：'); return <div key={line}><strong>{line.slice(0, i)}</strong><p>{line.slice(i + 1)}</p></div>; })}</div></div>;
}

function Recorder() {
  const mounted = useRef(false);
  const starting = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const url = useRef<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [playback, setPlayback] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(track => track.stop()); if (url.current) URL.revokeObjectURL(url.current); }; }, []);
  const start = async () => {
    if (starting.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setMessage('当前浏览器不支持录音。仍可听一句、开口跟读。'); return; }
    try {
      starting.current = true;
      setMessage('');
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream.current = acquired;
      const chunks: BlobPart[] = [];
      const next = new MediaRecorder(acquired);
      recorder.current = next;
      next.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      next.onstop = () => { acquired.getTracks().forEach(track => track.stop()); if (!mounted.current) return; if (url.current) URL.revokeObjectURL(url.current); url.current = URL.createObjectURL(new Blob(chunks, { type: next.mimeType || 'audio/webm' })); setPlayback(url.current); acquired.getTracks().forEach(track => track.stop()); stream.current = null; setRecording(false); };
      next.start(); setRecording(true);
    } catch { if (mounted.current) setMessage('未获得麦克风权限。可以继续听句子并开口跟读。'); } finally { starting.current = false; }
  };
  return <div className="n5-recorder"><button type="button" onClick={recording ? () => recorder.current?.stop() : start}>{recording ? <Square size={16} /> : <Mic size={16} />}{recording ? '停止录音' : '录下自己的跟读'}</button>{playback && <audio controls src={playback} aria-label="回听自己的跟读" />}{message && <p role="status">{message}</p>}<small>录音只在浏览器内回听，不上传；切换句子、版本、学习环节或离开页面后清除。</small></div>;
}

function Shadow({ section, speech }: { section: N5Section; speech: Speech }) {
  const data = shadow(section);
  const [version, setVersion] = useState(0);
  const [line, setLine] = useState(0);
  const allTurns = data.versions[version]?.turns ?? [];
  const turns = allTurns.filter(turn => !turn.stage);
  const current = turns[line];
  return <div><p className="n5-lead">先听一句，稍慢半拍开口跟上；再录下自己回听。系统朗读是练习辅助，不是真人示范音频。</p><div className="n5-context"><strong>本课唯一跟读场景</strong><p>{data.introduction}</p></div><div className="n5-tabs" role="tablist" aria-label="语体版本">{data.versions.map((entry, index) => <button role="tab" aria-selected={version === index} key={entry.label} type="button" onClick={() => { speech.stopSpeech(); setVersion(index); setLine(0); }}>{entry.label}版</button>)}</div><div className="n5-shadow"><span>第 {line + 1} / {turns.length} 句 · {current?.role}</span><p>{current && <Japanese text={current.text} />}</p><div className="n5-shadow-actions">{current && <Listen speech={speech} value={current.text} id={`shadow-${version}-${line}`} label="先听这一句" />}<button type="button" onClick={() => speech.play(turns.map(turn => speechText(turn.text)), `shadow-all-${version}`)}><Play size={16} />{speech.speechKey?.startsWith('shadow-all') ? '停止整段' : '连听整段'}</button></div><Recorder key={`${version}-${line}`} /><div className="n5-shadow-pager"><button type="button" disabled={line === 0} onClick={() => { speech.stopSpeech(); setLine(line - 1); }}><ArrowLeft size={16} />上一句</button><button type="button" disabled={line === turns.length - 1} onClick={() => { speech.stopSpeech(); setLine(line + 1); }}>跟下一句<ArrowRight size={16} /></button></div></div><details className="n5-details"><summary>展开本版本完整跟读稿</summary>{allTurns.map((turn, index) => turn.stage ? <p className="n5-stage" key={index}>{turn.text}</p> : <p key={index}><strong>{turn.role}</strong> <Japanese text={turn.text} /></p>)}</details><details className="n5-details"><summary>查看语体差异、跟读步骤与要点</summary><Blocks blocks={data.details} /></details></div>;
}

export function N5LessonPage({ lesson, lessons }: { lesson: N5Lesson; lessons: Link[] }) {
  const [active, setActive] = useState(1);
  const speech = useJapaneseSpeech();
  const { completed, setCompleted, storageMessage } = useLearningProgress();
  const section = lesson.sections[active];
  const key = `${lesson.id}:${section.id}`;
  const done = completed.includes(key);
  const doneCount = lesson.sections.slice(0, 6).filter(item => completed.includes(`${lesson.id}:${item.id}`)).length;
  const previous = lessons[lesson.number - 2], next = lessons[lesson.number];
  const jump = (index: number) => { speech.stopSpeech(); setActive(index); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const scene = lesson.introduction[0]?.text.split('\n').find(line => line.startsWith('场景：'))?.replace(/^场景：/, '') ?? '';
  return <main className="n5-lesson-page"><header className="n5-lesson-header"><a href={sitePath('/')} className="brand"><span className="brand-mark">日</span><span><strong>日本生活日语</strong><small>N5 · LESSON {String(lesson.number).padStart(2, '0')}</small></span></a><a href={sitePath('/courses/n5')}><ArrowLeft size={16} /> 课程目录</a></header><div className="n5-practice-layout"><aside className="n5-practice-nav"><div className="n5-nav-top"><span>第 {lesson.number} / 20 课</span><strong>{lesson.title}</strong><p>{doneCount} / 6 个主要环节已完成</p><div className="n5-progress-track"><span style={{ width: `${doneCount / 6 * 100}%` }} /></div></div><nav aria-label="本课学习步骤">{lesson.sections.map((item, index) => <button key={item.id} type="button" aria-current={active === index ? 'step' : undefined} onClick={() => jump(index)}><span>{index < 8 ? String(index + 1).padStart(2, '0') : index < 10 ? '附' : '测'}</span>{names[index]}{index < 6 && (completed.includes(`${lesson.id}:${item.id}`) ? <CheckCircle2 size={16} /> : <Circle size={13} />)}</button>)}</nav></aside><article className="n5-practice-main"><div className="n5-practice-heading"><span>N5 · 第 {lesson.number} 课</span><h1>{lesson.title}</h1><p>{scene}</p></div><section className="n5-practice-panel" aria-labelledby="n5-active-title"><div className="n5-panel-heading"><span>{active < 8 ? `学习环节 ${active + 1}` : active < 10 ? `附录 ${active - 7}` : `自测 ${active - 9}`}</span><h2 id="n5-active-title">{section.title}</h2></div>{active === 0 ? <Goals section={section} /> : active === 1 ? <Dialogue lesson={lesson} speech={speech} /> : active === 2 || active === 10 ? <Vocabulary section={lesson.sections[2]} speech={speech} /> : active === 3 || active === 11 ? <Grammar section={lesson.sections[3]} speech={speech} lesson={lesson} key={section.id} /> : active === 4 ? <Fixed section={section} speech={speech} /> : active === 5 ? <Shadow section={section} speech={speech} /> : <Blocks blocks={section.blocks} />}{speech.speechMessage && <p className="n5-storage-note" role="status">{speech.speechMessage}</p>}{active < 6 && <div className="n5-finish"><button type="button" aria-pressed={done} onClick={() => setCompleted(current => done ? current.filter(item => item !== key) : [...current, key])}>{done ? <><CheckCircle2 size={17} />已完成本环节</> : <><Circle size={17} />完成本环节</>}</button><span>进度保存在当前设备</span></div>}<div className="n5-step-footer"><button type="button" disabled={active === 0} onClick={() => jump(active - 1)}><ArrowLeft size={16} />上一步</button><button type="button" disabled={active === lesson.sections.length - 1} onClick={() => jump(active + 1)}>下一步<ArrowRight size={16} /></button></div></section>{storageMessage && <p className="n5-storage-note" role="status">{storageMessage}</p>}<nav className="n5-lesson-footer" aria-label="课次切换">{previous ? <a href={sitePath('/courses/n5/' + previous.slug)}><ArrowLeft size={17} /><span><small>上一课</small>{previous.title}</span></a> : <a href={sitePath('/courses/n5')}><ArrowLeft size={17} /><span><small>返回</small>课程目录</span></a>}{next ? <a href={sitePath('/courses/n5/' + next.slug)}><span><small>下一课</small>{next.title}</span><ArrowRight size={17} /></a> : <a href={sitePath('/courses/n5')}><span><small>已到第 20 课</small>返回课程目录</span><ArrowRight size={17} /></a>}</nav></article></div></main>;
}
