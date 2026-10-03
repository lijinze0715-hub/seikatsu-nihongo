/* oxlint-disable next/no-html-link-for-pages */
import { sitePath } from '@/lib/site-path';
import {
  ArrowRight,
  BookOpenText,
  Coffee,
  Headphones,
  Leaf,
  MessageCircleMore,
  Sprout,
} from 'lucide-react';
import { n5Course } from '@/src/bootstrap/catalog';

const moments = [
  {
    number: 1,
    icon: MessageCircleMore,
    label: '初次见面',
    copy: '从介绍自己开始，让对话慢慢发生。',
  },
  {
    number: 9,
    icon: Coffee,
    label: '一餐一饭',
    copy: '点一份喜欢的餐，在便利店说声谢谢。',
  },
  {
    number: 20,
    icon: Leaf,
    label: '走进日常',
    copy: '和同学聊聊天，把学过的话用在生活里。',
  },
];

export default function Home() {
  return (
    <main className="home-page">
      <header className="home-header">
        <a href={sitePath('/')} className="brand">
          <span className="brand-mark">日</span>
          <span>
            <strong>日本生活日语</strong>
            <small>暮らしの日本語</small>
          </span>
        </a>
        <nav aria-label="主导航">
          <a href={sitePath('/lessons/prelude')}>假名入门</a>
          <a href={sitePath('/courses/n5')}>
            生活课程 <ArrowRight size={15} />
          </a>
        </nav>
      </header>
      <section className="home-intro">
        <div className="intro-copy">
          <span className="intro-kicker">
            <Sprout size={16} /> 一本陪你开始的生活日语手册
          </span>
          <h1>
            把日语，
            <br />
            慢慢写进<span>生活里。</span>
          </h1>
          <p>
            从第一声「こんにちは」，到在街角点一杯咖啡。
            <br className="desktop-break" />
            认读假名，听懂对话，在一件件小事里练习表达。
          </p>
          <div className="intro-actions">
            <a className="primary-link" href={sitePath('/lessons/prelude')}>
              从假名开始 <ArrowRight size={17} />
            </a>
            <a className="text-link" href={sitePath('/courses/n5')}>
              翻开 N5 生活课程 <ArrowRight size={16} />
            </a>
          </div>
          <div className="intro-footnote">
            <span>8 个准备单元</span>
            <i aria-hidden="true" />
            <span>{n5Course.lessons.length} 课生活场景</span>
            <i aria-hidden="true" />
            <span>按自己的节奏学习</span>
          </div>
        </div>
        <div
          className="journal-scene"
          aria-label="生活日语手册：こんにちは，你好。每天学一点，在生活里用一点。"
        >
          <span className="journal-label">暮らしのノート / 01</span>
          <div className="journal-book">
            <div className="journal-binding" aria-hidden="true" />
            <div className="journal-page">
              <span className="journal-date">
                今日のひとこと · 今天的一句话
              </span>
              <span className="journal-word" lang="ja">
                こんにちは<span>。</span>
              </span>
              <span className="journal-translation">你好，很高兴见到你。</span>
              <div className="journal-rule" />
              <span className="journal-note">
                新的语言，也是一种新的日常。
                <br />
                每天学一点，在生活里用一点。
              </span>
              <div className="journal-bottom">
                <span>日本生活日语</span>
                <Leaf size={26} strokeWidth={1.2} />
              </div>
            </div>
          </div>
          <span className="journal-stamp" aria-hidden="true">
            日々
            <br />
            日本語
          </span>
          <div className="journal-memo">
            <span lang="ja">少しずつ、一歩ずつ。</span>
            <small>一点一点，一步一步。</small>
          </div>
        </div>
      </section>
      <section className="path-section" aria-labelledby="path-title">
        <div className="path-heading">
          <div>
            <span>学习手册 · CONTENTS</span>
            <h2 id="path-title">从这里，翻开第一页。</h2>
          </div>
          <p>
            零基础先认字、练发音。
            <br />
            有一点基础，就从生活场景开始。
          </p>
        </div>
        <div className="stage-list">
          <a
            className="stage-card preparation-card"
            href={sitePath('/lessons/prelude')}
          >
            <div className="stage-card-top">
              <span className="stage-code">准备篇</span>
              <span className="stage-meta">8 个单元</span>
            </div>
            <BookOpenText size={32} strokeWidth={1.3} />
            <h3>先认识日语的声音</h3>
            <p>
              平假名、片假名与基础发音。
              <br />
              从一个字、一拍声音开始。
            </p>
            <div className="stage-card-bottom">
              <span>适合零基础的你</span>
              <ArrowRight size={20} />
            </div>
          </a>
          <a className="stage-card life-card" href={sitePath('/courses/n5')}>
            <div className="stage-card-top">
              <span className="stage-code">N5 生活篇</span>
              <span className="stage-meta">{n5Course.lessons.length} 课</span>
            </div>
            <Sprout size={32} strokeWidth={1.3} />
            <h3>让每句话有一个场景</h3>
            <p>
              从自我介绍，到安家与学校生活。
              <br />
              在完整对话中，练习听、读与说。
            </p>
            <div className="stage-card-bottom">
              <span>适合开始生活对话的你</span>
              <ArrowRight size={20} />
            </div>
          </a>
        </div>
      </section>
      <section className="moments-section" aria-labelledby="moments-title">
        <div className="path-heading">
          <div>
            <span>日语，也在这些小事里</span>
            <h2 id="moments-title">学过的话，总有用上的一天。</h2>
          </div>
          <a className="text-link" href={sitePath('/courses/n5')}>
            看看全部课程 <ArrowRight size={16} />
          </a>
        </div>
        <div className="moments-grid">
          {moments.map(({ number, icon: Icon, label, copy }) => (
            <a href={sitePath(`/courses/n5/lesson-${number}`)} key={number}>
              <div>
                <Icon size={23} strokeWidth={1.4} />
                <span>第 {String(number).padStart(2, '0')} 课</span>
              </div>
              <h3>{label}</h3>
              <p>{copy}</p>
              <ArrowRight className="moment-arrow" size={18} />
            </a>
          ))}
        </div>
      </section>
      <section className="home-learning-note">
        <Headphones size={21} strokeWidth={1.5} />
        <p>
          先听，再试着开口。课程提供系统朗读、词汇卡与句型练习，陪你反复熟悉每一句。
        </p>
        <span>少しずつ、一歩ずつ。</span>
      </section>
    </main>
  );
}
