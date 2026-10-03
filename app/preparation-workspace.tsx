'use client';
/* oxlint-disable next/no-html-link-for-pages */
import { sitePath } from '@/lib/site-path';
import { useState } from 'react';
import {
  Volume2,
  Square,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useJapaneseSpeech } from '@/hooks/use-japanese-speech';
import { useLearningProgress } from '@/hooks/use-learning-progress';
import type { Preparation } from '@/src/modules/catalog/domain/preparation-types';
export function PreparationWorkspace({ data }: { data: Preparation }) {
  const [index, setIndex] = useState(0);
  const unit = data.units[index];
  const { play, stopSpeech, speechKey, speechMessage } = useJapaneseSpeech();
  const { completed, setCompleted, storageMessage } = useLearningProgress();
  const key = data.id + ':kana-' + unit.id;
  const done = completed.includes(key);
  const count = data.units.filter((u) =>
    completed.includes(data.id + ':kana-' + u.id),
  ).length;
  const go = (n: number) => {
    stopSpeech();
    setIndex(n);
  };
  return (
    <main className="kana-page">
      <header className="kana-top">
        <a href={sitePath('/')}>
          <ArrowLeft size={16} />
          全部课程
        </a>
        <span>PRE · 准备篇</span>
        <a href={sitePath('/courses/n5')}>
          进入 N5
          <ArrowRight size={16} />
        </a>
      </header>
      <div className="kana-heading">
        <span>先认字形，再掌握声音</span>
        <h1>{data.title}</h1>
        <p>{data.subtitle}</p>
        <p>
          {count} / {data.units.length} 单元已完成
        </p>
      </div>
      <div className="kana-layout">
        <label className="kana-mobile-unit">
          翻到学习单元
          <select
            value={index}
            onChange={(event) => go(Number(event.target.value))}
          >
            {data.units.map((u, i) => (
              <option key={u.id} value={i}>
                {String(i + 1).padStart(2, '0')} · {u.title}
                {completed.includes(data.id + ':kana-' + u.id) ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </label>
        <nav className="kana-nav" aria-label="假名学习单元">
          {data.units.map((u, i) => (
            <button
              key={u.id}
              type="button"
              aria-current={index === i ? 'step' : undefined}
              onClick={() => go(i)}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {u.title}
              {completed.includes(data.id + ':kana-' + u.id) && (
                <CheckCircle2 size={16} />
              )}
            </button>
          ))}
        </nav>
        <section className="kana-unit" aria-labelledby="kana-unit-title">
          <h2 id="kana-unit-title">{unit.title}</h2>
          <p>{unit.intro}</p>
          <ul className="kana-notes">
            {unit.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <div className="speech-controls">
            <span>点击假名听读音；可在顶部「朗读设置」更换声音。</span>
            {speechKey && <button onClick={stopSpeech}>停止播放</button>}
          </div>
          {(speechMessage || storageMessage) && (
            <output className="speech-notice">
              {speechMessage || storageMessage}
            </output>
          )}
          <div className={'kana-grid kana-columns-' + unit.columns}>
            {unit.rows.flatMap((row, r) =>
              row.map((cell, c) => {
                const id = unit.id + '-' + r + '-' + c;
                return cell.text ? (
                  <button
                    type="button"
                    key={id}
                    className={
                      speechKey === id ? 'kana-cell playing' : 'kana-cell'
                    }
                    aria-label={'发音：' + cell.text}
                    aria-pressed={speechKey === id}
                    onClick={() => play([cell.speech], id)}
                  >
                    <strong lang="ja">{cell.text}</strong>
                    <small>{cell.hint}</small>
                    {cell.beats && (
                      <span className="kana-beats">
                        {cell.beats.map((beat, b) => (
                          <span key={b}>
                            <i aria-hidden="true">●</i>
                            {beat}
                          </span>
                        ))}
                      </span>
                    )}
                    <span className="kana-audio">
                      {speechKey === id ? (
                        <Square size={14} />
                      ) : (
                        <Volume2 size={14} />
                      )}{' '}
                      {speechKey === id ? '停止' : '发音'}
                    </span>
                  </button>
                ) : (
                  <div className="kana-empty" aria-hidden="true" key={id} />
                );
              }),
            )}
          </div>
          <p className="kana-tip">
            点击假名听系统朗读，再看字形练习；系统语音仅供辅助，不是真人发音示范。
            {unit.rows.some((row) => row.some((cell) => cell.beats)) &&
              '圆点表示拍子，每一点保持同样的时长。'}
          </p>
          <footer className="kana-footer">
            <button
              type="button"
              aria-pressed={done}
              onClick={() =>
                setCompleted((current) =>
                  done ? current.filter((k) => k !== key) : [...current, key],
                )
              }
            >
              {done ? '✓ 已完成本单元' : '标记本单元完成'}
            </button>
            {index < data.units.length - 1 ? (
              <button type="button" onClick={() => go(index + 1)}>
                下一单元 <ArrowRight size={16} />
              </button>
            ) : (
              <a href={sitePath('/courses/n5')}>
                开始 N5 课程 <ArrowRight size={16} />
              </a>
            )}
          </footer>
        </section>
      </div>
    </main>
  );
}
